// api/batches.js
import { getSql } from "./_lib/db.js";
import { requireUser } from "./_lib/requireAuth.js";

export const config = { runtime: "nodejs" };

function toDateOrNull(s) {
  const v = String(s || "").trim();
  if (!v) return null;
  // Expect YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return v;
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

    // Find existing (same product + lot), ignore voided lots if you add the migration
    const existing = await sql`
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
      const oldQty = Number(b.qty_received || 0);
      const oldPrice = Number(b.purchase_price_jod || 0);

      const newQty = oldQty + qtyReceived;
      const newAvg =
        newQty > 0 ? ((oldPrice * oldQty) + (purchasePriceJod * qtyReceived)) / newQty : purchasePriceJod;

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
          product_id, lot_number, purchase_date, expiry_date,
          purchase_price_jod, qty_received, supplier_name, supplier_invoice_no
        )
        VALUES (
          ${productId}, ${lotNumber}, ${purchaseDate}, ${expiryDate},
          ${purchasePriceJod}, ${qtyReceived}, ${supplierName}, ${supplierInvoiceNo}
        )
        RETURNING id
      `;
      batchId = ins[0].id;
    }

    // Always record an inventory IN movement for received quantity
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

// Optional: VOID a batch (soft-delete) and reverse stock.
// Requires the Neon migration below (is_void, voided_at) + batch_id in inventory_movements.
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
      SELECT id, product_id, qty_received, purchase_date
      FROM batches
      WHERE id = ${id} AND COALESCE(is_void, false) = false
      LIMIT 1
    `;
    if (!rows.length) {
      return Response.json({ ok: false, error: "Batch not found" }, { status: 404 });
    }

    const b = rows[0];
    const qty = Number(b.qty_received || 0);

    // mark void
    await sql`
      UPDATE batches
      SET is_void = true, voided_at = NOW()
      WHERE id = ${id}
    `;

    // reverse inventory
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
