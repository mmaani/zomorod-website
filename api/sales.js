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
    SELECT id FROM salespersons
    WHERE is_default = true
    LIMIT 1
  `;
  if (rows?.length) return rows[0].id;

  // Fallback: create one
  const ins = await tx`
    INSERT INTO salespersons (salesperson_type, display_name, is_default)
    VALUES ('external', 'Default / Unknown', true)
    RETURNING id
  `;
  return ins[0].id;
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
    // Returns orders + items + salesperson + totals
    // -------------------------
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
          o.salesperson_id,
          sp.display_name AS salesperson_name,
          o.sale_date,
          o.total_jod,
          o.is_void,
          o.voided_at,
          o.created_at
        FROM sales_orders o
        JOIN clients c ON c.id = o.client_id
        JOIN salespersons sp ON sp.id = o.salesperson_id
        WHERE ${clientId ? sql`o.client_id = ${clientId}` : sql`TRUE`}
        ORDER BY o.sale_date DESC, o.id DESC
        LIMIT 500
      `;

      const orderIds = (orders || []).map((o) => o.id);
      let items = [];
      if (orderIds.length) {
        items = await sql`
          SELECT
            i.id,
            i.sales_order_id,
            i.product_id,
            p.official_name,
            i.qty,
            i.unit_price_jod,
            i.line_total_jod
          FROM sales_order_items i
          JOIN products p ON p.id = i.product_id
          WHERE i.sales_order_id = ANY(${orderIds})
          ORDER BY i.sales_order_id DESC, i.id ASC
        `;
      }

      const itemsByOrder = new Map();
      for (const it of items) {
        const arr = itemsByOrder.get(it.sales_order_id) || [];
        arr.push({
          id: it.id,
          productId: it.product_id,
          productName: it.official_name,
          qty: it.qty,
          unitPriceJod: it.unit_price_jod,
          lineTotalJod: it.line_total_jod,
        });
        itemsByOrder.set(it.sales_order_id, arr);
      }

      const payload = (orders || []).map((o) => ({
        id: o.id,
        clientId: o.client_id,
        clientName: o.client_name,
        salespersonId: o.salesperson_id,
        salespersonName: o.salesperson_name,
        saleDate: String(o.sale_date),
        totalJod: o.total_jod,
        isVoid: !!o.is_void,
        voidedAt: o.voided_at,
        createdAt: o.created_at,
        items: itemsByOrder.get(o.id) || [],
      }));

      return send(res, 200, { ok: true, sales: payload });
    }

    // -------------------------
    // POST /api/sales
    // Body:
    // {
    //   clientId,
    //   salespersonId?,   // optional -> default
    //   saleDate: 'YYYY-MM-DD',
    //   items: [{ productId, qty, unitPriceJod }]
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
      const salespersonIdRaw = body?.salespersonId == null || body?.salespersonId === "" ? null : n(body?.salespersonId);
      const itemsRaw = Array.isArray(body?.items) ? body.items : [];

      if (!clientId) return send(res, 400, { ok: false, error: "clientId is required" });
      if (!saleDate) return send(res, 400, { ok: false, error: "saleDate must be YYYY-MM-DD" });
      if (!itemsRaw.length) return send(res, 400, { ok: false, error: "items[] is required" });

      // Normalize + validate items (and merge duplicates)
      const merged = new Map(); // productId -> { productId, qty, unitPriceJod }
      for (const it of itemsRaw) {
        const productId = n(it?.productId);
        const qty = n(it?.qty);
        const unitPriceJod = Number(it?.unitPriceJod);

        if (!productId) return send(res, 400, { ok: false, error: "Each item must have productId" });
        if (!Number.isFinite(qty) || qty <= 0) return send(res, 400, { ok: false, error: "Each item qty must be > 0" });
        if (!Number.isFinite(unitPriceJod) || unitPriceJod <= 0) {
          return send(res, 400, { ok: false, error: "Each item unitPriceJod must be > 0" });
        }

        const prev = merged.get(productId);
        if (!prev) {
          merged.set(productId, { productId, qty, unitPriceJod });
        } else {
          // If duplicate product lines: add qty.
          // Keep the latest unit price (or you can enforce same price)
          merged.set(productId, { productId, qty: prev.qty + qty, unitPriceJod });
        }
      }

      const items = Array.from(merged.values());

      try {
        const out = await sql.begin(async (tx) => {
          // Resolve salesperson (default if missing)
          let salespersonId = salespersonIdRaw;
          if (!salespersonId) salespersonId = await getDefaultSalespersonId(tx);

          // Validate salesperson exists
          const sp = await tx`SELECT id FROM salespersons WHERE id = ${salespersonId} LIMIT 1`;
          if (!sp.length) {
            const e = new Error("SALESPERSON_NOT_FOUND");
            throw e;
          }

          // Stock validation: check each product; if multiple items, we use merged qty per product
          const onHandByProduct = new Map();
          for (const it of items) {
            const onHand = await getOnHand(tx, warehouseId, it.productId);
            onHandByProduct.set(it.productId, onHand);
            if (it.qty > onHand) {
              const e = new Error("INSUFFICIENT_STOCK");
              e.productId = it.productId;
              e.onHand = onHand;
              e.requested = it.qty;
              throw e;
            }
          }

          // Create order
          const orderIns = await tx`
            INSERT INTO sales_orders (client_id, salesperson_id, sale_date, total_jod, created_by)
            VALUES (${clientId}, ${salespersonId}, ${saleDate}, 0, ${auth.sub || null})
            RETURNING id
          `;
          const salesOrderId = orderIns[0].id;

          // Insert items + movements, compute totals
          let total = 0;
          for (const it of items) {
            const lineTotal = Number((it.qty * it.unitPriceJod).toFixed(3));
            total += lineTotal;

            await tx`
              INSERT INTO sales_order_items (sales_order_id, product_id, qty, unit_price_jod, line_total_jod)
              VALUES (${salesOrderId}, ${it.productId}, ${it.qty}, ${it.unitPriceJod}, ${lineTotal})
            `;

            await tx`
              INSERT INTO inventory_movements (warehouse_id, product_id, batch_id, movement_type, qty, movement_date, note, created_by)
              VALUES (${warehouseId}, ${it.productId}, NULL, 'OUT', ${it.qty}, ${saleDate}, ${"Sale #" + salesOrderId}, ${auth.sub || null})
            `;
          }

          await tx`
            UPDATE sales_orders
            SET total_jod = ${Number(total.toFixed(3))}
            WHERE id = ${salesOrderId}
          `;

          return { salesOrderId, total: Number(total.toFixed(3)) };
        });

        return send(res, 201, { ok: true, salesOrderId: out.salesOrderId, totalJod: out.total });
      } catch (err) {
        if (String(err?.message) === "INSUFFICIENT_STOCK") {
          return send(res, 400, {
            ok: false,
            error: `Not enough stock for productId=${err.productId}. Requested=${err.requested}, Available=${err.onHand}`,
          });
        }
        if (String(err?.message) === "SALESPERSON_NOT_FOUND") {
          return send(res, 400, { ok: false, error: "Salesperson not found" });
        }
        console.error("POST /api/sales error:", err);
        return send(res, 500, { ok: false, error: "Server error" });
      }
    }

    // -------------------------
    // DELETE /api/sales?id=...
    // We VOID the order (do not delete), and reverse inventory with ADJ
    // -------------------------
    if (method === "DELETE") {
      const auth = await requireUserFromReq(req, res, { rolesAny: ["main"] });
      if (!auth) return;

      const url = new URL(req.url, "http://localhost");
      const id = n(url.searchParams.get("id"));
      if (!id) return send(res, 400, { ok: false, error: "id is required" });

      try {
        await sql.begin(async (tx) => {
          const o = await tx`
            SELECT id, sale_date, is_void
            FROM sales_orders
            WHERE id = ${id}
            LIMIT 1
          `;
          if (!o.length) {
            const e = new Error("NOT_FOUND");
            throw e;
          }
          if (o[0].is_void) {
            const e = new Error("ALREADY_VOID");
            throw e;
          }

          const items = await tx`
            SELECT product_id, qty
            FROM sales_order_items
            WHERE sales_order_id = ${id}
            ORDER BY id ASC
          `;

          await tx`
            UPDATE sales_orders
            SET is_void = true, voided_at = now()
            WHERE id = ${id}
          `;

          for (const it of items) {
            await tx`
              INSERT INTO inventory_movements (warehouse_id, product_id, batch_id, movement_type, qty, movement_date, note, created_by)
              VALUES (${warehouseId}, ${it.product_id}, NULL, 'ADJ', ${it.qty}, ${String(o[0].sale_date)}, ${"Void Sale #" + id}, ${auth.sub || null})
            `;
          }
        });

        return send(res, 200, { ok: true });
      } catch (err) {
        if (String(err?.message) === "NOT_FOUND") {
          return send(res, 404, { ok: false, error: "Sale not found" });
        }
        if (String(err?.message) === "ALREADY_VOID") {
          return send(res, 400, { ok: false, error: "Sale already voided" });
        }
        console.error("DELETE /api/sales error:", err);
        return send(res, 500, { ok: false, error: "Server error" });
      }
    }

    return send(res, 405, { ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("api/sales crashed:", err);
    return send(res, 500, { ok: false, error: "Server error" });
  }
}
