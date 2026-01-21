import { getSql } from "./_lib/db.js";
import { requireUser, canSeePurchasePrice } from "./_lib/requireAuth.js";

export const config = { runtime: "nodejs" };

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

async function recomputeAvgPurchase(sql, productId) {
  const r = await sql`
    SELECT
      CASE
        WHEN SUM(qty_received) > 0
        THEN (SUM(qty_received * purchase_price_jod) / SUM(qty_received))
        ELSE NULL
      END AS avg_purchase_price_jod
    FROM batches
    WHERE product_id = ${productId} AND voided_at IS NULL
  `;
  const avg = r?.[0]?.avg_purchase_price_jod ?? null;
  await sql`
    UPDATE products
    SET avg_purchase_price_jod = ${avg}
    WHERE id = ${productId}
  `;
}

async function getOnHand(sql, productId) {
  const r = await sql`
    SELECT COALESCE(SUM(
      CASE
        WHEN movement_type IN ('IN','RETURN') THEN qty
        WHEN movement_type = 'ADJ' THEN qty
        WHEN movement_type = 'OUT' THEN -qty
        ELSE 0
      END
    ),0) AS on_hand_qty
    FROM inventory_movements
    WHERE product_id = ${productId}
  `;
  return n(r?.[0]?.on_hand_qty);
}

