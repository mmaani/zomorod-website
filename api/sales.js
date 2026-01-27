import { getSql } from "../lib/db.js";
import { requireUserFromReq } from "../lib/requireAuth.js";

/**
 * Sales API handler (Node/Vercel).
 * Supports:
 *  - GET    /api/sales?clientId=...
 *  - POST   /api/sales        (blocks overselling)
 *  - DELETE /api/sales?id=...
 */

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
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

async function getOnHandQty(tx, productId) {
  const rows = await tx`
    SELECT COALESCE((
      SELECT SUM(
        CASE
          WHEN m.movement_type IN ('IN','RETURN') THEN m.qty
          WHEN m.movement_type = 'ADJ' THEN m.qty
          WHEN m.movement_type = 'OUT' THEN -m.qty
          ELSE 0
        END
      )
      FROM inventory_movements m
      WHERE m.product_id = ${productId}
    ), 0) AS on_hand_qty
  `;
  return n(rows?.[0]?.on_hand_qty);
}

export default async function handler(req, res) {
  try {
    const method = req.method || "GET";
    const sql = getSql();

    // ---------------- GET /api/sales ----------------
    if (method === "GET") {
      const auth = await requireUserFromReq(req, res);
      if (!auth) return;

      const url = new URL(req.url, "http://localhost");
      const clientId = n(url.searchParams.get("clientId")) || null;

      const rows = await sql`
        SELECT
          s.id,
          s.client_id,
          c.name AS client_name,
          s.product_id,
          p.official_name,
          s.qty,
          s.unit_price_jod,
          s.sale_date
        FROM sales s
        JOIN clients c ON c.id = s.client_id
        JOIN products p ON p.id = s.product_id
        WHERE (${clientId}::int IS NULL OR s.client_id = ${clientId})
        ORDER BY s.sale_date DESC, s.id DESC
      `;

      return send(res, 200, { ok: true, sales: rows });
    }

    // ---------------- POST /api/sales ----------------
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
      const productId = n(body?.productId);
      const qty = n(body?.qty);
      const unitPriceJod = Number(body?.unitPriceJod);
      const saleDate = toDateOrNull(body?.saleDate);

      if (!clientId || !productId || !saleDate) {
        return send(res, 400, { ok: false, error: "clientId, productId, saleDate are required" });
      }
      if (!Number.isFinite(qty) || qty <= 0) {
        return send(res, 400, { ok: false, error: "qty must be > 0" });
      }
      if (!Number.isFinite(unitPriceJod) || unitPriceJod <= 0) {
        return send(res, 400, { ok: false, error: "unitPriceJod must be > 0" });
      }

      try {
        await sql.begin(async (tx) => {
          // Lock the product row so concurrent sales don't oversell.
          const p = await tx`
            SELECT id
            FROM products
            WHERE id = ${productId}
            FOR UPDATE
          `;
          if (!p.length) {
            const e = new Error("PRODUCT_NOT_FOUND");
            throw e;
          }

          const onHand = await getOnHandQty(tx, productId);
          if (qty > onHand) {
            const e = new Error("INSUFFICIENT_STOCK");
            e.detail = { onHand };
            throw e;
          }

          const sale = await tx`
            INSERT INTO sales (client_id, product_id, qty, unit_price_jod, sale_date)
            VALUES (${clientId}, ${productId}, ${qty}, ${unitPriceJod}, ${saleDate})
            RETURNING id
          `;
          const saleId = sale?.[0]?.id;

          // Record inventory movement (OUT) - batch_id is NULL here
          await tx`
            INSERT INTO inventory_movements (
              warehouse_id, product_id, batch_id, movement_type, qty, movement_date, note, created_by
            )
            VALUES (
              1, ${productId}, NULL, 'OUT', ${qty}, ${saleDate}, ${`Sale #${saleId}`}, ${auth?.sub ?? null}
            )
          `;
        });

        return send(res, 201, { ok: true });
      } catch (err) {
        if (String(err?.message) === "PRODUCT_NOT_FOUND") {
          return send(res, 404, { ok: false, error: "Product not found" });
        }
        if (String(err?.message) === "INSUFFICIENT_STOCK") {
          const onHand = err?.detail?.onHand;
          return send(res, 400, {
            ok: false,
            error: `Insufficient stock. On-hand = ${Number.isFinite(onHand) ? onHand : "?"}`,
          });
        }
        console.error("POST /api/sales failed:", err);
        return send(res, 500, { ok: false, error: "Server error" });
      }
    }

    // ---------------- DELETE /api/sales?id=... ----------------
    if (method === "DELETE") {
      const auth = await requireUserFromReq(req, res, { rolesAny: ["main"] });
      if (!auth) return;

      const url = new URL(req.url, "http://localhost");
      const id = n(url.searchParams.get("id"));
      if (!id) return send(res, 400, { ok: false, error: "id is required" });

      try {
        await sql.begin(async (tx) => {
          const rows = await tx`
            SELECT id, product_id, qty, sale_date
            FROM sales
            WHERE id = ${id}
            LIMIT 1
          `;
          if (!rows.length) {
            const e = new Error("NOT_FOUND");
            throw e;
          }

          const sale = rows[0];

          // Lock product row to serialize with other movements/sales
          await tx`
            SELECT id
            FROM products
            WHERE id = ${sale.product_id}
            FOR UPDATE
          `;

          await tx`DELETE FROM sales WHERE id = ${id}`;

          // Reverse the inventory movement (ADJ +qty)
          await tx`
            INSERT INTO inventory_movements (
              warehouse_id, product_id, batch_id, movement_type, qty, movement_date, note, created_by
            )
            VALUES (
              1, ${sale.product_id}, NULL, 'ADJ', ${n(sale.qty)}, ${sale.sale_date}, 'Void sale (restore stock)', ${auth?.sub ?? null}
            )
          `;
        });

        return send(res, 200, { ok: true });
      } catch (err) {
        if (String(err?.message) === "NOT_FOUND") {
          return send(res, 404, { ok: false, error: "Sale not found" });
        }
        console.error("DELETE /api/sales failed:", err);
        return send(res, 500, { ok: false, error: "Server error" });
      }
    }

    return send(res, 405, { ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("api/sales error:", err);
    return send(res, 500, { ok: false, error: "Server error", detail: String(err?.message || err) });
  }
}
