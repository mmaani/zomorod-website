import { getSql } from "../lib/db.js";
import { requireUserFromReq, canSeePurchasePrice } from "../lib/requireAuth.js";

/**
 * Vercel Node Serverless Function
 * Supports:
 *  - GET    /api/batches?productId=123
 *  - POST   /api/batches
 *  - DELETE /api/batches?id=456
 *
 * Inventory is stored in BASE UNITS (pieces).
 * We also store receive packaging info for traceability:
 *   received_uom, received_uom_multiplier, received_uom_units, entered_unit_price_jod, entered_unit_price_uom
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
  res.end(
    JSON.stringify(payload, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
  );
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

function toStr(v) {
  return String(v ?? "").trim();
}

function toIntPos(v, fallback = 1) {
  const x = Math.round(n(v));
  return Number.isFinite(x) && x > 0 ? x : fallback;
}

function toUtcDayStamp(value) {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const y = Number(m[1]);
    const mm = Number(m[2]) - 1;
    const dd = Number(m[3]);
    return Date.UTC(y, mm, dd);
  }

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function computeExpiryStatus(expiryDate) {
  const expiryDay = toUtcDayStamp(expiryDate);
  if (expiryDay == null) return "NO_EXPIRY";

  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diffDays = Math.floor((expiryDay - todayUtc) / 86400000);

  if (diffDays < 0) return "EXPIRED";
  if (diffDays <= 90) return "EXPIRING_SOON";
  return "GOOD";
}

async function readJson(req) {
  let body = req.body;

  if (typeof body === "string") {
    try {
      return body ? JSON.parse(body) : {};
    } catch {
      throw new Error("Invalid JSON body");
    }
  }

  if (body && typeof body === "object") return body;

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

/* ---------------- schema safety ---------------- */

let batchesSchemaReady = false;

async function ensureBatchesSchema(sql) {
  if (batchesSchemaReady) return;

  // These ALTERs are safe to run multiple times.
  await sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS received_uom TEXT`;
  await sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS received_uom_multiplier INT`;
  await sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS received_uom_units INT`;
  await sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS entered_unit_price_jod NUMERIC`;
  await sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS entered_unit_price_uom TEXT`;

  // Helpful index for latest-first batch views
  await sql`CREATE INDEX IF NOT EXISTS idx_batches_product_date ON batches (product_id, purchase_date DESC, id DESC)`;

  batchesSchemaReady = true;
}

/* ---------------- handlers ---------------- */

async function handleGET(req, res) {
  const auth = await requireUserFromReq(req, res);
  if (!auth) return;

  const url = new URL(req.url, "http://localhost");
  const productId = n(url.searchParams.get("productId"));
  const includeVoided = url.searchParams.get("includeVoided") === "1";
  const sql = getSql();

  await ensureBatchesSchema(sql);

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
      b.is_void,

      b.received_uom,
      b.received_uom_multiplier,
      b.received_uom_units,
      b.entered_unit_price_jod,
      b.entered_unit_price_uom

    FROM batches b
    JOIN products p ON p.id = b.product_id
    WHERE (${productId} = 0 OR b.product_id = ${productId})
      AND (${includeVoided} = true OR COALESCE(b.is_void, false) = false)
    ORDER BY b.purchase_date DESC, b.id DESC
  `;

  const showPurchase = canSeePurchasePrice(auth.roles);

  const batches = (rows || []).map((r) => {
    const baseQty = n(r.qty_received);
    const basePrice = showPurchase ? n(r.purchase_price_jod) : null;

    // Defaults for old rows:
    const mult = toIntPos(r.received_uom_multiplier, 1);
    const uom = toStr(r.received_uom).toLowerCase() || "piece";
    const units = n(r.received_uom_units) > 0 ? Math.round(n(r.received_uom_units)) : (mult > 0 ? Math.round(baseQty / mult) : baseQty);

    const enteredUnitPrice = showPurchase
      ? (r.entered_unit_price_jod != null ? n(r.entered_unit_price_jod) : (basePrice != null ? basePrice * mult : null))
      : null;

    const enteredUom = toStr(r.entered_unit_price_uom).toLowerCase() || uom;

    return {
      id: r.id,
      productId: r.product_id,
      productCode: r.product_code,
      officialName: r.official_name,
      lotNumber: r.lot_number,
      purchaseDate: r.purchase_date,
      expiryDate: r.expiry_date,

      // BASE (pieces)
      qtyReceived: baseQty,
      purchasePriceJod: basePrice,

      supplierId: r.supplier_id ?? null,
      supplierName: r.supplier_name ?? null,
      supplierInvoiceNo: r.supplier_invoice_no ?? null,
      createdAt: r.created_at,
      isVoid: !!r.is_void,
      expiryStatus: computeExpiryStatus(r.expiry_date),

      // Traceability fields
      receivedUom: uom,
      receivedUomMultiplier: mult,
      receivedUomUnits: units,
      enteredUnitPriceJod: enteredUnitPrice,
      enteredUnitPriceUom: enteredUom,

      // placeholder (you currently don't compute remaining per batch)
      qtyRemaining: baseQty,
    };
  });

  return send(res, 200, { ok: true, batches });
}

