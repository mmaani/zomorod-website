import { db } from "./_lib/db.js";
import { readJson } from "./_lib/http.js";
import { requireAuth, requireRole } from "./_lib/rbac.js";

export default {
  async fetch(request) {
    const a = requireAuth(request);
    if (!a.ok) return a.response;

    const sql = db();

    // LIST
    if (request.method === "GET") {
      const rows = await sql`
        SELECT
          p.id,
          p.product_code,
          pc.name AS category,
          p.official_name,
          p.market_name,
          COALESCE(pp.base_selling_price_jod, 0) AS base_selling_price_jod,

          -- total received across batches
          COALESCE(SUM(b.quantity_received), 0) AS qty_received,

          -- weighted average purchase price (from batches)
          CASE
            WHEN COALESCE(SUM(b.quantity_received),0) = 0 THEN 0
            ELSE ROUND(SUM(b.purchase_price_jod * b.quantity_received) / SUM(b.quantity_received), 3)
          END AS avg_purchase_price_jod
        FROM products p
        LEFT JOIN product_categories pc ON pc.id = p.category_id
        LEFT JOIN product_pricing pp ON pp.product_id = p.id
        LEFT JOIN batches b ON b.product_id = p.id
        GROUP BY p.id, pc.name, pp.base_selling_price_jod
        ORDER BY p.id DESC
      `;

      const canSeePurchase = a.roles.includes("main") || a.roles.includes("doctor");

      const data = rows.map(r => {
        const obj = {
          id: r.id,
          productCode: r.product_code,
          category: r.category || null,
          officialName: r.official_name,
          marketName: r.market_name,
          qtyReceived: Number(r.qty_received),
          baseSellingPriceJod: Number(r.base_selling_price_jod),
        };
        if (canSeePurchase) obj.avgPurchasePriceJod = Number(r.avg_purchase_price_jod);
        return obj;
      });

      return Response.json({ ok: true, data });
    }

    // CREATE product (main only)
    if (request.method === "POST") {
      const r = requireRole(a.roles, ["main"]);
      if (!r.ok) return r.response;

      const body = (await readJson(request)) || {};
      const productCode = String(body.productCode || "").trim();
      const categoryName = String(body.category || "").trim();
      const officialName = String(body.officialName || "").trim();
      const marketName = String(body.marketName || "").trim();
      const baseSellingPriceJod = Number(body.baseSellingPriceJod || 0);

      if (!productCode || !officialName) {
        return Response.json({ error: "productCode and officialName are required" }, { status: 400 });
      }

      let categoryId = null;
      if (categoryName) {
        const [cat] = await sql`
          INSERT INTO product_categories (name)
          VALUES (${categoryName})
          ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
          RETURNING id
        `;
        categoryId = cat.id;
      }

      const [p] = await sql`
        INSERT INTO products (product_code, category_id, official_name, market_name)
        VALUES (${productCode}, ${categoryId}, ${officialName}, ${marketName || null})
        RETURNING id
      `;

      await sql`
        INSERT INTO product_pricing (product_id, base_selling_price_jod)
        VALUES (${p.id}, ${baseSellingPriceJod})
        ON CONFLICT (product_id) DO UPDATE
          SET base_selling_price_jod = EXCLUDED.base_selling_price_jod,
              updated_at = NOW()
      `;

      return Response.json({ ok: true, id: p.id });
    }

    return Response.json({ error: "Method not allowed" }, { status: 405 });
  },
};
