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

function asDateOrNull(v) {
  const s = String(v || "").trim();
  if (!s) return null;
  // expecting YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
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
    SELECT id FROM salespersons
    WHERE is_default = true
    ORDER BY id ASC
    LIMIT 1
  `;
  if (rows?.length) return rows[0].id;

  const ins = await tx`
    INSERT INTO salespersons (type, first_name, last_name, is_default)
    VALUES ('EXTERNAL', 'Default', 'Salesperson', true)
    RETURNING id
  `;
  return ins[0].id;
}

export default async function handler(req, res) {
  try {
    const method = req.method || "GET";
    const sql = getSql();
    const warehouseId = 1;

    // ---------------------------
    // GET /api/sales?clientId=...
    // returns orders with items + totals + salesperson
    // ---------------------------
    if (method === "GET") {
      const auth = await requireUserFromReq(req, res);
      if (!auth) return;

      const url = new URL(req.url, "http://localhost");
      const clientId = n(url.searchParams.get("clientId")) || null;

      const orders = await sql`
        SELECT
          o.id,
          o.client_id,
          c.name AS client_name,
          o.sale_date,
          o.created_at,
          o.notes,
          sp.id AS salesperson_id,
          sp.first_name AS salesperson_first_name,
          sp.last_name AS salesperson_last_name,
          sp.employee_id AS salesperson_employee_id,
          sp.type AS salesperson_type,

          COALESCE(SUM(i.qty * i.unit_price_jod), 0) AS total_jod

        FROM sales_orders o
        JOIN clients c ON c.id = o.client_id
        JOIN salespersons sp ON sp.id = o.salesperson_id
        LEFT JOIN sales_items i ON i.order_id = o.id

        WHERE ${clientId ? sql`o.client_id = ${clientId}` : sql`TRUE`}
        GROUP BY o.id, c.name, sp.id
        ORDER BY o.sale_date DESC, o.id DESC
      `;

      const items = await sql`
        SELECT
          i.order_id,
          i.id,
          i.product_id,
          p.official_name,
          i.qty,
          i.unit_price_jod,
          (i.qty * i.unit_price_jod) AS line_total_jod
        FROM sales_items i
        JOIN products p ON p.id = i.product_id
        WHERE i.order_id = ANY(${orders.map((o) => o.id)})
        ORDER BY i.order_id DESC, i.id ASC
      `;

      const itemsByOrder = new Map();
      for (const it of items) {
        const arr = itemsByOrder.get(it.order_id) || [];
        arr.push({
          id: it.id,
          productId: it.product_id,
          officialName: it.official_name,
          qty: Number(it.qty),
          unitPriceJod: Number(it.unit_price_jod),
          lineTotalJod: Number(it.line_total_jod),
        });
        itemsByOrder.set(it.order_id, arr);
      }

      const sales = (orders || []).map((o) => ({
        id: o.id,
        clientId: o.client_id,
        clientName: o.client_name,
        saleDate: o.sale_date,
        notes: o.notes || "",
        totalJod: Number(o.total_jod || 0),
        salesperson: {
          id: o.salesperson_id,
          firstName: o.salesperson_first_name,
          lastName: o.salesperson_last_name,
          employeeId: o.salesperson_employee_id || null,
          type: o.salesperson_type,
        },
        items: itemsByOrder.get(o.id) || [],
      }));

      return send(res, 200, { ok: true, sales });
    }

    // ---------------------------
    // POST /api/sales
    // body:
    // {
    //   clientId, saleDate,
    //   salespersonId? (optional),
    //   items: [{ productId, qty, unitPriceJod }],
    //   notes?
    // }
    // ---------------------------
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
      const saleDate = asDateOrNull(body?.saleDate);
      const notes = String(body?.notes || "").trim() || null;

      const salespersonIdRaw = body?.salespersonId;
      const salespersonId = salespersonIdRaw == null || salespersonIdRaw === "" ? null : n(salespersonIdRaw);

      const itemsRaw = Array.isArray(body?.items) ? body.items : [];
      const items = itemsRaw
        .map((it) => ({
          productId: n(it?.productId),
          qty: n(it?.qty),
          unitPriceJod: Number(it?.unitPriceJod),
        }))
        .filter((it) => it.productId && it.qty > 0 && Number.isFinite(it.unitPriceJod));

      if (!clientId) return send(res, 400, { ok: false, error: "clientId is required" });
      if (!saleDate) return send(res, 400, { ok: false, error: "saleDate must be YYYY-MM-DD" });
      if (!items.length) return send(res, 400, { ok: false, error: "items[] is required" });

      // Validate no negative/zero prices
      for (const it of items) {
        if (!(it.qty > 0)) return send(res, 400, { ok: false, error: "Item qty must be > 0" });
        if (!(it.unitPriceJod > 0)) return send(res, 400, { ok: false, error: "Item unitPriceJod must be > 0" });
      }

      try {
        const result = await sql.begin(async (tx) => {
          // Choose salesperson
          const spId = salespersonId || (await getDefaultSalespersonId(tx));

          // For each item: check stock
          for (const it of items) {
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
                AND product_id = ${it.productId}
            `;
            const onHand = n(inv?.[0]?.on_hand);
            if (it.qty > onHand) {
              const e = new Error("INSUFFICIENT_STOCK");
              e.productId = it.productId;
              e.onHand = onHand;
              throw e;
            }
          }

          // Create order
          const ord = await tx`
            INSERT INTO sales_orders (client_id, sale_date, salesperson_id, created_by, notes)
            VALUES (${clientId}, ${saleDate}, ${spId}, ${auth.sub || null}, ${notes})
            RETURNING id
          `;
          const orderId = ord[0].id;

          // Insert items + inventory movements
          for (const it of items) {
            await tx`
              INSERT INTO sales_items (order_id, product_id, qty, unit_price_jod)
              VALUES (${orderId}, ${it.productId}, ${it.qty}, ${it.unitPriceJod})
            `;

            await tx`
              INSERT INTO inventory_movements
                (warehouse_id, product_id, batch_id, movement_type, qty, movement_date, note, created_by)
              VALUES
                (${warehouseId}, ${it.productId}, NULL, 'OUT', ${it.qty}, ${saleDate}, 'Sale', ${auth.sub || null})
            `;
          }

          return { orderId };
        });

        return send(res, 201, { ok: true, orderId: result.orderId });
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

    // ---------------------------
    // DELETE /api/sales?id=...
    // deletes an order and reverses inventory
    // ---------------------------
    if (method === "DELETE") {
      const auth = await requireUserFromReq(req, res, { rolesAny: ["main"] });
      if (!auth) return;

      const url = new URL(req.url, "http://localhost");
      const id = n(url.searchParams.get("id"));
      if (!id) return send(res, 400, { ok: false, error: "id is required" });

      try {
        await sql.begin(async (tx) => {
          const ord = await tx`
            SELECT id, sale_date
            FROM sales_orders
            WHERE id = ${id}
            LIMIT 1
          `;
          if (!ord.length) throw new Error("NOT_FOUND");

          const order = ord[0];

          const lines = await tx`
            SELECT product_id, qty
            FROM sales_items
            WHERE order_id = ${id}
            ORDER BY id ASC
          `;

          // delete order (cascades items)
          await tx`DELETE FROM sales_orders WHERE id = ${id}`;

          // reverse inventory
          for (const l of lines) {
            const qty = n(l.qty);
            if (qty > 0) {
              await tx`
                INSERT INTO inventory_movements
                  (warehouse_id, product_id, batch_id, movement_type, qty, movement_date, note, created_by)
                VALUES
                  (${warehouseId}, ${l.product_id}, NULL, 'ADJ', ${qty}, ${order.sale_date}, 'Void sale', ${auth.sub || null})
              `;
            }
          }
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
    return send(res, 500, { ok: false, error: "Server error" });
  }
}
