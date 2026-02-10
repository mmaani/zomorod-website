// api/sales.js
import { getSql } from "../lib/db.js";
import { requireUserFromReq } from "../lib/requireAuth.js";

let salesItemsSchemaReady = false;

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

function s(v) {
  return String(v ?? "").trim();
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

/* ---------- UoM helpers ---------- */

function normalizeUom(raw) {
  const u = s(raw).toLowerCase();
  if (!u || u === "piece" || u === "pcs" || u === "pc" || u === "unit") return "piece";
  if (u === "dozen" || u === "dz") return "dozen";

  // pack10 / box10 / carton10 / case10 / pack-10 / box_10
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

async function ensureSalesItemsSchema(sql) {
  if (salesItemsSchemaReady) return;

  await sql`ALTER TABLE sales_order_items ADD COLUMN IF NOT EXISTS qty_uom TEXT`;
  await sql`ALTER TABLE sales_order_items ADD COLUMN IF NOT EXISTS qty_uom_multiplier INT`;
  await sql`ALTER TABLE sales_order_items ADD COLUMN IF NOT EXISTS qty_input INT`;
  await sql`ALTER TABLE sales_order_items ADD COLUMN IF NOT EXISTS unit_price_input_jod NUMERIC`;
  await sql`ALTER TABLE sales_order_items ADD COLUMN IF NOT EXISTS unit_price_uom TEXT`;

  await sql`UPDATE sales_order_items SET qty_uom = 'piece' WHERE qty_uom IS NULL`;
  await sql`UPDATE sales_order_items SET qty_uom_multiplier = 1 WHERE qty_uom_multiplier IS NULL`;
  await sql`UPDATE sales_order_items SET qty_input = qty WHERE qty_input IS NULL`;
  await sql`UPDATE sales_order_items SET unit_price_input_jod = unit_price_jod WHERE unit_price_input_jod IS NULL`;
  await sql`UPDATE sales_order_items SET unit_price_uom = 'piece' WHERE unit_price_uom IS NULL`;

  salesItemsSchemaReady = true;
}

export default async function handler(req, res) {
  try {
    const method = req.method || "GET";
    const sql = getSql();
    const warehouseId = 1;

    await ensureSalesItemsSchema(sql);

    // GET /api/sales
    if (method === "GET") {
      const auth = await requireUserFromReq(req, res);
      if (!auth) return;

      const url = new URL(req.url, "http://localhost");
      const clientId = n(url.searchParams.get("clientId")) || null;

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
          COALESCE(t.items_count_units, 0) AS items_count_units,
          COALESCE(t.items_count_pcs, 0) AS items_count_pcs,

          COALESCE(it.items, '[]'::json) AS items,
          o.created_at

        FROM sales_orders o
        JOIN clients c ON c.id = o.client_id
        LEFT JOIN salespersons sp ON sp.id = o.salesperson_id

        LEFT JOIN (
          SELECT
            order_id,
            SUM(qty * unit_price_jod) AS total_jod,
            SUM(COALESCE(qty_input, qty)) AS items_count_units,
            SUM(qty) AS items_count_pcs
          FROM sales_order_items
          GROUP BY order_id
        ) t ON t.order_id = o.id

        LEFT JOIN (
          SELECT
            soi.order_id,
            json_agg(
              json_build_object(
                'product_id', soi.product_id,
                'product_name', p.official_name,

                'qty', soi.qty,
                'unit_price_jod', soi.unit_price_jod,
                'line_total_jod', soi.line_total_jod,

                'qty_input', soi.qty_input,
                'qty_uom', soi.qty_uom,
                'qty_uom_multiplier', soi.qty_uom_multiplier,
                'unit_price_input_jod', soi.unit_price_input_jod,
                'unit_price_uom', soi.unit_price_uom
              )
              ORDER BY soi.id ASC
            ) AS items
          FROM sales_order_items soi
          JOIN products p ON p.id = soi.product_id
          GROUP BY soi.order_id
        ) it ON it.order_id = o.id

        WHERE COALESCE(o.is_void, false) = false
          AND (${clientId}::int IS NULL OR o.client_id = ${clientId})
        ORDER BY o.sale_date DESC, o.id DESC
      `;

      return send(res, 200, { ok: true, sales: rows });
    }

    // POST /api/sales (main)
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

      const salespersonIdInput =
        body?.salespersonId === "" || body?.salespersonId == null
          ? null
          : n(body?.salespersonId);

      const itemsRaw = Array.isArray(body?.items) ? body.items : [];

      const items = itemsRaw
        .map((it) => {
          const productId = n(it?.productId);

          const qtyUom = normalizeUom(it?.qtyUom || "piece");
          const mult = uomMultiplier(qtyUom, it?.customPackSize);

          const qtyInput = Math.floor(n(it?.qty)); // units
          const unitPriceInputJod = n(it?.unitPriceJod); // per unit

          const qtyBase = qtyInput * mult; // pcs
          const unitPricePerPiece = mult > 0 ? unitPriceInputJod / mult : 0;

          return {
            productId,
            qtyUom,
            mult,
            qtyInput,
            unitPriceInputJod,
            qtyBase,
            unitPricePerPiece,
          };
        })
        .filter(
          (it) =>
            it.productId &&
            it.mult > 0 &&
            it.qtyInput > 0 &&
            it.qtyBase > 0 &&
            it.unitPriceInputJod > 0 &&
            it.unitPricePerPiece > 0
        );

      if (!clientId || !saleDate) {
        return send(res, 400, { ok: false, error: "clientId and saleDate are required" });
      }
      if (!items.length) {
        return send(res, 400, { ok: false, error: "At least 1 valid item is required" });
      }

      try {
        const result = await sql.begin(async (tx) => {
          // default salesperson if none provided
          let salespersonId = salespersonIdInput;
          if (!salespersonId) {
            const def = await tx`SELECT id FROM salespersons WHERE is_default = true LIMIT 1`;
            salespersonId = def?.[0]?.id || null;
          }

          // stock check in PCS (base)
          const byProduct = new Map();
          for (const it of items) {
            const prev = byProduct.get(it.productId) || { qtyBase: 0 };
            prev.qtyBase += it.qtyBase;
            byProduct.set(it.productId, prev);
          }

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
            if (agg.qtyBase > onHand) {
              const e = new Error("INSUFFICIENT_STOCK");
              e.productId = productId;
              e.onHand = onHand;
              e.requested = agg.qtyBase;
              throw e;
            }
          }

          // totals
          let total = 0;
          let itemsCountUnits = 0;
          let itemsCountPcs = 0;

          for (const it of items) {
            total += it.qtyInput * it.unitPriceInputJod;
            itemsCountUnits += it.qtyInput;
            itemsCountPcs += it.qtyBase;
          }

          const orderIns = await tx`
            INSERT INTO sales_orders
              (client_id, salesperson_id, sale_date, notes, total_jod, items_count, created_by)
            VALUES
              (${clientId}, ${salespersonId}, ${saleDate}, ${notes}, ${total}, ${itemsCountUnits}, ${auth.sub || null})
            RETURNING id
          `;
          const orderId = orderIns[0].id;

          for (const it of items) {
            const lineTotal = it.qtyInput * it.unitPriceInputJod;

            await tx`
              INSERT INTO sales_order_items
                (
                  order_id, product_id,
                  qty, unit_price_jod, line_total_jod,
                  qty_uom, qty_uom_multiplier, qty_input,
                  unit_price_input_jod, unit_price_uom
                )
              VALUES
                (
                  ${orderId}, ${it.productId},
                  ${it.qtyBase}, ${it.unitPricePerPiece}, ${lineTotal},
                  ${it.qtyUom}, ${it.mult}, ${it.qtyInput},
                  ${it.unitPriceInputJod}, ${it.qtyUom}
                )
            `;

            await tx`
              INSERT INTO inventory_movements
                (warehouse_id, product_id, batch_id, movement_type, qty, movement_date, note, created_by)
              VALUES
                (${warehouseId}, ${it.productId}, NULL, 'OUT', ${it.qtyBase}, ${saleDate}, ${'Sale order #' + orderId}, ${auth.sub || null})
            `;
          }

          return { orderId, total, itemsCountUnits, itemsCountPcs };
        });

        return send(res, 201, { ok: true, ...result });
      } catch (err) {
        if (String(err?.message) === "INSUFFICIENT_STOCK") {
          return send(res, 400, {
            ok: false,
            error: `Not enough stock for product ${err.productId}. Requested=${err.requested} pcs, Available=${err.onHand} pcs`,
          });
        }
        throw err;
      }
    }

    // DELETE /api/sales?id=... (void) main
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

        await tx`
          UPDATE sales_orders
          SET is_void = true, voided_at = now()
          WHERE id = ${id}
        `;

        for (const it of items) {
          await tx`
            INSERT INTO inventory_movements
              (warehouse_id, product_id, batch_id, movement_type, qty, movement_date, note, created_by)
            VALUES
              (${warehouseId}, ${it.product_id}, NULL, 'ADJ', ${it.qty}, ${order[0].sale_date}, ${'Void sale order #' + id}, ${auth.sub || null})
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
    return send(res, 500, {
      ok: false,
      error: "Server error",
      detail: String(err?.message || err),
    });
  }
}