async function handlePOST(req, res) {
  const auth = await requireUserFromReq(req, res, { rolesAny: ["main"] });
  if (!auth) return;

  const sql = getSql();
  await ensureBatchesSchema(sql);

  let body;
  try {
    body = await readJson(req);
  } catch (e) {
    return send(res, 400, { ok: false, error: e?.message || "Invalid JSON body" });
  }

  const productId = n(body?.productId);
  const lotNumber = toStr(body?.lotNumber);
  const purchaseDate = toDateOrNull(body?.purchaseDate);
  const expiryDate = toDateOrNull(body?.expiryDate);

  // --- NEW OPTIONAL INPUTS (packaging) ---
  const receivedUom = toStr(body?.receivedUom || body?.qtyUom || "piece").toLowerCase() || "piece";
  const receivedUomMultiplier = toIntPos(body?.receivedUomMultiplier || body?.qtyMultiplier || 1, 1);
  const receivedUomUnits = Math.round(n(body?.receivedUomUnits || body?.qtyUnits || 0));

  // prices: allow either base-per-piece OR entered-per-pack
  const purchasePriceJodBaseFromClient = n(body?.purchasePriceJodBase);
  const enteredUnitPriceJod = n(body?.enteredUnitPriceJod || body?.purchasePricePerUnit || body?.unitPriceJod);

  // quantities: allow either base pieces OR units*multiplier
  const qtyReceivedBaseFromClient = n(body?.qtyReceivedBase);

  // Backward compat:
  const purchasePriceJodLegacy = n(body?.purchasePriceJod);
  const qtyReceivedLegacy = n(body?.qtyReceived);

  const supplierId = body?.supplierId === "" || body?.supplierId == null ? null : n(body?.supplierId);
  const supplierName = toStr(body?.supplierName) || null;
  const supplierInvoiceNo = toStr(body?.supplierInvoiceNo) || null;

  if (!productId) return send(res, 400, { ok: false, error: "productId is required" });
  if (!lotNumber) return send(res, 400, { ok: false, error: "lotNumber is required" });
  if (!purchaseDate) return send(res, 400, { ok: false, error: "purchaseDate must be YYYY-MM-DD" });

  // Resolve base qty (pieces)
  let qtyBase = 0;
  if (qtyReceivedBaseFromClient > 0) qtyBase = qtyReceivedBaseFromClient;
  else if (receivedUomUnits > 0 && receivedUomMultiplier > 0) qtyBase = receivedUomUnits * receivedUomMultiplier;
  else qtyBase = qtyReceivedLegacy;

  // Resolve base price (per piece)
  let priceBase = 0;
  if (purchasePriceJodBaseFromClient > 0) priceBase = purchasePriceJodBaseFromClient;
  else if (enteredUnitPriceJod > 0 && receivedUomMultiplier > 0) priceBase = enteredUnitPriceJod / receivedUomMultiplier;
  else priceBase = purchasePriceJodLegacy;

  // Validate base values
  if (qtyBase <= 0) return send(res, 400, { ok: false, error: "qtyReceived must be > 0" });
  if (priceBase <= 0) return send(res, 400, { ok: false, error: "purchasePriceJod must be > 0" });

  // Fill missing trace values if client sent legacy only
  const finalUnits =
    receivedUomUnits > 0
      ? receivedUomUnits
      : (receivedUomMultiplier > 0 ? Math.round(qtyBase / receivedUomMultiplier) : qtyBase);

  const finalEnteredUnitPrice =
    enteredUnitPriceJod > 0 ? enteredUnitPriceJod : (priceBase * receivedUomMultiplier);

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

        // Weighted average on BASE units
        const newQty = oldQty + qtyBase;
        const newAvg =
          newQty > 0
            ? ((oldPrice * oldQty) + (priceBase * qtyBase)) / newQty
            : priceBase;

        const upd = await tx`
          UPDATE batches
          SET
            qty_received = ${newQty},
            purchase_price_jod = ${newAvg},
            purchase_date = ${purchaseDate},
            expiry_date = ${expiryDate},

            supplier_id = ${supplierId},
            supplier_name = COALESCE(${supplierName}, supplier_name),
            supplier_invoice_no = COALESCE(${supplierInvoiceNo}, supplier_invoice_no),

            received_uom = ${receivedUom},
            received_uom_multiplier = ${receivedUomMultiplier},
            received_uom_units = ${finalUnits},
            entered_unit_price_jod = ${finalEnteredUnitPrice},
            entered_unit_price_uom = ${receivedUom}

          WHERE id = ${b.id}
          RETURNING id
        `;
        batchId = upd?.[0]?.id;
      } else {
        const ins = await tx`
          INSERT INTO batches (
            product_id, warehouse_id, lot_number, purchase_date, expiry_date,
            purchase_price_jod, qty_received, supplier_name, supplier_invoice_no, supplier_id,

            received_uom, received_uom_multiplier, received_uom_units,
            entered_unit_price_jod, entered_unit_price_uom
          )
          VALUES (
            ${productId}, ${warehouseId}, ${lotNumber}, ${purchaseDate}, ${expiryDate},
            ${priceBase}, ${qtyBase}, ${supplierName}, ${supplierInvoiceNo}, ${supplierId},

            ${receivedUom}, ${receivedUomMultiplier}, ${finalUnits},
            ${finalEnteredUnitPrice}, ${receivedUom}
          )
          RETURNING id
        `;
        batchId = ins?.[0]?.id;
      }

      // Inventory movements remain BASE units (pieces)
      await tx`
        INSERT INTO inventory_movements (warehouse_id, product_id, movement_type, qty, movement_date, note)
        VALUES (${warehouseId}, ${productId}, 'IN', ${qtyBase}, ${purchaseDate}, 'Receive batch')
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
  await ensureBatchesSchema(sql);

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

      // Reverse inventory using ADJ movement (negative qty), BASE units
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
