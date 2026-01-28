// api/sales.js
import { getSql } from "../lib/db.js";
import { requireUserFromReq } from "../lib/requireAuth.js";

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

async function readJson(req) {
  let body = req.body;
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
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

async function getDefaultSalespersonId(tx) {
  const rows = await tx`
    SELECT id
    FROM salespersons
    WHERE is_default = true
    LIMIT 1
  `;
  return rows?.[0]?.id || null;
}

async function getOnHand(tx, warehouseId, productId) {
  const inv = await tx`
    SELECT COALESCE(SUM(
      CASE
        WHEN movement_type IN ('IN','RETURN') THEN qty
        WHEN movement_type = 'OUT' THEN -qty
        WHEN movement_type = 'ADJ' THEN qty
        ELSE 0
      END
    ), 0) AS on_hand
    FROM inventory_movements
    WHERE warehouse_id = ${warehouseId}
      AND product_id = ${productId}
  `;
  return n(inv?.[0]?.on_hand);
}

export default async function handler(req, res) {
  try {
    const method = req.method || "GET";
    const sql = getSql();
    const warehouseId = 1;

    // -------------------------
    // GET /api/sales?clientId=...
    // Returns transactions (header) with items summary
    // -------------------------
    if (method === "GET") {
      const auth = await requireUserFromReq(req, res);
      if (!auth) return;

      const url = new URL(req.url, "http://localhost");
      const clientId = n(url.searchParams.get("clientId")) || null;

      const txns = await sql`
        SELECT
          t.id,
          t.sale_date,
          t.client_id,
          c.name AS client_name,
          t.salesperson_id,
          COALESCE(sp.first_name, '') AS salesperson_first_name,
          COALESCE(sp.last_name, '') AS salesperson_last_name,
          t.total_jod,
          t.notes,
          t.created_at
        FROM sales_transactions t
        JOIN clients c ON c.id = t.client_id
        LEFT JOIN salespersons sp ON sp.id = t.salesperson_id
        WHERE ${clientId ? sql`t.client_id = ${clientId}` : sql`TRUE`}
        ORDER BY t.sale_date DESC, t.id DESC
      `;

      const ids = (txns || []).map((r) => r.id);
      let itemsByTxn = new Map();

      if (ids.length) {
        const items = await sql`
          SELECT
            i.transaction_id,
            i.product_id,
            p.official_name,
            i.qty,
            i.unit_price_jod,
            i.line_total_jod
          FROM sales_items i
          JOIN products p ON p.id = i.product_id
          WHERE i.transaction_id = ANY(${ids})
          ORDER BY i.transaction_id DESC, i.id ASC
        `;

        for (const it of items || []) {
          const arr = itemsByTxn.get(it.transaction_id) || [];
          arr.push({
            productId: it.product_id,
            productName: it.official_name,
            qty: n(it.qty),
            unitPriceJod: Number(it.unit_price_jod),
            lineTotalJod: Number(it.line_total_jod),
          });
          itemsByTxn.set(it.transaction_id, arr);
        }
      }

      const sales = (txns || []).map((r) => ({
        id: r.id,
        saleDate: r.sale_date,
        clientId: r.client_id,
        clientName: r.client_name,
        salespersonId: r.salesperson_id,
        salespersonName: `${r.salesperson_first_name || ""} ${r.salesperson_last_name || ""}`.trim() || "—",
        totalJod: Number(r.total_jod || 0),
        notes: r.notes || "",
        items: itemsByTxn.get(r.id) || [],
      }));

      return send(res, 200, { ok: true, sales });
    }

    // -------------------------
    // POST /api/sales
    // Body:
    // {
    //   clientId, saleDate, salespersonId?, notes?,
    //   items: [{ productId, qty, unitPriceJod }, ...]
    // }
    // -------------------------
    if (method === "POST") {
      const auth = await requireUserFromReq(req, res, { rolesAny: ["main"] });
      if (!auth) return;

      let body;
      try {
        body = await readJson(req);
      } catch {
        return send(res, 400, { ok: false, error: "Invalid JSON body" });
      }

      const clientId = n(body?.clientId);
      const saleDate = toDateOrNull(body?.saleDate);
      const notes = String(body?.notes || "").trim() || null;
      const salespersonIdRaw = body?.salespersonId == null || body?.salespersonId === "" ? null : n(body?.salespersonId);
      const itemsRaw = Array.isArray(body?.items) ? body.items : [];

      if (!clientId || !saleDate) {
        return send(res, 400, { ok: false, error: "clientId and saleDate are required" });
      }
      if (!itemsRaw.length) {
        return send(res, 400, { ok: false, error: "At least one item is required" });
      }

      // Normalize & validate items; merge duplicates by productId (optional but safer)
      const merged = new Map();
      for (const it of itemsRaw) {
        const productId = n(it?.productId);
        const qty = n(it?.qty);
        const unitPriceJod = Number(it?.unitPriceJod);

        if (!productId) return send(res, 400, { ok: false, error: "Invalid item productId" });
        if (!Number.isFinite(qty) || qty <= 0) return send(res, 400, { ok: false, error: "Item qty must be > 0" });
        if (!Number.isFinite(unitPriceJod) || unitPriceJod <= 0) return send(res, 400, { ok: false, error: "Item unitPriceJod must be > 0" });

        const prev = merged.get(productId);
        if (!prev) merged.set(productId, { productId, qty, unitPriceJod });
        else {
          // If same product appears twice, add qty; keep last unit price (or you can enforce same price)
          merged.set(productId, { productId, qty: prev.qty + qty, unitPriceJod });
        }
      }

      const items = Array.from(merged.values()).map((it) => ({
        ...it,
        lineTotalJod: Number((it.qty * it.unitPriceJod).toFixed(3)),
      }));

      const totalJod = Number(items.reduce((sum, it) => sum + it.lineTotalJod, 0).toFixed(3));

      try {
        const result = await sql.begin(async (tx) => {
          const salespersonId = salespersonIdRaw || (await getDefaultSalespersonId(tx));

          // Stock check (per product) inside the transaction
          for (const it of items) {
            const onHand = await getOnHand(tx, warehouseId, it.productId);
            if (it.qty > onHand) {
              const e = new Error("INSUFFICIENT_STOCK");
              e.productId = it.productId;
              e.onHand = onHand;
              throw e;
            }
          }

          // Insert transaction header
          const insTxn = await tx`
            INSERT INTO sales_transactions (client_id, salesperson_id, sale_date, notes, total_jod, created_by)
            VALUES (${clientId}, ${salespersonId}, ${saleDate}, ${notes}, ${totalJod}, ${auth.sub || null})
            RETURNING id
          `;
          const transactionId = insTxn[0].id;

          // Insert items + inventory movements
          for (const it of items) {
            await tx`
              INSERT INTO sales_items (transaction_id, product_id, qty, unit_price_jod, line_total_jod)
              VALUES (${transactionId}, ${it.productId}, ${it.qty}, ${it.unitPriceJod}, ${it.lineTotalJod})
            `;

            await tx`
              INSERT INTO inventory_movements
                (warehouse_id, product_id, batch_id, movement_type, qty, movement_date, note, created_by)
              VALUES
                (${warehouseId}, ${it.productId}, NULL, 'OUT', ${it.qty}, ${saleDate}, ${`Sale txn #${transactionId}`}, ${auth.sub || null})
            `;
          }

          return { transactionId };
        });

        return send(res, 201, { ok: true, transactionId: result.transactionId });
      } catch (err) {
        if (String(err?.message) === "INSUFFICIENT_STOCK") {
          return send(res, 400, {
            ok: false,
            error: `Not enough stock for product ${err.productId}. Available = ${err.onHand ?? 0}`,
          });
        }
        console.error("POST /api/sales failed:", err);
        return send(res, 500, { ok: false, error: "Server error" });
      }
    }

    // -------------------------
    // DELETE /api/sales?id=transactionId
    // Reverses inventory and deletes the transaction
    // -------------------------
    if (method === "DELETE") {
      const auth = await requireUserFromReq(req, res, { rolesAny: ["main"] });
      if (!auth) return;

      const url = new URL(req.url, "http://localhost");
      const id = n(url.searchParams.get("id"));
      if (!id) return send(res, 400, { ok: false, error: "id is required" });

      try {
        await sql.begin(async (tx) => {
          const rows = await tx`
            SELECT id, sale_date
            FROM sales_transactions
            WHERE id = ${id}
            LIMIT 1
          `;
          if (!rows.length) throw new Error("NOT_FOUND");
          const saleDate = rows[0].sale_date;

          const items = await tx`
            SELECT product_id, qty
            FROM sales_items
            WHERE transaction_id = ${id}
            ORDER BY id ASC
          `;

          // Reverse inventory per item
          for (const it of items || []) {
            const productId = it.product_id;
            const qty = n(it.qty);

            if (qty > 0) {
              await tx`
                INSERT INTO inventory_movements
                  (warehouse_id, product_id, batch_id, movement_type, qty, movement_date, note, created_by)
                VALUES
                  (${warehouseId}, ${productId}, NULL, 'ADJ', ${qty}, ${saleDate}, ${`Void sale txn #${id}`}, ${auth.sub || null})
              `;
            }
          }

          // Delete header (cascades to items)
          await tx`DELETE FROM sales_transactions WHERE id = ${id}`;
        });

        return send(res, 200, { ok: true });
      } catch (err) {
        if (String(err?.message) === "NOT_FOUND") {
          return send(res, 404, { ok: false, error: "Sale transaction not found" });
        }
        console.error("DELETE /api/sales failed:", err);
        return send(res, 500, { ok: false, error: "Server error" });
      }
    }

    return send(res, 405, { ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("api/sales error:", err);
    return send(res, 500, { ok: false, error: "Server error" });
  }
}
