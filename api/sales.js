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

function s(v) {
  const x = String(v ?? "").trim();
  return x;
}

async function readJson(req) {
  let body = req.body;
  if (typeof body === "string") {
    try {
      return JSON.parse(body || "{}");
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

export default async function handler(req, res) {
  try {
    const method = req.method || "GET";
    const sql = getSql();
    const warehouseId = 1;

    // GET /api/sales  (list transactions + items)
    if (method === "GET") {
      const auth = await requireUserFromReq(req, res);
      if (!auth) return;

      const url = new URL(req.url, "http://localhost");
      const clientId = n(url.searchParams.get("clientId")) || null;

      // Optional limit (defaults high so you can scroll older ones)
      const limit = Math.max(1, Math.min(500, n(url.searchParams.get("limit")) || 200));

      const rows = await sql`
        SELECT
          o.id,
          o.client_id,
          c.name AS client_name,
          o.salesperson_id,
          sp.display_name AS salesperson_name,
          o.sale_date,
          o.notes,
          COALESCE(t.total_jod, 0) AS total_jod,
          COALESCE(t.items_count, 0) AS items_count,
          COALESCE(t.items, '[]'::json) AS items,
          o.created_at
        FROM sales_orders o
        JOIN clients c ON c.id = o.client_id
        LEFT JOIN salespersons sp ON sp.id = o.salesperson_id

        -- LATERAL subquery: aggregates items + totals per order
        LEFT JOIN LATERAL (
          SELECT
            SUM(i.qty * i.unit_price_jod) AS total_jod,
            SUM(i.qty) AS items_count,
            json_agg(
              json_build_object(
                'productId', i.product_id,
                'product_name', COALESCE(p.official_name, p.name, ('Product #' || i.product_id::text)),
                'qty', i.qty,
                'unit_price_jod', i.unit_price_jod
              )
              ORDER BY i.id ASC
            ) AS items
          FROM sales_order_items i
          JOIN products p ON p.id = i.product_id
          WHERE i.order_id = o.id
        ) t ON true

        WHERE COALESCE(o.is_void, false) = false
          AND (${clientId}::int IS NULL OR o.client_id = ${clientId})
        ORDER BY o.sale_date DESC, o.id DESC
        LIMIT ${limit}
      `;

      return send(res, 200, { ok: true, sales: rows });
    }

    // POST /api/sales  (create transaction)  main only
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
      const saleDate = s(body?.saleDate);
      const notes = s(body?.notes) || null;

      // salesperson: allow null; if missing use default salesperson
      const salespersonIdInput =
        body?.salespersonId === "" || body?.salespersonId == null ? null : n(body?.salespersonId);

      const itemsRaw = Array.isArray(body?.items) ? body.items : [];
      const items = itemsRaw
        .map((it) => ({
          productId: n(it?.productId),
          qty: Math.floor(n(it?.qty)),
          unitPriceJod: n(it?.unitPriceJod),
        }))
        .filter((it) => it.productId && it.qty > 0 && it.unitPriceJod > 0);

      if (!clientId || !saleDate) {
        return send(res, 400, { ok: false, error: "clientId and saleDate are required" });
      }
      if (!items.length) {
        return send(res, 400, { ok: false, error: "At least 1 item is required" });
      }

      try {
        const result = await sql.begin(async (tx) => {
          // find default salesperson if none provided
          let salespersonId = salespersonIdInput;
          if (!salespersonId) {
            const def = await tx`SELECT id FROM salespersons WHERE is_default = true LIMIT 1`;
            salespersonId = def?.[0]?.id || null;
          }

          // Stock check per product (aggregate if the same product appears multiple times)
          const byProduct = new Map();
          for (const it of items) {
            const prev = byProduct.get(it.productId) || { qty: 0, lines: [] };
            prev.qty += it.qty;
            prev.lines.push(it);
            byProduct.set(it.productId, prev);
          }

          // Check each product on-hand
          for (const [productId, agg] of byProduct.entries()) {
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
            const onHand = n(inv?.[0]?.on_hand);
            if (agg.qty > onHand) {
              const e = new Error("INSUFFICIENT_STOCK");
              e.productId = productId;
              e.onHand = onHand;
              e.requested = agg.qty;
              throw e;
            }
          }

          // compute totals
          let total = 0;
          for (const it of items) total += it.qty * it.unitPriceJod;
          const itemsCount = items.length;

          // create order header
          const orderIns = await tx`
            INSERT INTO sales_orders
              (client_id, salesperson_id, sale_date, notes, total_jod, items_count, created_by)
            VALUES
              (${clientId}, ${salespersonId}, ${saleDate}, ${notes}, ${total}, ${itemsCount}, ${auth.sub || null})
            RETURNING id
          `;
          const orderId = orderIns[0].id;

          // insert items + inventory movements
          for (const it of items) {
            const lineTotal = it.qty * it.unitPriceJod;

            await tx`
              INSERT INTO sales_order_items
                (order_id, product_id, qty, unit_price_jod, line_total_jod)
              VALUES
                (${orderId}, ${it.productId}, ${it.qty}, ${it.unitPriceJod}, ${lineTotal})
            `;

            await tx`
              INSERT INTO inventory_movements
                (warehouse_id, product_id, batch_id, movement_type, qty, movement_date, note, created_by)
              VALUES
                (${warehouseId}, ${it.productId}, NULL, 'OUT', ${it.qty}, ${saleDate}, ${"Sale order #" + orderId}, ${auth.sub || null})
            `;
          }

          return { orderId, total, itemsCount };
        });

        return send(res, 201, { ok: true, ...result });
      } catch (err) {
        if (String(err?.message) === "INSUFFICIENT_STOCK") {
          return send(res, 400, {
            ok: false,
            error: `Not enough stock for product ${err.productId}. Requested = ${err.requested}, Available = ${err.onHand}`,
          });
        }
        throw err;
      }
    }

    // DELETE /api/sales?id=...  (void transaction) main only
    if (method === "DELETE") {
      const auth = await requireUserFromReq(req, res, { rolesAny: ["main"] });
      if (!auth) return;

      const url = new URL(req.url, "http://localhost");
      const id = n(url.searchParams.get("id"));
      if (!id) return send(res, 400, { ok: false, error: "id is required" });

      await sql.begin(async (tx) => {
        const order = await tx`
          SELECT id, sale_date, is_void
          FROM sales_orders
          WHERE id = ${id}
          LIMIT 1
        `;
        if (!order.length) throw new Error("NOT_FOUND");
        if (order[0].is_void) return;

        const items = await tx`
          SELECT product_id, qty
          FROM sales_order_items
          WHERE order_id = ${id}
        `;

        // mark void
        await tx`UPDATE sales_orders SET is_void = true, voided_at = now(), updated_at = now() WHERE id = ${id}`;

        // reverse inventory
        for (const it of items) {
          await tx`
            INSERT INTO inventory_movements
              (warehouse_id, product_id, batch_id, movement_type, qty, movement_date, note, created_by)
            VALUES
              (${warehouseId}, ${it.product_id}, NULL, 'ADJ', ${it.qty}, ${order[0].sale_date}, ${"Void sale order #" + id}, ${auth.sub || null})
          `;
        }
      });

      return send(res, 200, { ok: true });
    }

    return send(res, 405, { ok: false, error: "Method not allowed" });
  } catch (err) {
    if (String(err?.message) === "NOT_FOUND") {
      return send(res, 404, { ok: false, error: "Sale not found" });
    }
    console.error("api/sales error:", err);
    return send(res, 500, { ok: false, error: "Server error", detail: String(err?.message || err) });
  }
}