export async function GET(request) {
  try {
    const auth = await requireUser(request);
    if (auth instanceof Response) return auth;

    const sql = getSql();
    const url = new URL(request.url);
    const productId = Number(url.searchParams.get("productId"));
    const includeVoided = url.searchParams.get("includeVoided") === "1";

    if (!productId) {
      return Response.json({ ok: false, error: "productId is required" }, { status: 400 });
    }

    const rows = await sql`
      SELECT
        id,
        product_id,
        lot_number,
        purchase_date,
        expiry_date,
        purchase_price_jod,
        qty_received,
        supplier_name,
        supplier_invoice_no,
        voided_at
      FROM batches
      WHERE product_id = ${productId}
        AND (${includeVoided} OR voided_at IS NULL)
      ORDER BY purchase_date DESC, id DESC
    `;

    const showPurchase = canSeePurchasePrice(auth.roles);

    const data = rows.map((b) => ({
      id: b.id,
      productId: b.product_id,
      lotNumber: b.lot_number,
      purchaseDate: b.purchase_date,
      expiryDate: b.expiry_date,
      qtyReceived: n(b.qty_received),
      supplierName: b.supplier_name || "",
      supplierInvoiceNo: b.supplier_invoice_no || "",
      voidedAt: b.voided_at || null,
      purchasePriceJod: showPurchase ? (b.purchase_price_jod ?? null) : null,
    }));

    return Response.json({ ok: true, batches: data }, { status: 200 });
  } catch (err) {
    console.error("GET /api/batches failed:", err);
    return Response.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireUser(request, { rolesAny: ["main"] });
    if (auth instanceof Response) return auth;

    const sql = getSql();

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const productId = Number(body?.productId);
    const lotNumber = String(body?.lotNumber || "").trim();
    const purchaseDate = String(body?.purchaseDate || "").trim();
    const expiryDate = String(body?.expiryDate || "").trim() || null;
    const purchasePriceJod = Number(body?.purchasePriceJod || 0);
    const qtyReceived = Number(body?.qtyReceived || 0);
    const supplierName = String(body?.supplierName || "").trim() || null;
    const supplierInvoiceNo = String(body?.supplierInvoiceNo || "").trim() || null;

    if (!productId || !lotNumber || !purchaseDate || qtyReceived <= 0) {
      return Response.json(
        { ok: false, error: "productId, lotNumber, purchaseDate, qtyReceived are required" },
        { status: 400 }
      );
    }
    if (!Number.isFinite(purchasePriceJod) || purchasePriceJod <= 0) {
      return Response.json(
        { ok: false, error: "purchasePriceJod must be > 0" },
        { status: 400 }
      );
    }

    // If same product+lot exists (not voided), ADD to it and recompute lot average price.
    const existing = await sql`
      SELECT id, qty_received, purchase_price_jod, purchase_date, expiry_date
      FROM batches
      WHERE product_id = ${productId}
        AND lot_number = ${lotNumber}
        AND voided_at IS NULL
      ORDER BY id DESC
      LIMIT 1
    `;

    let batchId;
    let mode;

    if (existing.length) {
      const b = existing[0];
      const oldQty = n(b.qty_received);
      const oldPrice = Number(b.purchase_price_jod || 0);

      const newQty = oldQty + qtyReceived;
      const newAvgPrice =
        newQty > 0 ? ((oldQty * oldPrice + qtyReceived * purchasePriceJod) / newQty) : purchasePriceJod;

      await sql`
        UPDATE batches
        SET
          qty_received = ${newQty},
          purchase_price_jod = ${newAvgPrice},
          -- keep earliest purchase date if you want; change to ${purchaseDate} if you want "latest"
          purchase_date = LEAST(purchase_date, ${purchaseDate}::date),
          expiry_date = COALESCE(${expiryDate}::date, expiry_date),
          supplier_name = COALESCE(${supplierName}, supplier_name),
          supplier_invoice_no = COALESCE(${supplierInvoiceNo}, supplier_invoice_no)
        WHERE id = ${b.id}
      `;

      batchId = b.id;
      mode = "updated";
    } else {
      const ins = await sql`
        INSERT INTO batches
          (product_id, lot_number, purchase_date, expiry_date, purchase_price_jod, qty_received, supplier_name, supplier_invoice_no)
        VALUES
          (${productId}, ${lotNumber}, ${purchaseDate}::date, ${expiryDate}::date, ${purchasePriceJod}, ${qtyReceived}, ${supplierName}, ${supplierInvoiceNo})
        RETURNING id
      `;
      batchId = ins[0].id;
      mode = "created";
    }

    // Always add inventory movement for received qty
    await sql`
      INSERT INTO inventory_movements (product_id, movement_type, qty)
      VALUES (${productId}, 'IN', ${qtyReceived})
    `;

    // Update product avg purchase
    await recomputeAvgPurchase(sql, productId);

    return Response.json({ ok: true, batchId, mode }, { status: 201 });
  } catch (err) {
    console.error("POST /api/batches failed:", err);
    return Response.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const auth = await requireUser(request, { rolesAny: ["main"] });
    if (auth instanceof Response) return auth;

    const sql = getSql();
    const url = new URL(request.url);
    const id = Number(url.searchParams.get("id"));

    if (!id) return Response.json({ ok: false, error: "id is required" }, { status: 400 });

    const rows = await sql`
      SELECT id, product_id, qty_received, voided_at
      FROM batches
      WHERE id = ${id}
      LIMIT 1
    `;
    if (!rows.length) return Response.json({ ok: false, error: "Batch not found" }, { status: 404 });

    const b = rows[0];
    if (b.voided_at) return Response.json({ ok: false, error: "Batch already voided" }, { status: 400 });

    const productId = b.product_id;
    const qty = n(b.qty_received);

    // Safety: don't allow voiding if it would make stock negative
    const onHand = await getOnHand(sql, productId);
    if (onHand < qty) {
      return Response.json(
        { ok: false, error: `Cannot void batch: on-hand (${onHand}) < batch qty (${qty}). Use an adjustment instead.` },
        { status: 400 }
      );
    }

    // Reverse inventory by adding an ADJ negative movement
    await sql`
      INSERT INTO inventory_movements (product_id, movement_type, qty)
      VALUES (${productId}, 'ADJ', ${-qty})
    `;

    await sql`UPDATE batches SET voided_at = NOW() WHERE id = ${id}`;

    await recomputeAvgPurchase(sql, productId);

    return Response.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("DELETE /api/batches failed:", err);
    return Response.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
