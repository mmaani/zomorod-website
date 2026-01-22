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

async function getOrCreateMainWarehouse(sql) {
  // Ensure there is at least one warehouse (schema requires it)
  const existing = await sql`SELECT id FROM warehouses ORDER BY id ASC LIMIT 1`;
  if (existing.length) return existing[0].id;

  const ins = await sql`
    INSERT INTO warehouses (name)
    VALUES ('Main')
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `;
  return ins[0].id;
}

// GET /api/batches?productId=1&includeVoided=1
export async function GET(request) {
  try {
    const auth = await requireUser(request);
    if (auth instanceof Response) return auth;

    const sql = getSql();
    const url = new URL(request.url);

    const productId = Number(url.searchParams.get("productId") || 0);
    const includeVoided = url.searchParams.get("includeVoided") === "1";

    if (!productId) {
      return Response.json({ ok: false, error: "productId is required" }, { status: 400 });
    }

    // NOTE: after migration we will have is_void + voided_at.
    // Until then, COALESCE(is_void,false) will error if column doesn't exist.
    // So we keep this query compatible by NOT referencing is_void unless it exists.
    // -> After you run the migration below, you can keep it as-is.
    const rows = await sql`
      SELECT
        b.id,
        b.product_id,
        b.warehouse_id,
        b.lot_number,
        b.purchase_date,
        b.expiry_date,
        b.purchase_price_jod,
        b.quantity_received,
        b.supplier_name,
        b.supplier_invoice_no,
        b.created_at,
        ${includeVoided}::boolean AS _include_voided
      FROM batches b
      WHERE b.product_id = ${productId}
      ORDER BY b.purchase_date DESC, b.id DESC
    `;

    // If migration added is_void, filter in JS safely:
    // (We can’t SELECT is_void before migration without breaking.)
    let out = rows.map((r) => ({
      id: r.id,
      productId: r.product_id,
      warehouseId: r.warehouse_id,
      lotNumber: r.lot_number,
      purchaseDate: r.purchase_date,
      expiryDate: r.expiry_date,
      purchasePriceJod: r.purchase_price_jod,
      qtyReceived: Number(r.quantity_received || 0),
      supplierName: r.supplier_name || null,
      supplierInvoiceNo: r.supplier_invoice_no || null,
      createdAt: r.created_at,
    }));

    // After migration you’ll update GET to read is_void + voided_at (I show that below).
    return Response.json({ ok: true, batches: out }, { status: 200 });
  } catch (err) {
    console.error("GET /api/batches failed:", err);
    return Response.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

// POST /api/batches  (receive batch / lot; if same lot exists -> add qty + weighted avg)
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

    const warehouseId = await getOrCreateMainWarehouse(sql);

    // Find existing lot for same product+warehouse+lot
    const existing = await sql`
      SELECT id, quantity_received, purchase_price_jod
      FROM batches
      WHERE product_id = ${productId}
        AND warehouse_id = ${warehouseId}
        AND lot_number = ${lotNumber}
      LIMIT 1
    `;

    let batchId;

    if (existing.length) {
      const b = existing[0];
      const oldQty = Number(b.quantity_received || 0);
      const oldPrice = Number(b.purchase_price_jod || 0);

      const newQty = oldQty + qtyReceived;
      const newAvg =
        newQty > 0
          ? ((oldPrice * oldQty) + (purchasePriceJod * qtyReceived)) / newQty
          : purchasePriceJod;

      const upd = await sql`
        UPDATE batches
        SET
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
          product_id, warehouse_id, lot_number, purchase_date, expiry_date,
          purchase_price_jod, quantity_received, supplier_name, supplier_invoice_no
        )
        VALUES (
          ${productId}, ${warehouseId}, ${lotNumber}, ${purchaseDate}, ${expiryDate},
          ${purchasePriceJod}, ${qtyReceived}, ${supplierName}, ${supplierInvoiceNo}
        )
        RETURNING id
      `;
      batchId = ins[0].id;
    }

    // Record inventory movement IN (schema requires warehouse_id)
    await sql`
      INSERT INTO inventory_movements (
        warehouse_id, product_id, batch_id, movement_type, qty, movement_date, note, created_by
      )
      VALUES (
        ${warehouseId}, ${productId}, ${batchId}, 'IN', ${qtyReceived},
        ${purchaseDate}::timestamptz, 'Receive batch', ${auth.userId ?? null}
      )
    `;

    return Response.json({ ok: true, batchId }, { status: 201 });
  } catch (err) {
    console.error("POST /api/batches failed:", err);
    return Response.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
