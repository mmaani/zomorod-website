// api/products.js
import { getSql } from "../lib/db.js";
import { requireUserFromReq, canSeePurchasePrice } from "../lib/requireAuth.js";

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function isNonNegNumber(v) {
  const x = Number(v);
  return Number.isFinite(x) && x >= 0;
}

async function readJson(req, res) {
  try {
    let body = req.body;

    if (typeof body === "string") {
      body = body ? JSON.parse(body) : {};
      return body;
    }

    if (body && typeof body === "object") return body;

    // Fallback: read stream
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString("utf8");
    return raw ? JSON.parse(raw) : {};
  } catch {
    send(res, 400, { ok: false, error: "Invalid JSON body" });
    return null;
  }
}

export default async function handler(req, res) {
  try {
    // ---------- GET /api/products ----------
    if (req.method === "GET") {
      const auth = await requireUserFromReq(req, res);
      if (!auth) return;

      const sql = getSql();
      const url = new URL(req.url, "http://localhost");
      const includeArchived = url.searchParams.get("includeArchived") === "1";

      const rows = await sql`
        SELECT
          p.id,
          p.product_code,
          c.name AS category,
          p.official_name,
          p.market_name,
          p.default_sell_price_jod,
          p.archived_at,

          COALESCE((
            SELECT SUM(
              CASE
                WHEN m.movement_type IN ('IN','RETURN') THEN m.qty
                WHEN m.movement_type = 'ADJ' THEN m.qty
                WHEN m.movement_type = 'OUT' THEN -m.qty
                ELSE 0
              END
            )
            FROM inventory_movements m
            WHERE m.product_id = p.id
          ), 0) AS on_hand_qty,

          lp.purchase_price_jod AS last_purchase_price_jod,
          lp.purchase_date AS last_purchase_date,

          ap.avg_purchase_price_jod AS avg_purchase_price_jod

        FROM products p
        LEFT JOIN product_categories c ON c.id = p.category_id

        LEFT JOIN LATERAL (
          SELECT b.purchase_price_jod, b.purchase_date
          FROM batches b
          WHERE b.product_id = p.id
            AND COALESCE(b.is_void, false) = false
          ORDER BY b.purchase_date DESC, b.id DESC
          LIMIT 1
        ) lp ON TRUE

        LEFT JOIN LATERAL (
          SELECT
            CASE
              WHEN SUM(b.qty_received) > 0
              THEN (SUM(b.qty_received * b.purchase_price_jod) / SUM(b.qty_received))
              ELSE NULL
            END AS avg_purchase_price_jod
          FROM batches b
          WHERE b.product_id = p.id
            AND COALESCE(b.is_void, false) = false
        ) ap ON TRUE

        WHERE (${includeArchived} OR p.archived_at IS NULL)
        ORDER BY p.created_at DESC
      `;

      const tiers = await sql`
        SELECT product_id, min_qty, unit_price_jod
        FROM product_price_tiers
        ORDER BY product_id, min_qty
      `;

      const tiersByProduct = new Map();
      for (const t of tiers) {
        const arr = tiersByProduct.get(t.product_id) || [];
        arr.push({ minQty: t.min_qty, unitPriceJod: t.unit_price_jod });
        tiersByProduct.set(t.product_id, arr);
      }

      const showPurchase = canSeePurchasePrice(auth.roles);

      const products = (rows || []).map((r) => {
        const item = {
          id: r.id,
          productCode: r.product_code,
          category: r.category || "",
          officialName: r.official_name,
          marketName: r.market_name || "",
          defaultSellPriceJod: r.default_sell_price_jod,
          onHandQty: n(r.on_hand_qty),
          priceTiers: tiersByProduct.get(r.id) || [],
          archivedAt: r.archived_at || null,
          lastPurchaseDate: r.last_purchase_date || null,
          lastPurchasePriceJod: r.last_purchase_price_jod || null,
          avgPurchasePriceJod: r.avg_purchase_price_jod || null,
        };

        if (!showPurchase) {
          item.lastPurchaseDate = null;
          item.lastPurchasePriceJod = null;
          item.avgPurchasePriceJod = null;
        }

        return item;
      });

      return send(res, 200, { ok: true, products });
    }

    // ---------- POST /api/products ----------
    if (req.method === "POST") {
      const auth = await requireUserFromReq(req, res, { rolesAny: ["main"] });
      if (!auth) return;

      const sql = getSql();
      const body = await readJson(req, res);
      if (!body) return;

      const productCode = String(body?.productCode || "").trim();
      const categoryName = String(body?.category || "").trim();
      const officialName = String(body?.officialName || "").trim();
      const marketName = String(body?.marketName || "").trim();
      const defaultSellPriceJodRaw = body?.defaultSellPriceJod;

      // ✅ No negative selling price
      if (!isNonNegNumber(defaultSellPriceJodRaw)) {
        return send(res, 400, { ok: false, error: "defaultSellPriceJod must be a non-negative number" });
      }
      const defaultSellPriceJod = Number(defaultSellPriceJodRaw);

      const priceTiers = Array.isArray(body?.priceTiers) ? body.priceTiers : [];

      if (!productCode || !officialName) {
        return send(res, 400, { ok: false, error: "productCode and officialName are required" });
      }

      // ✅ Validate tiers: no negative values
      for (const t of priceTiers) {
        const minQty = Number(t?.minQty);
        const unitPriceJod = Number(t?.unitPriceJod);

        if (!Number.isFinite(minQty) || minQty <= 0) {
          return send(res, 400, { ok: false, error: "Each price tier minQty must be > 0" });
        }
        if (!Number.isFinite(unitPriceJod) || unitPriceJod < 0) {
          return send(res, 400, { ok: false, error: "Each price tier unitPriceJod must be non-negative" });
        }
      }

      let categoryId = null;
      if (categoryName) {
        const catRows = await sql`
          INSERT INTO product_categories (name)
          VALUES (${categoryName})
          ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
          RETURNING id
        `;
        categoryId = catRows?.[0]?.id || null;
      }

      const pRows = await sql`
        INSERT INTO products (product_code, category_id, official_name, market_name, default_sell_price_jod)
        VALUES (${productCode}, ${categoryId}, ${officialName}, ${marketName || null}, ${defaultSellPriceJod})
        RETURNING id
      `;
      const productId = pRows?.[0]?.id;

      for (const t of priceTiers) {
        const minQty = Number(t?.minQty);
        const unitPriceJod = Number(t?.unitPriceJod);

        await sql`
          INSERT INTO product_price_tiers (product_id, min_qty, unit_price_jod)
          VALUES (${productId}, ${minQty}, ${unitPriceJod})
          ON CONFLICT (product_id, min_qty)
          DO UPDATE SET unit_price_jod = EXCLUDED.unit_price_jod
        `;
      }

      return send(res, 201, { ok: true, id: productId });
    }

    // ---------- PATCH /api/products ----------
    // Current use: archive/unarchive only (keep same behavior)
    if (req.method === "PATCH") {
      const auth = await requireUserFromReq(req, res, { rolesAny: ["main"] });
      if (!auth) return;

      const sql = getSql();
      const body = await readJson(req, res);
      if (!body) return;

      const id = Number(body?.id);
      const archived = typeof body?.archived === "boolean" ? body.archived : null;

      if (!id || archived === null) {
        return send(res, 400, { ok: false, error: "id and archived fields are required" });
      }

      const result = archived
        ? await sql`UPDATE products SET archived_at = NOW() WHERE id = ${id} RETURNING id`
        : await sql`UPDATE products SET archived_at = NULL WHERE id = ${id} RETURNING id`;

      if (!result.length) return send(res, 404, { ok: false, error: "Product not found" });

      return send(res, 200, { ok: true });
    }

    // ---------- DELETE /api/products?id=123 ----------
    if (req.method === "DELETE") {
      const auth = await requireUserFromReq(req, res, { rolesAny: ["main"] });
      if (!auth) return;

      const sql = getSql();
      const url = new URL(req.url, "http://localhost");
      const id = Number(url.searchParams.get("id"));
      if (!id) return send(res, 400, { ok: false, error: "id is required" });

      const rows = await sql`
        SELECT
          (SELECT COUNT(*) FROM batches WHERE product_id = ${id} AND COALESCE(is_void, false) = false) AS batch_count,
          (SELECT COUNT(*) FROM product_price_tiers WHERE product_id = ${id}) AS tier_count,
          (SELECT COUNT(*) FROM inventory_movements WHERE product_id = ${id}) AS movement_count
      `;

      const dep = rows?.[0] || {};
      if (Number(dep.batch_count) > 0 || Number(dep.tier_count) > 0 || Number(dep.movement_count) > 0) {
        return send(res, 400, {
          ok: false,
          error: "Cannot delete product with existing batches, price tiers or inventory movements",
        });
      }

      const result = await sql`DELETE FROM products WHERE id = ${id} RETURNING id`;
      if (!result.length) return send(res, 404, { ok: false, error: "Product not found" });

      return send(res, 200, { ok: true });
    }

    return send(res, 405, { ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("api/products error:", err);
    return send(res, 500, { ok: false, error: "Server error", detail: String(err?.message || err) });
  }
}
