
import { getSql } from "../lib/db.js";
import { requireUserFromReq, canSeePurchasePrice } from "../lib/requireAuth.js";

/**
 * Vercel Node Serverless Function
 * Supports:
 *  - GET    /api/batches?productId=123
 *  - POST   /api/batches
 *  - DELETE /api/batches?id=456
 *
 * NOTE:
 * - Sales doesn't use batch_id, so we also do NOT use batch_id in inventory_movements inserts.
 */
export default async function handler(req, res) {
  const method = req.method || "GET";

  try {
    if (method === "GET") return await handleGET(req, res);
    if (method === "POST") return await handlePOST(req, res);
    if (method === "DELETE") return await handleDELETE(req, res);

    return send(res, 405, { ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("api/batches crashed:", err);
    return send(res, 500, { ok: false, error: "Server error" });
  }
}

/* ---------------- helpers ---------------- */

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function toDateOrNull(s) {
  const v = String(s || "").trim();
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return v;
}


function computeExpiryStatus(expiryDate) {
  if (!expiryDate) return "NO_EXPIRY";
  const d = new Date(`${expiryDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "NO_EXPIRY";

  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diffDays = Math.floor((d.getTime() - todayUtc) / 86400000);

  if (diffDays < 0) return "EXPIRED";
  if (diffDays <= 90) return "EXPIRING_SOON";
  return "GOOD";
}

async function readJson(req) {
  // Vercel sometimes provides req.body already parsed
  let body = req.body;

  if (typeof body === "string") {
    try {
      return body ? JSON.parse(body) : {};
    } catch {
      throw new Error("Invalid JSON body");
    }
  }

  if (body && typeof body === "object") return body;

  // Fallback: read stream
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON body");
  }
}

/* ---------------- handlers ---------------- */

async function handleGET(req, res) {
  const auth = await requireUserFromReq(req, res);
  if (!auth) return;

  const url = new URL(req.url, "http://localhost");
  const productId = n(url.searchParams.get("productId"));
  const includeVoided = url.searchParams.get("includeVoided") === "1";

  const sql = getSql();

  const rows = await sql`
    SELECT
      b.id,
      b.product_id,
      p.product_code,
      p.official_name,
      b.lot_number,
      b.purchase_date,
      b.expiry_date,
      b.qty_received,
      b.purchase_price_jod,
      b.supplier_name,
      b.supplier_invoice_no,
      b.supplier_id,
      b.created_at,
      b.is_void
    FROM batches b
    JOIN products p ON p.id = b.product_id
    WHERE (${productId} = 0 OR b.product_id = ${productId})
      AND (${includeVoided} = true OR COALESCE(b.is_void, false) = false)
    ORDER BY b.purchase_date DESC, b.id DESC
  `;

  const showPurchase = canSeePurchasePrice(auth.roles);

  const batches = (rows || []).map((r) => ({
    id: r.id,
    productId: r.product_id,
    productCode: r.product_code,
    officialName: r.official_name,
    lotNumber: r.lot_number,
    purchaseDate: r.purchase_date,
    expiryDate: r.expiry_date,
    qtyReceived: n(r.qty_received),

    // Hide purchase price for roles that should not see it
    purchasePriceJod: showPurchase ? r.purchase_price_jod : null,

    supplierId: r.supplier_id ?? null,
    supplierName: r.supplier_name ?? null,
    supplierInvoiceNo: r.supplier_invoice_no ?? null,
    createdAt: r.created_at,
    isVoid: !!r.is_void,
    expiryStatus: computeExpiryStatus(r.expiry_date),
    qtyRemaining: n(r.qty_received),
  }));

  return send(res, 200, { ok: true, batches });
}

async function handlePOST(req, res) {
  const auth = await requireUserFromReq(req, res, { rolesAny: ["main"] });
  if (!auth) return;

  const sql = getSql();

  let body;
  try {
    body = await readJson(req);
  } catch (e) {
    return send(res, 400, { ok: false, error: e?.message || "Invalid JSON body" });
  }

  const productId = n(body?.productId);
  const lotNumber = String(body?.lotNumber || "").trim();
  const purchaseDate = toDateOrNull(body?.purchaseDate);
  const expiryDate = toDateOrNull(body?.expiryDate);
  const purchasePriceJod = n(body?.purchasePriceJod);
  const qtyReceived = n(body?.qtyReceived);

  const supplierId = body?.supplierId === "" || body?.supplierId == null ? null : n(body?.supplierId);
  const supplierName = String(body?.supplierName || "").trim() || null;
  const supplierInvoiceNo = String(body?.supplierInvoiceNo || "").trim() || null;

  if (!productId) return send(res, 400, { ok: false, error: "productId is required" });
  if (!lotNumber) return send(res, 400, { ok: false, error: "lotNumber is required" });
  if (!purchaseDate) return send(res, 400, { ok: false, error: "purchaseDate must be YYYY-MM-DD" });
  if (qtyReceived <= 0) return send(res, 400, { ok: false, error: "qtyReceived must be > 0" });
  if (purchasePriceJod <= 0) return send(res, 400, { ok: false, error: "purchasePriceJod must be > 0" });

  const warehouseId = 1;

  try {
    const result = await sql.begin(async (tx) => {
      // Look for an existing (same product + lot) non-void batch
      const existing = await tx`
        SELECT id, qty_received, purchase_price_jod
        FROM batches
        WHERE product_id = ${productId}
          AND warehouse_id = ${warehouseId}
          AND lot_number = ${lotNumber}
          AND COALESCE(is_void, false) = false
        LIMIT 1
      `;

      let batchId;

      if (existing.length) {
        const b = existing[0];
        const oldQty = n(b.qty_received);
        const oldPrice = n(b.purchase_price_jod);

        // ✅ Weighted average across quantities (old + new)
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
            supplier_id = ${supplierId},
            supplier_name = COALESCE(${supplierName}, supplier_name),
            supplier_invoice_no = COALESCE(${supplierInvoiceNo}, supplier_invoice_no)
          WHERE id = ${b.id}
          RETURNING id
        `;

        batchId = upd?.[0]?.id;
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

        batchId = ins?.[0]?.id;
      }

      // ✅ Insert movement WITHOUT batch_id (since your system doesn't use it)
      await tx`
        INSERT INTO inventory_movements (warehouse_id, product_id, movement_type, qty, movement_date, note)
        VALUES (${warehouseId}, ${productId}, 'IN', ${qtyReceived}, ${purchaseDate}, 'Receive batch')
      `;

      return { batchId };
    });

    return send(res, 201, { ok: true, batchId: result.batchId });
  } catch (err) {
    console.error("POST /api/batches failed:", err);
    return send(res, 500, { ok: false, error: "Server error" });
  }
}

async function handleDELETE(req, res) {
  const auth = await requireUserFromReq(req, res, { rolesAny: ["main"] });
  if (!auth) return;

  const sql = getSql();
  const url = new URL(req.url, "http://localhost");
  const id = n(url.searchParams.get("id"));
  if (!id) return send(res, 400, { ok: false, error: "id is required" });

  try {
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

      // Soft void
      await tx`UPDATE batches SET is_void = true, voided_at = NOW() WHERE id = ${id}`;

      // Reverse inventory using ADJ movement (negative qty), WITHOUT batch_id
      if (qty > 0) {
        await tx`
          INSERT INTO inventory_movements (warehouse_id, product_id, movement_type, qty, movement_date, note)
          VALUES (${b.warehouse_id || 1}, ${b.product_id}, 'ADJ', ${-qty}, ${b.purchase_date}, 'Void batch (reverse)')
        `;
      }
    });

    return send(res, 200, { ok: true });
  } catch (err) {
    if (String(err?.message) === "BATCH_NOT_FOUND") {
      return send(res, 404, { ok: false, error: "Batch not found" });
    }
    console.error("DELETE /api/batches failed:", err);
    return send(res, 500, { ok: false, error: "Server error" });
  }
}

