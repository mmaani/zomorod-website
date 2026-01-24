// api/batches.js
import { getSql } from "./_lib/db.js";
import { requireUser } from "./_lib/requireAuth.js";

export const config = { runtime: "nodejs" };

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

/**
 * GET /api/batches?productId=123
 * returns all non-voided batches for product
 */
export async function GET(request) {
  try {
    const auth = await requireUser(request);
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
        quantity_received,
        supplier_name,
        supplier_invoice_no,
        is_void,
        voided_at,
        created_at
      FROM batches
      WHERE product_id = ${productId}
        AND COALESCE(is_void, false) = false
      ORDER BY purchase_date DESC, id DESC
    `;

    const batches = rows.map((b) => ({
      id: b.id,
      productId: b.product_id,
      lotNumber: b.lot_number,
      purchaseDate: b.purchase_date,
      expiryDate: b.expiry_date,
      // use qty_received (new) and fall back to quantity_received (old)
      qtyReceived: n(b.qty_received ?? b.quantity_received ?? 0),
      purchasePriceJod: b.purchase_price_jod,
      supplierName: b.supplier_name || null,
      supplierInvoiceNo: b.supplier_invoice_no || null,
      createdAt: b.created_at,
    }));

    return Response.json({ ok: true, batches }, { status: 200 });
  } catch (err) {
    console.error("GET /api/batches failed:", err);
    return Response.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

/**
 * POST /api/batches
 * if same productId + lotNumber exists => add qty and update weighted average cost
 * always inserts inventory_movements IN for qtyReceived
 */
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

    if (!Number.isFinite(productId) || productId <= 0)
      return Response.json({ ok: false, error: "productId is required" }, { status: 400 });
    if (!lotNumber)
      return Response.json({ ok: false, error: "lotNumber is required" }, { status: 400 });
    if (!purchaseDate)
      return Response.json({ ok: false, error: "purchaseDate must be YYYY-MM-DD" }, { status: 400 });
    if (!Number.isFinite(qtyReceived) || qtyReceived <= 0)
      return Response.json({ ok: false, error: "qtyReceived must be > 0" }, { status: 400 });
    if (!Number.isFinite(purchasePriceJod) || purchasePriceJod <= 0)
      return Response.json({ ok: false, error: "purchasePriceJod must be > 0" }, { status: 400 });

    // find existing batch for same product+lot (non-void)
    const existing = await sql`
      SELECT id, qty_received, quantity_received, purchase_price_jod
      FROM batches
      WHERE product_id = ${productId}
        AND lot_number = ${lotNumber}
        AND COALESCE(is_void, false) = false
      LIMIT 1
    `;

    let batchId;

    if (existing.length) {
      const b = existing[0];
      const oldQty = n(b.qty_received ?? b.quantity_received ?? 0);
      const oldPrice = Number(b.purchase_price_jod || 0);

      const newQty = oldQty + qtyReceived;
      const newAvg =
        newQty > 0 ? ((oldPrice * oldQty) + (purchasePriceJod * qtyReceived)) / newQty : purchasePriceJod;

      const upd = await sql`
        UPDATE batches
        SET
          qty_received = ${newQty},
          quantity_received = ${newQty},
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
          product_id, lot_number, purchase_date, expiry_date,
          purchase_price_jod, qty_received, quantity_received,
          supplier_name, supplier_invoice_no
        )
        VALUES (
          ${productId}, ${lotNumber}, ${purchaseDate}, ${expiryDate},
          ${purchasePriceJod}, ${qtyReceived}, ${qtyReceived},
          ${supplierName}, ${supplierInvoiceNo}
        )
        RETURNING id
      `;
      batchId = ins[0].id;
    }

    // record inventory movement
    await sql`
      INSERT INTO inventory_movements (product_id, movement_type, qty, batch_id, movement_date, note)
      VALUES (${productId}, 'IN', ${qtyReceived}, ${batchId}, ${purchaseDate}, 'Receive batch')
    `;

    return Response.json({ ok: true, batchId }, { status: 201 });
  } catch (err) {
    console.error("POST /api/batches failed:", err);
    return Response.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/batches?id=123
 * soft-void + reverse inventory with ADJ negative
 */
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
      SELECT id, product_id, qty_received, quantity_received, purchase_date
      FROM batches
      WHERE id = ${id} AND COALESCE(is_void, false) = false
      LIMIT 1
    `;
    if (!rows.length) {
      return Response.json({ ok: false, error: "Batch not found" }, { status: 404 });
    }

    const b = rows[0];
    const qty = n(b.qty_received ?? b.quantity_received ?? 0);

    await sql`UPDATE batches SET is_void = true, voided_at = NOW() WHERE id = ${id}`;

    if (qty > 0) {
      await sql`
        INSERT INTO inventory_movements (product_id, movement_type, qty, batch_id, movement_date, note)
        VALUES (${b.product_id}, 'ADJ', ${-qty}, ${id}, ${b.purchase_date}, 'Void batch (reverse)')
      `;
    }

    return Response.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("DELETE /api/batches failed:", err);
    return Response.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
