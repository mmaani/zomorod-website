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

async function readJson(req) {
  let body = req.body;
  if (typeof body === "string") {
    try { return JSON.parse(body); } catch { throw new Error("Invalid JSON body"); }
  }
  if (body && typeof body === "object") return body;

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { throw new Error("Invalid JSON body"); }
}

function toISODateOrThrow(s) {
  const v = String(s || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error("BAD_DATE");
  return v;
}

export default async function handler(req, res) {
  const sql = getSql();
  const method = req.method || "GET";
  const warehouseId = 1;

  try {
    // =========================
    // GET /api/sales?clientId=...
    // =========================
    if (method === "GET") {
      const auth = await requireUserFromReq(req, res);
      if (!auth) return;

      const url = new URL(req.url, "http://localhost");
      const clientId = n(url.searchParams.get("clientId")) || null;

      const rows = await sql`
        SELECT
          st.id,
          st.client_id,
          c.name AS client_name,
          st.sale_date,
          st.total_jod,
          st.salesperson_user_id,
          st.salesperson_employee_id,
          st.salesperson_first_name,
          st.salesperson_last_name,
          st.is_void,
          st.created_at,

          COALESCE((
            SELECT json_agg(json_build_object(
              'id', si.id,
              'productId', si.product_id,
              'productName', p.official_name,
              'qty', si.qty,
              'unitPriceJod', si.unit_price_jod,
              'lineTotalJod', (si.qty * si.unit_price_jod)
            ) ORDER BY si.id ASC)
            FROM sales_items si
            JOIN products p ON p.id = si.product_id
            WHERE si.sale_id = st.id
          ), '[]'::json) AS items

        FROM sales_transactions st
        JOIN clients c ON c.id = st.client_id
        WHERE COALESCE(st.is_void, false) = false
          AND ${clientId ? sql`st.client_id = ${clientId}` : sql`TRUE`}
        ORDER BY st.sale_date DESC, st.id DESC
      `;

      return send(res, 200, { ok: true, sales: rows });
    }

    // =========================
    // POST /api/sales
    // body: { clientId, saleDate, items:[{productId, qty, unitPriceJod}] }
    // =========================
    if (method === "POST") {
      const auth = await requireUserFromReq(req, res, { rolesAny: ["main"] });
      if (!auth) return;

      let body;
      try { body = await readJson(req); }
      catch { return send(res, 400, { ok: false, error: "Invalid JSON body" }); }

      const clientId = n(body?.clientId);
      let saleDate;
      try { saleDate = toISODateOrThrow(body?.saleDate); }
      catch (e) {
        if (String(e?.message) === "BAD_DATE") {
          return send(res, 400, { ok: false, error: "saleDate must be YYYY-MM-DD" });
        }
        return send(res, 400, { ok: false, error: "Invalid saleDate" });
      }

      const items = Array.isArray(body?.items) ? body.items : [];
      if (!clientId) return send(res, 400, { ok: false, error: "clientId is required" });
      if (!items.length) return send(res, 400, { ok: false, error: "items are required" });

      // Normalize + validate items
      const normItems = items
        .map((it) => ({
          productId: n(it?.productId),
          qty: n(it?.qty),
          unitPriceJod: Number(it?.unitPriceJod),
        }))
        .filter((it) => it.productId && it.qty > 0);

      if (!normItems.length) {
        return send(res, 400, { ok: false, error: "No valid sale items" });
      }
      for (const it of normItems) {
        if (!Number.isFinite(it.unitPriceJod) || it.unitPriceJod <= 0) {
          return send(res, 400, { ok: false, error: "unitPriceJod must be > 0" });
        }
      }

      // If same product appears multiple times, combine it
      const merged = new Map();
      for (const it of normItems) {
        const key = String(it.productId);
        const prev = merged.get(key);
        if (!prev) merged.set(key, { ...it });
        else merged.set(key, { ...prev, qty: prev.qty + it.qty }); // keep price from first line (UI should keep consistent)
      }
      const mergedItems = Array.from(merged.values());

      // Salesperson snapshot fields
      const salespersonUserId = auth.sub || null;
      const fullName = String(auth.fullName || "").trim(); // if your requireAuth provides it
      const email = String(auth.email || "").trim();
      const display = fullName || email || null;

      // Split first/last if possible (optional)
      const parts = display ? display.split(/\s+/).filter(Boolean) : [];
      const firstName = parts.length ? parts[0] : null;
      const lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;

      try {
        const result = await sql.begin(async (tx) => {
          // Stock check for each product (transaction-safe)
          for (const it of mergedItems) {
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
              e.requested = it.qty;
              throw e;
            }
          }

          // Compute total
          const totalJod = mergedItems.reduce((sum, it) => sum + (it.qty * it.unitPriceJod), 0);

          // Insert sale header
          const saleHeader = await tx`
            INSERT INTO sales_transactions (
              client_id, sale_date, total_jod,
              salesperson_user_id, salesperson_first_name, salesperson_last_name
            )
            VALUES (
              ${clientId}, ${saleDate}, ${totalJod},
              ${salespersonUserId}, ${firstName}, ${lastName}
            )
            RETURNING id
          `;
          const saleId = saleHeader[0].id;

          // Insert items + inventory movements
          for (const it of normItems) {
            await tx`
              INSERT INTO sales_items (sale_id, product_id, qty, unit_price_jod)
              VALUES (${saleId}, ${it.productId}, ${it.qty}, ${it.unitPriceJod})
            `;

            await tx`
              INSERT INTO inventory_movements (
                warehouse_id, product_id, batch_id, movement_type, qty, movement_date, note, created_by
              )
              VALUES (
                ${warehouseId}, ${it.productId}, NULL, 'OUT', ${it.qty}, ${saleDate},
                ${"Sale #" + saleId}, ${salespersonUserId}
              )
            `;
          }

          return { saleId };
        });

        return send(res, 201, { ok: true, saleId: result.saleId });
      } catch (err) {
        if (String(err?.message) === "INSUFFICIENT_STOCK") {
          return send(res, 400, {
            ok: false,
            error: `Not enough stock for product ${err.productId}. Available = ${err.onHand ?? 0}, requested = ${err.requested ?? 0}`,
          });
        }
        console.error("POST /api/sales failed:", err);
        return send(res, 500, { ok: false, error: "Server error" });
      }
    }

    // =========================
    // DELETE /api/sales?id=...
    // Soft-void + reverse inventory
    // =========================
    if (method === "DELETE") {
      const auth = await requireUserFromReq(req, res, { rolesAny: ["main"] });
      if (!auth) return;

      const url = new URL(req.url, "http://localhost");
      const id = n(url.searchParams.get("id"));
      if (!id) return send(res, 400, { ok: false, error: "id is required" });

      const userId = auth.sub || null;

      try {
        await sql.begin(async (tx) => {
          const txRows = await tx`
            SELECT id, sale_date, is_void
            FROM sales_transactions
            WHERE id = ${id}
            LIMIT 1
          `;
          if (!txRows.length) throw new Error("NOT_FOUND");
          if (txRows[0].is_void) return;

          const items = await tx`
            SELECT product_id, qty
            FROM sales_items
            WHERE sale_id = ${id}
            ORDER BY id ASC
          `;

          // Mark void
          await tx`
            UPDATE sales_transactions
            SET is_void = true, voided_at = now()
            WHERE id = ${id}
          `;

          // Reverse inventory per item
          for (const it of items) {
            await tx`
              INSERT INTO inventory_movements (
                warehouse_id, product_id, batch_id, movement_type, qty, movement_date, note, created_by
              )
              VALUES (
                ${warehouseId}, ${it.product_id}, NULL, 'ADJ', ${it.qty}, ${txRows[0].sale_date},
                ${"Void sale #" + id}, ${userId}
              )
            `;
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
