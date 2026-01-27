import { getSql } from '../lib/db.js';
import { requireUser } from '../lib/requireAuth.js';

export async function GET(request) {
  const sql = getSql();
  const url = new URL(request.url);
  const clientId = Number(url.searchParams.get('clientId')) || null;
  const rows = await sql`
    SELECT s.id, s.client_id, c.name AS client_name, s.product_id, p.official_name,
           s.qty, s.unit_price_jod, s.sale_date
    FROM sales s
    JOIN clients c ON c.id = s.client_id
    JOIN products p ON p.id = s.product_id
    WHERE ${clientId ? sql`c.id = ${clientId}` : sql`TRUE`}
    ORDER BY s.sale_date DESC, s.id DESC
  `;
  return Response.json({ ok: true, sales: rows });
}

export async function POST(request) {
  const auth = await requireUser(request, { rolesAny: ['main'] });
  if (auth instanceof Response) return auth;

  const { clientId, productId, qty, unitPriceJod, saleDate } = await request.json();
  if (!clientId || !productId || !qty || !unitPriceJod || !saleDate) {
    return Response.json({ ok: false, error: 'Missing fields' }, { status: 400 });
  }

  const sql = getSql();
  await sql.begin(async (tx) => {
    const sale = await tx`
      INSERT INTO sales (client_id, product_id, qty, unit_price_jod, sale_date)
      VALUES (${clientId}, ${productId}, ${qty}, ${unitPriceJod}, ${saleDate})
      RETURNING id
    `;
    const saleId = sale[0].id;

    // Record inventory movement (OUT)
    await tx`
      INSERT INTO inventory_movements (warehouse_id, product_id, movement_type, qty, movement_date, note)
      VALUES (1, ${productId}, 'OUT', ${qty}, ${saleDate}, 'Sale')
    `;
    return saleId;
  });

  return Response.json({ ok: true }, { status: 201 });
}

export async function DELETE(request) {
  const auth = await requireUser(request, { rolesAny: ['main'] });
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const id = Number(url.searchParams.get('id'));
  if (!id) return Response.json({ ok: false, error: 'id is required' }, { status: 400 });

  const sql = getSql();
  await sql.begin(async (tx) => {
    // find sale
    const rows = await tx`SELECT id, product_id, qty, sale_date FROM sales WHERE id = ${id} LIMIT 1`;
    if (!rows.length) throw new Error('NOT_FOUND');
    const sale = rows[0];

    await tx`DELETE FROM sales WHERE id = ${id}`;
    // reverse inventory movement
    await tx`
      INSERT INTO inventory_movements (warehouse_id, product_id, movement_type, qty, movement_date, note)
      VALUES (1, ${sale.product_id}, 'ADJ', ${sale.qty}, ${sale.sale_date}, 'Void sale')
    `;
  });
  return Response.json({ ok: true }, { status: 200 });
}
