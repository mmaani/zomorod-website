import { getSql } from "../lib/db.js";
import { requireUser, canSeePurchasePrice } from "../lib/requireAuth.js";

function toDateOrNull(s) {
  const v = String(s || "").trim();
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return v;
}

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function GET(request) {
  try {
    const auth = await requireUser(request);
    if (auth instanceof Response) return auth;

    const sql = getSql();
    const url = new URL(request.url);
    const productId = n(url.searchParams.get("productId"));

    if (!productId) {
      return Response.json({ ok: false, error: "productId is required" }, { status: 400 });
    }

    const rows = await sql`
      SELECT
        b.id,
        b.product_id,
        b.lot_number,
        b.purchase_date,
        b.expiry_date,
        b.qty_received,
        b.purchase_price_jod,
        b.supplier_name,
        b.supplier_invoice_no,
        b.supplier_id,
        s.name AS supplier_display_name,
        b.created_at
      FROM batches b
      LEFT JOIN suppliers s ON s.id = b.supplier_id
      WHERE b.product_id = ${productId}
        AND COALESCE(b.is_void, false) = false
      ORDER BY b.purchase_date DESC, b.id DESC
    `;

    const showPrice = canSeePurchasePrice(auth);

    const batches = rows.map((r) => ({
      id: r.id,
      productId: r.product_id,
      lotNumber: r.lot_number,
      purchaseDate: r.purchase_date,
      expiryDate: r.expiry_date,
      qtyReceived: n(r.qty_received),
      purchasePriceJod: showPrice ? n(r.purchase_price_jod) : null,
      supplierId: r.supplier_id || null,
      supplierName: r.supplier_display_name || r.supplier_name || null,
      supplierInvoiceNo: r.supplier_invoice_no || null,
      createdAt: r.created_at
    }));

    return Response.json({ ok: true, batches }, { status: 200 });
  } catch (err) {
    console.error("GET /api/batches failed:", err);
    return Response.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireUser(request, { rolesAny: ["main"] });
    if (auth instanceof Response) return auth;

    const body = await readJson(request);
    if (!body) {
      return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const sql = getSql();

    const productId = n(body?.productId);
    const lotNumber = String(body?.lotNumber || "").trim();
    const purchaseDate = toDateOrNull(body?.purchaseDate);
    const expiryDate = toDateOrNull(body?.expiryDate);

    const purchasePriceJod = n(body?.purchasePriceJod);
    const qtyReceived = n(body?.qtyReceived);

    const supplierId = n(body?.supplierId) || null;
    const supplierName = String(body?.supplierName || "").trim() || null;
    const supplierInvoiceNo = String(body?.supplierInvoiceNo || "").trim() || null;

    if (!productId) return Response.json({ ok: false, error: "productId is required" }, { status: 400 });
    if (!lotNumber) return Response.json({ ok: false, error: "lotNumber is required" }, { status: 400 });
    if (!purchaseDate) return Response.json({ ok: false, error: "purchaseDate must be YYYY-MM-DD" }, { status: 400 });
    if (qtyReceived <= 0) return Response.json({ ok: false, error: "qtyReceived must be > 0" }, { status: 400 });
    if (purchasePriceJod <= 0) return Response.json({ ok: false, error: "purchasePriceJod must be > 0" }, { status: 400 });

    const warehouseId = 1;

    const result = await sql.begin(async (tx) => {
      // If same product+lot exists => add qty and recalc weighted average cost
      const existing = await tx`
        SELECT id, qty_received, purchase_price_jod
        FROM batches
        WHERE product_id = ${productId}
          AND lot_number = ${lotNumber}
          AND COALESCE(is_void, false) = false
        LIMIT 1
      `;

      let batchId;

      if (existing.length) {
        const b = existing[0];
        const oldQty = n(b.qty_received);
        const oldPrice = n(b.purchase_price_jod);

        const newQty = oldQty + qtyReceived;
        const newAvg =
          newQty > 0
            ? ((oldPrice * oldQty) + (purchasePriceJod * qtyReceived)) / newQty
            : purchasePriceJod;

        const upd = await tx`
          UPDATE batches
          SET
            qty_received = ${newQty},
            purchase_price_jod = ${newAvg},
            purchase_date = ${purchaseDate},
            expiry_date = ${expiryDate},
            supplier_name = COALESCE(${supplierName}, supplier_name),
            supplier_invoice_no = COALESCE(${supplierInvoiceNo}, supplier_invoice_no),
            supplier_id = COALESCE(${supplierId}, supplier_id)
          WHERE id = ${b.id}
          RETURNING id
        `;

        batchId = upd[0].id;
      } else {
        const ins = await tx`
          INSERT INTO batches (
            product_id, warehouse_id, lot_number, purchase_date, expiry_date,
            purchase_price_jod, qty_received, supplier_name, supplier_invoice_no, supplier_id
          )
          VALUES (
            ${productId}, ${warehouseId}, ${lotNumber}, ${purchaseDate}, ${expiryDate},
            ${purchasePriceJod}, ${qtyReceived}, ${supplierName}, ${supplierInvoiceNo}, ${supplierId}
          )
          RETURNING id
        `;

        batchId = ins[0].id;
      }

      await tx`
        INSERT INTO inventory_movements (
          warehouse_id, product_id, movement_type, qty, batch_id, movement_date, note
        )
        VALUES (
          ${warehouseId}, ${productId}, 'IN', ${qtyReceived}, ${batchId}, ${purchaseDate}, 'Receive batch'
        )
      `;

      return { batchId };
    });

    return Response.json({ ok: true, batchId: result.batchId }, { status: 201 });
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
    const id = n(url.searchParams.get("id"));

    if (!id) return Response.json({ ok: false, error: "id is required" }, { status: 400 });

    await sql.begin(async (tx) => {
      const rows = await tx`
        SELECT id, product_id, warehouse_id, qty_received, purchase_date
        FROM batches
        WHERE id = ${id} AND COALESCE(is_void, false) = false
        LIMIT 1
      `;
      if (!rows.length) throw new Error("BATCH_NOT_FOUND");

      const b = rows[0];
      const qty = n(b.qty_received);

      await tx`UPDATE batches SET is_void = true, voided_at = NOW() WHERE id = ${id}`;

      if (qty > 0) {
        await tx`
          INSERT INTO inventory_movements (
            warehouse_id, product_id, movement_type, qty, batch_id, movement_date, note
          )
          VALUES (
            ${b.warehouse_id || 1}, ${b.product_id}, 'ADJ', ${-qty}, ${id}, ${b.purchase_date}, 'Void batch (reverse)'
          )
        `;
      }
    });

    return Response.json({ ok: true }, { status: 200 });
  } catch (err) {
    if (String(err?.message) === "BATCH_NOT_FOUND") {
      return Response.json({ ok: false, error: "Batch not found" }, { status: 404 });
    }
    console.error("DELETE /api/batches failed:", err);
    return Response.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
