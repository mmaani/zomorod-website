import { getSql } from "../lib/db.js";
import { requireUser } from "../lib/requireAuth.js";

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

async function readJson(req, res) {
  let body = req.body;

  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      res.status(400).json({ ok: false, error: "Invalid JSON body" });
      return null;
    }
  }

  if (!body) {
    const chunks = [];
    for await (const ch of req) chunks.push(ch);
    const raw = Buffer.concat(chunks).toString("utf8");
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      res.status(400).json({ ok: false, error: "Invalid JSON body" });
      return null;
    }
  }

  return body || {};
}

// ✅ Vercel Node Serverless Function
export default async function handler(req, res) {
  try {
    // ---------- GET ----------
    if (req.method === "GET") {
      const auth = await requireUser(req, res);
      if (!auth) return;

      const sql = getSql();
      const productId = n(req.query?.productId);

      if (!productId) {
        res.status(400).json({ ok: false, error: "productId is required" });
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

      const batches = rows.map((r) => ({
        id: r.id,
        productId: r.product_id,
        lotNumber: r.lot_number,
        purchaseDate: r.purchase_date,
        expiryDate: r.expiry_date,
        qtyReceived: n(r.qty_received),
        purchasePriceJod: r.purchase_price_jod,
        supplierName: r.supplier_name,
        supplierInvoiceNo: r.supplier_invoice_no,
        supplierId: r.supplier_id,
        createdAt: r.created_at,
      }));

      res.status(200).json({ ok: true, batches });
      return;
    }

    // ---------- POST (Main only) ----------
    if (req.method === "POST") {
      const auth = await requireUser(req, res, { rolesAny: ["main"] });
      if (!auth) return;

      const body = await readJson(req, res);
      if (!body) return;

      const sql = getSql();

      const productId = n(body?.productId);
      const lotNumber = String(body?.lotNumber || "").trim();
      const purchaseDate = toDateOrNull(body?.purchaseDate);
      const expiryDate = toDateOrNull(body?.expiryDate);
      const purchasePriceJod = n(body?.purchasePriceJod);
      const qtyReceived = n(body?.qtyReceived);

      const supplierId = body?.supplierId ? n(body.supplierId) : null;
      const supplierName = String(body?.supplierName || "").trim() || null;
      const supplierInvoiceNo = String(body?.supplierInvoiceNo || "").trim() || null;

      if (!productId) return res.status(400).json({ ok: false, error: "productId is required" });
      if (!lotNumber) return res.status(400).json({ ok: false, error: "lotNumber is required" });
      if (!purchaseDate) return res.status(400).json({ ok: false, error: "purchaseDate must be YYYY-MM-DD" });
      if (qtyReceived <= 0) return res.status(400).json({ ok: false, error: "qtyReceived must be > 0" });
      if (purchasePriceJod <= 0) return res.status(400).json({ ok: false, error: "purchasePriceJod must be > 0" });

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
          INSERT INTO inventory_movements (warehouse_id, product_id, movement_type, qty, batch_id, movement_date, note)
          VALUES (${warehouseId}, ${productId}, 'IN', ${qtyReceived}, ${batchId}, ${purchaseDate}, 'Receive batch')
        `;

        return { batchId };
      });

      res.status(201).json({ ok: true, batchId: result.batchId });
      return;
    }

    // ---------- DELETE (Main only) ----------
    if (req.method === "DELETE") {
      const auth = await requireUser(req, res, { rolesAny: ["main"] });
      if (!auth) return;

      const sql = getSql();
      const id = n(req.query?.id);
      if (!id) return res.status(400).json({ ok: false, error: "id is required" });

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
            INSERT INTO inventory_movements (warehouse_id, product_id, movement_type, qty, batch_id, movement_date, note)
            VALUES (${b.warehouse_id || 1}, ${b.product_id}, 'ADJ', ${-qty}, ${id}, ${b.purchase_date}, 'Void batch (reverse)')
          `;
        }
      });

      res.status(200).json({ ok: true });
      return;
    }

    // ---------- Method not allowed ----------
    res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    if (String(err?.message) === "BATCH_NOT_FOUND") {
      res.status(404).json({ ok: false, error: "Batch not found" });
      return;
    }
    console.error("api/batches error:", err);
    res.status(500).json({ ok: false, error: "Server error", detail: String(err?.message || err) });
  }
}
