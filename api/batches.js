// api/batches.js
import { getSql } from "../lib/db.js";
import { requireUserFromReq, canSeePurchasePrice } from "../lib/requireAuth.js";

let batchesSchemaReady = false;

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
  // Prevent BigInt JSON crashes
  res.end(
    JSON.stringify(payload, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
  );
}

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function s(v) {
  return String(v ?? "").trim();
}

function toDateOrNull(s0) {
  const v = String(s0 || "").trim();
  if (!v) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return v;
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

function normalizeUom(raw) {
  const u = s(raw).toLowerCase();
  if (!u || u === "piece" || u === "pcs" || u === "pc" || u === "unit") return "piece";
  if (u === "dozen" || u === "dz") return "dozen";

  // pack10 / box10 / pack-10 / box_10
  const m = u.match(/^(pack|box|carton|case)[-_ ]?(\d+)$/);
  if (m) return `pack${m[2]}`;

  const m2 = u.match(/^pack(\d+)$/);
  if (m2) return `pack${m2[1]}`;

  if (u === "custom") return "custom";
  return u; // unknown => will fail validation
}

function uomMultiplier(uomRaw, customPackSizeRaw) {
  const uom = normalizeUom(uomRaw);

  if (uom === "piece") return 1;
  if (uom === "dozen") return 12;

  const m = uom.match(/^pack(\d+)$/);
  if (m) {
    const k = Math.floor(n(m[1]));
    return k > 0 ? k : 0;
  }

  if (uom === "custom") {
    const k = Math.floor(n(customPackSizeRaw));
    return k > 0 ? k : 0;
  }

  return 0;
}

async function ensureBatchesSchema(sql) {
  if (batchesSchemaReady) return;

  // Add columns for “received unit” metadata (safe if already exists)
  await sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS qty_uom TEXT`;
  await sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS qty_uom_multiplier INT`;
  await sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS qty_input INT`;
  await sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS purchase_price_input_jod NUMERIC`;
  await sql`ALTER TABLE batches ADD COLUMN IF NOT EXISTS purchase_price_uom TEXT`;

  // Backfill defaults for existing rows
  await sql`UPDATE batches SET qty_uom = 'piece' WHERE qty_uom IS NULL`;
  await sql`UPDATE batches SET qty_uom_multiplier = 1 WHERE qty_uom_multiplier IS NULL`;
  await sql`UPDATE batches SET qty_input = qty_received WHERE qty_input IS NULL`;
  await sql`UPDATE batches SET purchase_price_input_jod = purchase_price_jod WHERE purchase_price_input_jod IS NULL`;
  await sql`UPDATE batches SET purchase_price_uom = 'piece' WHERE purchase_price_uom IS NULL`;

  batchesSchemaReady = true;
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

/* ---------------- handlers ---------------- */

async function handleGET(req, res) {
  const auth = await requireUserFromReq(req, res);
  if (!auth) return;

  const sql = getSql();
  await ensureBatchesSchema(sql);

  const url = new URL(req.url, "http://localhost");
  const productId = n(url.searchParams.get("productId"));
  const includeVoided = url.searchParams.get("includeVoided") === "1";

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
      b.qty_uom,
      b.qty_uom_multiplier,
      b.qty_input,
      b.purchase_price_jod,
      b.purchase_price_input_jod,
      b.purchase_price_uom,
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

    // Base quantity (pieces) — this is what inventory uses
    qtyReceived: n(r.qty_received),
    qtyRemaining: n(r.qty_received),

    // Input metadata (what user entered)
    qtyUom: r.qty_uom || "piece",
    qtyUomMultiplier: n(r.qty_uom_multiplier) || 1,
    qtyInput: n(r.qty_input) || n(r.qty_received),

    // Base unit cost (per piece)
    purchasePriceJod: showPurchase ? r.purchase_price_jod : null,

    // Input metadata (what user entered)
    purchasePriceInputJod: showPurchase ? r.purchase_price_input_jod : null,
    purchasePriceUom: r.purchase_price_uom || (r.qty_uom || "piece"),

    supplierId: r.supplier_id ?? null,
    supplierName: r.supplier_name ?? null,
    supplierInvoiceNo: r.supplier_invoice_no ?? null,
    createdAt: r.created_at,
    isVoid: !!r.is_void,
    expiryStatus: computeExpiryStatus(r.expiry_date),
  }));

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
  const lotNumber = s(body?.lotNumber);
  const purchaseDate = toDateOrNull(body?.purchaseDate);
  const expiryDate = toDateOrNull(body?.expiryDate);

  const qtyInput = Math.floor(n(body?.qtyReceived)); // “received quantity” in selected uom
  const qtyUom = normalizeUom(body?.qtyUom || "piece");
  const mult = uomMultiplier(qtyUom, body?.customPackSize);

  // Interpret purchasePriceJod as “price per selected unit (uom)”
  const purchasePriceInputJod = n(body?.purchasePriceJod);

  const supplierId = body?.supplierId === "" || body?.supplierId == null ? null : n(body?.supplierId);
  const supplierName = s(body?.supplierName) || null;
  const supplierInvoiceNo = s(body?.supplierInvoiceNo) || null;

  if (!productId) return send(res, 400, { ok: false, error: "productId is required" });
  if (!lotNumber) return send(res, 400, { ok: false, error: "lotNumber is required" });
  if (!purchaseDate) return send(res, 400, { ok: false, error: "purchaseDate must be YYYY-MM-DD" });

  if (!qtyUom) return send(res, 400, { ok: false, error: "qtyUom is required" });
  if (!mult || mult <= 0) return send(res, 400, { ok: false, error: "Invalid unit multiplier (check qtyUom/customPackSize)" });
  if (!Number.isFinite(qtyInput) || qtyInput <= 0) return send(res, 400, { ok: false, error: "qtyReceived must be > 0" });

  if (!Number.isFinite(purchasePriceInputJod) || purchasePriceInputJod <= 0) {
    return send(res, 400, { ok: false, error: "purchasePriceJod must be > 0" });
  }

  const qtyBase = qtyInput * mult; // convert to pieces
  const purchasePricePerPiece = purchasePriceInputJod / mult;

  if (!(purchasePricePerPiece > 0)) {
    return send(res, 400, { ok: false, error: "Purchase price per piece must be > 0 (check unit + price)" });
  }

  const warehouseId = 1;

  try {
    const result = await sql.begin(async (tx) => {
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

        const newQty = oldQty + qtyBase;
        const newAvg =
          newQty > 0
            ? ((oldPrice * oldQty) + (purchasePricePerPiece * qtyBase)) / newQty
            : purchasePricePerPiece;

        const upd = await tx`
          UPDATE batches
          SET
            qty_received = ${newQty},
            purchase_price_jod = ${newAvg},
            purchase_date = ${purchaseDate},
            expiry_date = ${expiryDate},

            qty_uom = ${qtyUom},
            qty_uom_multiplier = ${mult},
            qty_input = ${qtyInput},
            purchase_price_input_jod = ${purchasePriceInputJod},
            purchase_price_uom = ${qtyUom},

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
            purchase_price_jod, qty_received,
            qty_uom, qty_uom_multiplier, qty_input,
            purchase_price_input_jod, purchase_price_uom,
            supplier_name, supplier_invoice_no, supplier_id
          )
          VALUES (
            ${productId}, ${warehouseId}, ${lotNumber}, ${purchaseDate}, ${expiryDate},
            ${purchasePricePerPiece}, ${qtyBase},
            ${qtyUom}, ${mult}, ${qtyInput},
            ${purchasePriceInputJod}, ${qtyUom},
            ${supplierName}, ${supplierInvoiceNo}, ${supplierId}
          )
          RETURNING id
        `;

        batchId = ins?.[0]?.id;
      }

      // inventory movements remain in base units (pieces)
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

      await tx`UPDATE batches SET is_void = true, voided_at = NOW() WHERE id = ${id}`;

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
