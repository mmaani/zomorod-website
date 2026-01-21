import { getSql } from "./_lib/db.js";
import { requireUser, canSeePurchasePrice } from "./_lib/requireAuth.js";

export async function GET(request) {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;

  const sql = getSql();
  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");

  const rows = await sql`
    SELECT
      b.id,
      b.product_id,
      b.warehouse_id,
      w.name AS warehouse,
      b.lot_number,
      b.purchase_date,
      b.expiry_date,
      b.purchase_price_jod,
      b.quantity_received,
      b.supplier_name,
      b.supplier_invoice_no,
      p.product_code,
      p.official_name
    FROM batches b
    JOIN products p ON p.id = b.product_id
    JOIN warehouses w ON w.id = b.warehouse_id
    WHERE (${productId}::int IS NULL OR b.product_id = ${productId}::int)
    ORDER BY b.purchase_date DESC, b.id DESC
  `;

  const showPurchase = canSeePurchasePrice(auth.roles);

  const data = rows.map((r) => {
    const item = {
      id: r.id,
      productId: r.product_id,
      productCode: r.product_code,
      officialName: r.official_name,
      warehouseId: r.warehouse_id,
      warehouse: r.warehouse,
      lotNumber: r.lot_number,
      purchaseDate: r.purchase_date,
      expiryDate: r.expiry_date,
      quantityReceived: r.quantity_received,
      supplierName: r.supplier_name || "",
      supplierInvoiceNo: r.supplier_invoice_no || "",
      purchasePriceJod: r.purchase_price_jod,
    };

    if (!showPurchase) item.purchasePriceJod = null;
    return item;
  });

  return Response.json({ ok: true, batches: data }, { status: 200 });
}

export async function POST(request) {
  // Receiving stock is operational — keep it main-only for now
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
  const warehouseId = Number(body?.warehouseId || 1);
  const lotNumber = String(body?.lotNumber || "").trim();
  const purchaseDate = String(body?.purchaseDate || "").trim(); // YYYY-MM-DD
  const expiryDate = body?.expiryDate ? String(body.expiryDate).trim() : null;
  const purchasePriceJod = Number(body?.purchasePriceJod);
  const quantityReceived = Number(body?.quantityReceived);
  const supplierName = String(body?.supplierName || "").trim();
  const supplierInvoiceNo = String(body?.supplierInvoiceNo || "").trim();

  if (!productId || !lotNumber || !purchaseDate) {
    return Response.json(
      { ok: false, error: "productId, lotNumber, purchaseDate are required" },
      { status: 400 }
    );
  }
  if (!Number.isFinite(purchasePriceJod) || purchasePriceJod <= 0) {
    return Response.json({ ok: false, error: "purchasePriceJod must be > 0" }, { status: 400 });
  }
  if (!Number.isFinite(quantityReceived) || quantityReceived <= 0) {
    return Response.json({ ok: false, error: "quantityReceived must be > 0" }, { status: 400 });
  }

  const bRows = await sql`
    INSERT INTO batches (
      product_id, warehouse_id, lot_number, purchase_date, expiry_date,
      purchase_price_jod, quantity_received, supplier_name, supplier_invoice_no
    )
    VALUES (
      ${productId}, ${warehouseId}, ${lotNumber}, ${purchaseDate}, ${expiryDate},
      ${purchasePriceJod}, ${quantityReceived}, ${supplierName || null}, ${supplierInvoiceNo || null}
    )
    RETURNING id
  `;

  const batchId = bRows[0].id;

  // Inventory IN movement
  await sql`
    INSERT INTO inventory_movements (warehouse_id, product_id, batch_id, movement_type, qty, note, created_by)
    VALUES (${warehouseId}, ${productId}, ${batchId}, 'IN', ${quantityReceived}, 'Batch received', ${auth.userId})
  `;

  return Response.json({ ok: true, id: batchId }, { status: 201 });
}
