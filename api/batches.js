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

function num(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : NaN;
}

export async function POST(request) {
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

  const purchasePriceJod = num(body?.purchasePriceJod);
  const qtyReceived = num(body?.qtyReceived);

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

  try {
    const result = await sql.begin(async (tx) => {
      // Find existing active batch (same product+lot, not voided)
      const existing = await tx`
        SELECT id, qty_received, purchase_price_jod
        FROM batches
        WHERE product_id = ${productId}
          AND lot_number = ${lotNumber}
          AND voided_at IS NULL
        LIMIT 1
      `;

      let batchId;

      if (existing.length) {
        const b = existing[0];
        const oldQty = Number(b.qty_received || 0);
        const oldPrice = Number(b.purchase_price_jod || 0);

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
            supplier_invoice_no = COALESCE(${supplierInvoiceNo}, supplier_invoice_no)
          WHERE id = ${b.id}
          RETURNING id
        `;
        batchId = upd[0].id;
      } else {
        const ins = await tx`
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

      // Record inventory movement (received stock)
      await tx`
        INSERT INTO inventory_movements (product_id, movement_type, qty, batch_id, movement_date, note)
        VALUES (${productId}, 'IN', ${qtyReceived}, ${batchId}, ${purchaseDate}, 'Receive batch')
      `;

      return { batchId };
    });

    return Response.json({ ok: true, batchId: result.batchId }, { status: 201 });
  } catch (err) {
    console.error("POST /api/batches failed:", err);
    return Response.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

// Void (soft-delete) a batch and reverse stock
export async function DELETE(request) {
  const auth = await requireUser(request, { rolesAny: ["main"] });
  if (auth instanceof Response) return auth;

  const sql = getSql();

  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));

  if (!Number.isFinite(id) || id <= 0) {
    return Response.json({ ok: false, error: "id is required" }, { status: 400 });
  }

  try {
    await sql.begin(async (tx) => {
      const rows = await tx`
        SELECT id, product_id, qty_received, purchase_date
        FROM batches
        WHERE id = ${id} AND voided_at IS NULL
        LIMIT 1
      `;
      if (!rows.length) {
        throw Object.assign(new Error("Batch not found"), { code: "NOT_FOUND" });
      }

      const b = rows[0];
      const qty = Number(b.qty_received || 0);

      await tx`
        UPDATE batches
        SET voided_at = NOW()
        WHERE id = ${id}
      `;

      if (qty > 0) {
        await tx`
          INSERT INTO inventory_movements (product_id, movement_type, qty, batch_id, movement_date, note)
          VALUES (${b.product_id}, 'ADJ', ${-qty}, ${id}, ${b.purchase_date}, 'Void batch (reverse)')
        `;
      }
    });

    return Response.json({ ok: true }, { status: 200 });
  } catch (err) {
    if (err?.code === "NOT_FOUND") {
      return Response.json({ ok: false, error: "Batch not found" }, { status: 404 });
    }
    console.error("DELETE /api/batches failed:", err);
    return Response.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
