
import { getSql } from "./_lib/db.js";
const sql = getSql();
import { requireUser, canSeePurchasePrice } from "./_lib/requireAuth.js";

// Ensure Node runtime (DB access)
export const config = { runtime: "nodejs" };

export async function GET(request) {
  try {
    const auth = await requireUser(request);
    if (auth instanceof Response) return auth;

    // Products + category + inventory (from movements) + last purchase price/date (from batches)
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

    // Load tiers
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

    const data = rows.map((r) => {
      const item = {
        id: r.id,
        productCode: r.product_code,
        category: r.category || "",
        officialName: r.official_name,
        marketName: r.market_name || "",
        defaultSellPriceJod: r.default_sell_price_jod,
        onHandQty: Number(r.on_hand_qty || 0),
        priceTiers: tiersByProduct.get(r.id) || [],
        lastPurchaseDate: r.last_purchase_date || null,
        lastPurchasePriceJod: r.last_purchase_price_jod || null,
      };

      // Hide purchase info unless allowed
      if (!showPurchase) {
        item.lastPurchaseDate = null;
        item.lastPurchasePriceJod = null;
      }

      return item;
    });

    return Response.json({ ok: true, products: data }, { status: 200 });
  } catch (err) {
    console.error("GET /api/products failed:", err);
    return Response.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireUser(request, { rolesAny: ["main"] });
    if (auth instanceof Response) return auth;

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const productCode = String(body?.productCode || "").trim();
    const categoryName = String(body?.category || "").trim();
    const officialName = String(body?.officialName || "").trim();
    const marketName = String(body?.marketName || "").trim();
    const defaultSellPriceJod = Number(body?.defaultSellPriceJod || 0);
    const priceTiers = Array.isArray(body?.priceTiers) ? body.priceTiers : [];

    if (!productCode || !officialName) {
      return Response.json(
        { ok: false, error: "productCode and officialName are required" },
        { status: 400 }
      );
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
      categoryId = catRows[0].id;
    }

    const pRows = await sql`
      INSERT INTO products (product_code, category_id, official_name, market_name, default_sell_price_jod)
      VALUES (${productCode}, ${categoryId}, ${officialName}, ${marketName || null}, ${defaultSellPriceJod})
      RETURNING id
    `;

    const productId = pRows[0].id;

    // Insert tiers (optional)
    for (const t of priceTiers) {
      const minQty = Number(t?.minQty);
      const unitPriceJod = Number(t?.unitPriceJod);
      if (!Number.isFinite(minQty) || minQty <= 0) continue;
      if (!Number.isFinite(unitPriceJod) || unitPriceJod <= 0) continue;

      await sql`
        INSERT INTO product_price_tiers (product_id, min_qty, unit_price_jod)
        VALUES (${productId}, ${minQty}, ${unitPriceJod})
        ON CONFLICT (product_id, min_qty) DO UPDATE SET unit_price_jod = EXCLUDED.unit_price_jod
      `;
    }

    return Response.json({ ok: true, id: productId }, { status: 201 });
  } catch (err) {
    console.error("POST /api/products failed:", err);
    return Response.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
