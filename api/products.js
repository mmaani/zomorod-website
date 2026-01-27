import { getSql } from '../lib/db.js';
import { requireUser, canSeePurchasePrice } from '../lib/requireAuth.js';

export const config = { runtime: 'nodejs' };

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

export async function GET(request) {
  try {
    const auth = await requireUser(request);
    if (auth instanceof Response) return auth;

    const sql = getSql();
    const url = new URL(request.url);
    const includeArchived = url.searchParams.get('includeArchived') === '1';

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
    const data = rows.map((r) => {
      const item = {
        id: r.id,
        productCode: r.product_code,
        category: r.category || '',
        officialName: r.official_name,
        marketName: r.market_name || '',
        defaultSellPriceJod: r.default_sell_price_jod,
        onHandQty: n(r.on_hand_qty),
        priceTiers: tiersByProduct.get(r.id) || [],
        archivedAt: r.archived_at || null,
        lastPurchaseDate: r.last_purchase_date || null,
        lastPurchasePriceJod: r.last_purchase_price_jod || null,
        avgPurchasePriceJod: r.avg_purchase_price_jod || null
      };
      if (!showPurchase) {
      item.lastPurchaseDate = null;
        item.lastPurchasePriceJod = null;
        item.avgPurchasePriceJod = null;
      }
      return item;
    });

    return Response.json({ ok: true, products: data }, { status: 200 });
  } catch (err) {
    console.error('GET /api/products failed:', err);
    return Response.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await requireUser(request, { rolesAny: ['main'] });
    if (auth instanceof Response) return auth;

    const sql = getSql();
    const body = await request.json().catch(() => null);
    if (!body) return Response.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });

    const productCode = String(body?.productCode || '').trim();
    const categoryName = String(body?.category || '').trim();
    const officialName = String(body?.officialName || '').trim();
    const marketName = String(body?.marketName || '').trim();
    const defaultSellPriceJod = Number(body?.defaultSellPriceJod || 0);
    const priceTiers = Array.isArray(body?.priceTiers) ? body.priceTiers : [];

    if (!productCode || !officialName) {
      return Response.json({ ok: false, error: 'productCode and officialName are required' }, { status: 400 });
    }

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
    console.error('POST /api/products failed:', err);
    return Response.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

// Toggle product archived/unarchived status.
export async function PATCH(request) {
  try {
    const auth = await requireUser(request, { rolesAny: ['main'] });
    if (auth instanceof Response) return auth;

    const body = await request.json().catch(() => null);
    const id = Number(body?.id);
    const archived = typeof body?.archived === 'boolean' ? body.archived : null;
    if (!id || archived === null) {
      return Response.json({ ok: false, error: 'id and archived fields are required' }, { status: 400 });
    }

    const sql = getSql();
    if (archived) {
      const result = await sql`
        UPDATE products
        SET archived_at = NOW()
        WHERE id = ${id}
        RETURNING id
      `;
      if (!result.length) {
        return Response.json({ ok: false, error: 'Product not found' }, { status: 404 });
      }
    } else {
      const result = await sql`
        UPDATE products
        SET archived_at = NULL
        WHERE id = ${id}
        RETURNING id
      `;
      if (!result.length) {
        return Response.json({ ok: false, error: 'Product not found' }, { status: 404 });
      }
    }

    return Response.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('PATCH /api/products failed:', err);
    return Response.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}

// Delete a product if it has no associated batches, price tiers, or inventory movements.
export async function DELETE(request) {
  try {
    const auth = await requireUser(request, { rolesAny: ['main'] });
    if (auth instanceof Response) return auth;

    const url = new URL(request.url);
    const id = Number(url.searchParams.get('id'));
    if (!id) {
      return Response.json({ ok: false, error: 'id is required' }, { status: 400 });
    }

    const sql = getSql();
    const rows = await sql`
      SELECT
        (SELECT COUNT(*) FROM batches WHERE product_id = ${id} AND COALESCE(is_void, false) = false) AS batch_count,
        (SELECT COUNT(*) FROM product_price_tiers WHERE product_id = ${id}) AS tier_count,
        (SELECT COUNT(*) FROM inventory_movements WHERE product_id = ${id}) AS movement_count
    `;
    const dep = rows[0] || {};
    if (Number(dep.batch_count) > 0 || Number(dep.tier_count) > 0 || Number(dep.movement_count) > 0) {
      return Response.json(
        { ok: false, error: 'Cannot delete product with existing batches, price tiers or inventory movements' },
        { status: 400 }
      );
    }

    const result = await sql`DELETE FROM products WHERE id = ${id} RETURNING id`;
    if (!result.length) {
      return Response.json({ ok: false, error: 'Product not found' }, { status: 404 });
    }
    return Response.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('DELETE /api/products failed:', err);
    return Response.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
