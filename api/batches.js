import { getSql } from "../lib/db.js";
import { requireUser } from "../lib/requireAuth.js";

/**
 * Convert Web Response -> Node res
 */
async function sendWebResponse(res, webRes) {
  res.statusCode = webRes.status;
  webRes.headers.forEach((v, k) => res.setHeader(k, v));
  const buf = Buffer.from(await webRes.arrayBuffer());
  res.end(buf);
}

/**
 * Build a WHATWG Request from Vercel Node req
 * so your existing requireUser() keeps working.
 */
function toWebRequest(req, bodyObj = undefined) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host =
    req.headers["x-forwarded-host"] ||
    req.headers.host ||
    "localhost";

  const url = `${proto}://${host}${req.url}`;

  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers || {})) {
    if (typeof v === "string") headers.set(k, v);
    else if (Array.isArray(v)) headers.set(k, v.join(","));
  }

  const init = { method: req.method, headers };

  // Only attach body for non-GET/HEAD
  if (bodyObj !== undefined && req.method !== "GET" && req.method !== "HEAD") {
    init.body = JSON.stringify(bodyObj);
    if (!headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
  }

  return new Request(url, init);
}

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

async function readJsonBody(req, res) {
  // If Vercel already parsed it:
  let body = req.body;

  // If it’s a string:
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: "Invalid JSON body" }));
      return null;
    }
  }

  // If empty, read stream:
  if (!body) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString("utf8");
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: "Invalid JSON body" }));
      return null;
    }
  }

  return body || {};
}

export default async function handler(req, res) {
  try {
    const method = req.method || "GET";
    const sql = getSql();

    // --- GET /api/batches?productId=123
    if (method === "GET") {
      const webReq = toWebRequest(req);
      const auth = await requireUser(webReq); // any logged in user
      if (auth instanceof Response) return sendWebResponse(res, auth);

      const url = new URL(webReq.url);
      const productId = n(url.searchParams.get("productId"));
      if (!productId) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: false, error: "productId is required" }));
        return;
      }

      const rows = await sql`
        SELECT
          id,
          product_id,
          lot_number,
          purchase_date,
          expiry_date,
          qty_received,
          purchase_price_jod,
          supplier_name,
          supplier_invoice_no,
          supplier_id,
          created_at
        FROM batches
        WHERE product_id = ${productId}
          AND COALESCE(is_void, false) = false
        ORDER BY purchase_date DESC, id DESC
      `;

      const batches = (rows || []).map((r) => ({
        id: r.id,
        productId: r.product_id,
        lotNumber: r.lot_number,
        purchaseDate: r.purchase_date,
        expiryDate: r.expiry_date,
        qtyReceived: n(r.qty_received),
        purchasePriceJod: r.purchase_price_jod,
        supplierName: r.supplier_name,
        supplierInvoiceNo: r.supplier_invoice_no,
        supplierId: r.supplier_id || null,
        createdAt: r.created_at,
      }));

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true, batches }));
      return;
    }

    // --- POST /api/batches  (main only)
    if (method === "POST") {
      const body = await readJsonBody(req, res);
      if (body === null) return;

      const webReq = toWebRequest(req, body);
      const auth = await requireUser(webReq, { rolesAny: ["main"] });
      if (auth instanceof Response) return sendWebResponse(res, auth);

      const productId = n(body?.productId);
      const lotNumber = String(body?.lotNumber || "").trim();
      const purchaseDate = toDateOrNull(body?.purchaseDate);
      const expiryDate = toDateOrNull(body?.expiryDate);
      const purchasePriceJod = n(body?.purchasePriceJod);
      const qtyReceived = n(body?.qtyReceived);

      const supplierId = body?.supplierId === null || body?.supplierId === undefined
        ? null
        : n(body?.supplierId);

      const supplierName = String(body?.supplierName || "").trim() || null;
      const supplierInvoiceNo = String(body?.supplierInvoiceNo || "").trim() || null;

      if (!productId) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: false, error: "productId is required" }));
        return;
      }
      if (!lotNumber) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: false, error: "lotNumber is required" }));
        return;
      }
      if (!purchaseDate) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: false, error: "purchaseDate must be YYYY-MM-DD" }));
        return;
      }
      if (qtyReceived <= 0) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: false, error: "qtyReceived must be > 0" }));
        return;
      }
      if (purchasePriceJod <= 0) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: false, error: "purchasePriceJod must be > 0" }));
        return;
      }

      const warehouseId = 1;

      const result = await sql.begin(async (tx) => {
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

      res.statusCode = 201;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true, batchId: result.batchId }));
      return;
    }

    // --- DELETE /api/batches?id=123 (main only)
    if (method === "DELETE") {
      const webReq = toWebRequest(req);
      const auth = await requireUser(webReq, { rolesAny: ["main"] });
      if (auth instanceof Response) return sendWebResponse(res, auth);

      const url = new URL(webReq.url);
      const id = n(url.searchParams.get("id"));
      if (!id) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: false, error: "id is required" }));
        return;
      }

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
              INSERT INTO inventory_movements (
                warehouse_id, product_id, movement_type, qty, batch_id, movement_date, note
              )
              VALUES (
                ${b.warehouse_id || 1}, ${b.product_id}, 'ADJ', ${-qty}, ${id}, ${b.purchase_date},
                'Void batch (reverse)'
              )
            `;
          }
        });
      } catch (e) {
        if (String(e?.message) === "BATCH_NOT_FOUND") {
          res.statusCode = 404;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: false, error: "Batch not found" }));
          return;
        }
        throw e;
      }

      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    // --- Method not allowed
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: false, error: "Method not allowed" }));
  } catch (err) {
    console.error("api/batches error:", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: false, error: "Server error", detail: String(err?.message || err) }));
  }
}
