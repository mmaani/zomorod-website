// api/products.js
import { sql } from "./_lib/db.js";
import { requireUser, canSeePurchasePrice } from "./_lib/requireAuth.js";

export const config = { runtime: "nodejs" };

function toNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const auth = await requireUser(req, res);
      if (!auth) return;

      const rows = await sql`
        SELECT
          p.id,
          p.product_code,
          c.name AS category,
          p.official_name,
          p.market_name,
          p.default_sell_price_jod,
          COALESCE(SUM(
            CASE
              WHEN m.movement_type IN ('IN','RETURN') THEN m.qty
              WHEN m.movement_type = 'ADJ' THEN m.qty
              WHEN m.movement_type = 'OUT' THEN -m.qty
              ELSE 0
            END
          ), 0) AS on_hand_qty,
          lp.purchase_price_jod AS last_purchase_price_jod,
          lp.purchase_date AS last_purchase_date
        FROM products p
        LEFT JOIN product_categories c ON c.id = p.category_id
        LEFT JOIN inventory_movements m ON m.product_id = p.id
        LEFT JOIN LATERAL (
          SELECT b.purchase_price_jod, b.purchase_date
          FROM batches b
          WHERE b.product_id = p.id
          ORDER BY b.purchase_date DESC, b.id DESC
          LIMIT 1
        ) lp ON TRUE
        GROUP BY p.id, c.name, lp.purchase_price_jod, lp.purchase_date
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

      const products = rows.map((r) => {
        const item = {
          id: r.id,
          productCode: r.product_code,
          category: r.category || "",
          officialName: r.official_name,
          marketName: r.market_name || "",
          defaultSellPriceJod: toNum(r.default_sell_price_jod, 0),
          onHandQty: toNum(r.on_hand_qty, 0),
          priceTiers: tiersByProduct.get(r.id) || [],
          lastPurchaseDate: r.last_purchase_date || null,
          lastPurchasePriceJod: r.last_purchase_price_jod || null,
        };

        if (!showPurchase) {
          item.lastPurchaseDate = null;
          item.lastPurchasePriceJod = null;
        }

        return item;
      });

      return res.status(200).json({ ok: true, products });
    }

    if (req.method === "POST") {
      const auth = await requireUser(req, res, { rolesAny: ["main"] });
      if (!auth) return;

      let body = req.body;
      if (typeof body === "string") {
        try {
          body = JSON.parse(body || "{}");
        } catch {
          return res.status(400).json({ ok: false, error: "Invalid JSON body" });
        }
      }

      const productCode = String(body?.productCode || "").trim();
      const categoryName = String(body?.category || "").trim();
      const officialName = String(body?.officialName || "").trim();
      const marketName = String(body?.marketName || "").trim();
      const defaultSellPriceJod = toNum(body?.defaultSellPriceJod, 0);
      const priceTiers = Array.isArray(body?.priceTiers) ? body.priceTiers : [];

      if (!productCode || !officialName) {
        return res.status(400).json({
          ok: false,
          error: "productCode and officialName are required",
        });
      }

      // Upsert category if provided
      let categoryId = null;
      if (categoryName) {
        const catRows = await sql`
          INSERT INTO product_categories (name)
          VALUES (${categoryName})
          ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
          RETURNING id
        `;
        categoryId = catRows?.[0]?.id ?? null;
      }

      // Insert product
      let productId;
      try {
        const pRows = await sql`
          INSERT INTO products (product_code, category_id, official_name, market_name, default_sell_price_jod)
          VALUES (${productCode}, ${categoryId}, ${officialName}, ${marketName || null}, ${defaultSellPriceJod})
          RETURNING id
        `;
        productId = pRows[0].id;
      } catch (e) {
        // most common: unique violation on product_code
        return res.status(400).json({ ok: false, error: "Product code already exists" });
      }

      // Insert tiers (optional)
      for (const t of priceTiers) {
        const minQty = toNum(t?.minQty, 0);
        const unitPriceJod = toNum(t?.unitPriceJod, 0);
        if (minQty <= 0 || unitPriceJod <= 0) continue;

        await sql`
          INSERT INTO product_price_tiers (product_id, min_qty, unit_price_jod)
          VALUES (${productId}, ${minQty}, ${unitPriceJod})
          ON CONFLICT (product_id, min_qty)
          DO UPDATE SET unit_price_jod = EXCLUDED.unit_price_jod
        `;
      }

      return res.status(201).json({ ok: true, id: productId });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("api/products error:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
