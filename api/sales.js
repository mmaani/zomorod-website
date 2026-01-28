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

async function getDefaultSalespersonId(tx) {
  const rows = await tx`
    SELECT id
    FROM salespersons
    WHERE is_default = true
    LIMIT 1
  `;
  return rows?.[0]?.id || null;
}

async function computeOnHand(tx, warehouseId, productId) {
  const rows = await tx`
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
  return n(rows?.[0]?.on_hand);
}

export default async function handler(req, res) {
  const sql = getSql();
  const method = req.method || "GET";
  const warehouseId = 1;

  try {
    // ---------------------------
    // GET /api/sales
    // Returns NEW transactions + LEGACY single-line sales
    // ---------------------------
    if (method === "GET") {
      const auth = await requireUserFromReq(req, res);
      if (!auth) return;

      const url = new URL(req.url, "http://localhost");
      const clientId = n(url.searchParams.get("clientId")) || null;

      // New transactions
      const txRows = await sql`
        SELECT
          t.id,
          t.sale_date,
          t.client_id,
          c.name AS client_name,
          t.salesperson_id,
          sp.full_name AS salesperson_name,
          t.notes,
          t.total_jod,
          t.is_void,
          t.created_at,
          u.full_name AS created_by_name,
          u.email AS created_by_email,

          COALESCE((
            SELECT json_agg(json_build_object(
              'productId', i.product_id,
              'officialName', p.official_name,
              'qty', i.qty,
              'unitPriceJod', i.unit_price_jod,
              'lineTotalJod', i.line_total_jod
            ) ORDER BY i.id)
            FROM sales_transaction_items i
            JOIN products p ON p.id = i.product_id
            WHERE i.transaction_id = t.id
          ), '[]'::json) AS items,

          (SELECT COALESCE(SUM(i.qty),0) FROM sales_transaction_items i WHERE i.transaction_id = t.id) AS items_count
        FROM sales_transactions t
        JOIN clients c ON c.id = t.client_id
        LEFT JOIN salespersons sp ON sp.id = t.salesperson_id
        LEFT JOIN users u ON u.id = t.created_by
        WHERE ${clientId ? sql`t.client_id = ${clientId}` : sql`TRUE`}
        ORDER BY t.sale_date DESC, t.id DESC
      `;

      // Legacy sales (old table) -> mapped as single-item "transaction"
      const legacyRows = await sql`
        SELECT
          s.id,
          s.sale_date,
          s.client_id,
          c.name AS client_name,
          NULL::int AS salesperson_id,
          'Legacy'::text AS salesperson_name,
          NULL::text AS notes,
          (s.qty * s.unit_price_jod)::numeric(14,3) AS total_jod,
          false AS is_void,
          s.sale_date::timestamptz AS created_at,
          NULL::text AS created_by_name,
          NULL::text AS created_by_email,
          json_build_array(json_build_object(
            'productId', s.product_id,
            'officialName', p.official_name,
            'qty', s.qty,
            'unitPriceJod', s.unit_price_jod,
            'lineTotalJod', (s.qty * s.unit_price_jod)::numeric(14,3)
          )) AS items,
          s.qty AS items_count,
          true AS is_legacy
        FROM sales s
        JOIN clients c ON c.id = s.client_id
        JOIN products p ON p.id = s.product_id
        WHERE ${clientId ? sql`s.client_id = ${clientId}` : sql`TRUE`}
        ORDER BY s.sale_date DESC, s.id DESC
      `;

      // Merge + sort (new first by date/id; legacy included)
      const merged = [...(txRows || []), ...(legacyRows || [])].sort((a, b) => {
        const da = new Date(a.sale_date).getTime();
        const db = new Date(b.sale_date).getTime();
        if (db !== da) return db - da;
        return (b.id || 0) - (a.id || 0);
      });

      return send(res, 200, { ok: true, sales: merged });
    }

    // ---------------------------
    // POST /api/sales (Transaction)
    // body: { clientId, saleDate, salespersonId?, notes?, items:[{productId, qty, unitPriceJod}] }
    // ---------------------------
    if (method === "POST") {
      const auth = await requireUserFromReq(req, res, { rolesAny: ["main"] });
      if (!auth) return;

      let body;
      try { body = await readJson(req); }
      catch { return send(res, 400, { ok: false, error: "Invalid JSON body" }); }

      const clientId = n(body?.clientId);
      const saleDate = String(body?.saleDate || "").trim(); // expected YYYY-MM-DD from input[type=date]
      const notes = String(body?.notes || "").trim() || null;

      const items = Array.isArray(body?.items) ? body.items : [];
      const salespersonIdInput = body?.salespersonId === "" || body?.salespersonId == null ? null : n(body.salespersonId);

      if (!clientId || !saleDate) return send(res, 400, { ok: false, error: "clientId and saleDate are required" });
      if (!items.length) return send(res, 400, { ok: false, error: "At least one item is required" });

      // Normalize & validate items
      const norm = items
        .map((it) => ({
          productId: n(it?.productId),
          qty: Math.floor(n(it?.qty)),
          unitPriceJod: Number(it?.unitPriceJod),
        }))
        .filter((it) => it.productId);

      if (!norm.length) return send(res, 400, { ok: false, error: "Invalid items list" });

      for (const it of norm) {
        if (!Number.isFinite(it.qty) || it.qty <= 0) {
          return send(res, 400, { ok: false, error: "Each item qty must be > 0" });
        }
        if (!Number.isFinite(it.unitPriceJod) || it.unitPriceJod <= 0) {
          return send(res, 400, { ok: false, error: "Each item unitPriceJod must be > 0" });
        }
      }

      const result = await sql.begin(async (tx) => {
        const salespersonId = salespersonIdInput || (await getDefaultSalespersonId(tx));
        if (!salespersonId) {
          throw new Error("NO_DEFAULT_SALESPERSON");
        }

        // Stock check per product (aggregate qty per product)
        const qtyByProduct = new Map();
        for (const it of norm) {
          qtyByProduct.set(it.productId, (qtyByProduct.get(it.productId) || 0) + it.qty);
        }

        for (const [pid, totalQty] of qtyByProduct.entries()) {
          const onHand = await computeOnHand(tx, warehouseId, pid);
          if (totalQty > onHand) {
            const e = new Error("INSUFFICIENT_STOCK");
            e.productId = pid;
            e.onHand = onHand;
            e.requested = totalQty;
            throw e;
          }
        }

        // Insert transaction header
        const header = await tx`
          INSERT INTO sales_transactions (client_id, salesperson_id, sale_date, notes, total_jod, created_by)
          VALUES (${clientId}, ${salespersonId}, ${saleDate}::date, ${notes}, 0, ${auth.sub || null})
          RETURNING id
        `;
        const transactionId = header[0].id;

        // Insert lines + movements
        let total = 0;
        for (const it of norm) {
          const lineTotal = Number((it.qty * it.unitPriceJod).toFixed(3));
          total += lineTotal;

          await tx`
            INSERT INTO sales_transaction_items (transaction_id, product_id, qty, unit_price_jod, line_total_jod)
            VALUES (${transactionId}, ${it.productId}, ${it.qty}, ${it.unitPriceJod}, ${lineTotal})
          `;

          await tx`
            INSERT INTO inventory_movements (warehouse_id, product_id, batch_id, movement_type, qty, movement_date, note, created_by)
            VALUES (
              ${warehouseId},
              ${it.productId},
              NULL,
              'OUT',
              ${it.qty},
              ${saleDate}::timestamptz,
              ${`Sale TX#${transactionId}`},
              ${auth.sub || null}
            )
          `;
        }

        total = Number(total.toFixed(3));

        await tx`
          UPDATE sales_transactions
          SET total_jod = ${total}
          WHERE id = ${transactionId}
        `;

        return { transactionId, total };
      });

      return send(res, 201, { ok: true, transactionId: result.transactionId, totalJod: result.total });
    }

    // ---------------------------
    // DELETE /api/sales?id=... (void transaction)
    // ---------------------------
    if (method === "DELETE") {
      const auth = await requireUserFromReq(req, res, { rolesAny: ["main"] });
      if (!auth) return;

      const url = new URL(req.url, "http://localhost");
      const id = n(url.searchParams.get("id"));
      if (!id) return send(res, 400, { ok: false, error: "id is required" });

      await sql.begin(async (tx) => {
        const rows = await tx`
          SELECT id, sale_date, is_void
          FROM sales_transactions
          WHERE id = ${id}
          LIMIT 1
        `;
        if (!rows.length) throw new Error("NOT_FOUND");
        if (rows[0].is_void) return;

        const items = await tx`
          SELECT product_id, qty
          FROM sales_transaction_items
          WHERE transaction_id = ${id}
          ORDER BY id
        `;

        await tx`
          UPDATE sales_transactions
          SET is_void = true, voided_at = now()
          WHERE id = ${id}
        `;

        // Reverse stock (ADJ +qty back)
        for (const it of items) {
          await tx`
            INSERT INTO inventory_movements (warehouse_id, product_id, batch_id, movement_type, qty, movement_date, note, created_by)
            VALUES (
              ${warehouseId},
              ${it.product_id},
              NULL,
              'ADJ',
              ${n(it.qty)},
              ${rows[0].sale_date}::timestamptz,
              ${`Void Sale TX#${id}`},
              ${auth.sub || null}
            )
          `;
        }
      });

      return send(res, 200, { ok: true });
    }

    return send(res, 405, { ok: false, error: "Method not allowed" });
  } catch (err) {
    if (String(err?.message) === "NOT_FOUND") {
      return send(res, 404, { ok: false, error: "Transaction not found" });
    }
    if (String(err?.message) === "NO_DEFAULT_SALESPERSON") {
      return send(res, 400, { ok: false, error: "No default salesperson found. Create one in Salespersons." });
    }
    if (String(err?.message) === "INSUFFICIENT_STOCK") {
      return send(res, 400, {
        ok: false,
        error: `Not enough stock for productId=${err.productId}. Requested=${err.requested}, Available=${err.onHand}`,
      });
    }

    console.error("api/sales error:", err);
    return send(res, 500, {
      ok: false,
      error: "Server error",
      detail: String(err?.message || err),
    });
  }
}
