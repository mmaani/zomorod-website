// api/batches.js
import { getSql } from "./_lib/db.js";
import { requireUser } from "./_lib/requireAuth.js";

export const config = { runtime: "nodejs" };

function toDateOrNull(s) {
  const v = String(s || "").trim();
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null; // YYYY-MM-DD
  return v;
}

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

/**
 * GET /api/batches?productId=1&includeVoided=1
 * (fixes your 405 error)
 */
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
        warehouse_id,
        lot_number,
        purchase_date,
        expiry_date,
        purchase_price_jod,
        qty_received,
        supplier_name,
        supplier_invoice_no,
        is_void,
        voided_at,
        created_at
      FROM batches
      WHERE product_id = ${productId}
        AND (${includeVoided} OR COALESCE(is_void,false) = false)
      ORDER BY purchase_date DESC, id DESC
    `;

    const data = rows.map((r) => ({
      id: r.id,
      productId: r.product_id,
      warehouseId: r.warehouse_id,
      lotNumber: r.lot_number,
      purchaseDate: r.purchase_date,
      expiryDate: r.expiry_date,
      purchasePriceJod: r.purchase_price_jod,
      qtyReceived: n(r.qty_received),
      supplierName: r.supplier_name || null,
      supplierInvoiceNo: r.supplier_invoice_no || null,
      isVoid: !!r.is_void,
      voidedAt: r.voided_at || null,
      createdAt: r.created_at,
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
    const purchaseDate = toDateOrNull(body?.purchaseDate);
    const expiryDate = toDateOrNull(body?.expiryDate);
    const purchasePriceJod = Number(body?.purchasePriceJod);
    const qtyReceived = Number(body?.qtyReceived);
    const supplierName = String(body?.supplierName || "").trim() || null;
    const supplierInvoiceNo = String(body?.supplierInvoiceNo || "").trim() || null;

    // optional; schema defaults to 1 anyway
    const warehouseId = Number(body?.warehouseId || 1);

    if (!Number.isFinite(productId) || productId <= 0) {
      return Response.json({ ok: false, error: "productId is required" }, { status: 400 });
    }
    if (!lotNumber) {
      return Response.json({ ok: false, error: "lotNumber is required" }, { status: 400 });
    }
    if (!purchaseDate) {
      return Response.json({ ok: false, error: "purchaseDate must be YYYY-MM-DD" }, { status: 400 });
    }
    if (!Number.isFinite(qtyReceived) || qtyReceived <= 0) {
      return Response.json({ ok: false, error: "qtyReceived must be > 0" }, { status: 400 });
    }
    if (!Number.isFinite(purchasePriceJod) || purchasePriceJod <= 0) {
      return Response.json({ ok: false, error: "purchasePriceJod must be > 0" }, { status: 400 });
    }

    // Find existing (same product + warehouse + lot), ignore voided
    const existing = await sql`
      SELECT id, qty_received, purchase_price_jod
      FROM batches
      WHERE product_id = ${productId}
        AND warehouse_id = ${warehouseId}
        AND lot_number = ${lotNumber}
        AND COALESCE(is_void,false) = false
      LIMIT 1
    `;

    let batchId;

    if (existing.length) {
      const b = existing[0];
      const oldQty = n(b.qty_received);
      const oldPrice = Number(b.purchase_price_jod || 0);

      const newQty = oldQty + qtyReceived;
      const newAvg =
        newQty > 0
          ? ((oldPrice * oldQty) + (purchasePriceJod * qtyReceived)) / newQty
          : purchasePriceJod;

      const upd = await sql`
        UPDATE batches
        SET
          qty_received = ${newQty},
          purchase_price_jod = ${newAvg},
          purchase_date = ${purchaseDate},
          expiry_date = ${expiryDate},
          supplier_name = COALESCE(${supplierName}, supplier_name),
          supplier_invoice_no = COALESCE(${supplierInvoiceNo}, supplier_invoice_no)
        WHERE id = ${b.id}
        RETURNING id
      `;
      batchId = upd[0].id;
    } else {
      const ins = await sql`
        INSERT INTO batches (
          product_id, warehouse_id, lot_number, purchase_date, expiry_date,
          purchase_price_jod, qty_received, supplier_name, supplier_invoice_no
        )
        VALUES (
          ${productId}, ${warehouseId}, ${lotNumber}, ${purchaseDate}, ${expiryDate},
          ${purchasePriceJod}, ${qtyReceived}, ${supplierName}, ${supplierInvoiceNo}
        )
        RETURNING id
      `;
      batchId = ins[0].id;
    }

    // record inventory IN movement
    await sql`
      INSERT INTO inventory_movements (warehouse_id, product_id, batch_id, movement_type, qty, movement_date, note, created_by)
      VALUES (${warehouseId}, ${productId}, ${batchId}, 'IN', ${qtyReceived}, ${purchaseDate}, 'Receive batch', ${auth.userId || null})
    `;

    return Response.json({ ok: true, batchId }, { status: 201 });
  } catch (err) {
    console.error("POST /api/batches failed:", err);
    return Response.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

// Soft delete / void batch + reverse inventory
export async function DELETE(request) {
  try {
    const auth = await requireUser(request, { rolesAny: ["main"] });
    if (auth instanceof Response) return auth;

    const sql = getSql();

    const url = new URL(request.url);
    const id = Number(url.searchParams.get("id"));

    if (!Number.isFinite(id) || id <= 0) {
      return Response.json({ ok: false, error: "id is required" }, { status: 400 });
    }

    const rows = await sql`
      SELECT id, product_id, warehouse_id, qty_received, purchase_date
      FROM batches
      WHERE id = ${id} AND COALESCE(is_void,false) = false
      LIMIT 1
    `;
    if (!rows.length) {
      return Response.json({ ok: false, error: "Batch not found" }, { status: 404 });
    }

    const b = rows[0];
    const qty = n(b.qty_received);

    await sql`
      UPDATE batches
      SET is_void = true, voided_at = NOW()
      WHERE id = ${id}
    `;

    if (qty > 0) {
      await sql`
        INSERT INTO inventory_movements (warehouse_id, product_id, batch_id, movement_type, qty, movement_date, note, created_by)
        VALUES (${b.warehouse_id}, ${b.product_id}, ${id}, 'ADJ', ${-qty}, ${b.purchase_date}, 'Void batch (reverse)', ${auth.userId || null})
      `;
    }

    return Response.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("DELETE /api/batches failed:", err);
    return Response.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
export async function GET(request) {
  try {
    const auth = await requireUser(request, { rolesAny: ["main"] });
    if (auth instanceof Response) return auth;

    const sql = getSql();
    const url = new URL(request.url);
    const productId = Number(url.searchParams.get("productId"));

    if (!Number.isFinite(productId) || productId <= 0) {
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
        is_void,
        voided_at,
        created_at
      FROM batches
      WHERE product_id = ${productId}
      ORDER BY purchase_date DESC, id DESC
    `;

    return Response.json({ ok: true, batches: rows }, { status: 200 });
  } catch (err) {
    console.error("GET /api/batches failed:", err);
    return Response.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

