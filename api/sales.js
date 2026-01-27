import { getSql } from '../lib/db.js';
import { requireUserFromReq } from '../lib/requireAuth.js';

/*
 * Sales API handler.  Supports GET, POST and DELETE operations on
 * sales.  The original implementation used a Fetch API Request and a
 * nonexistent `requireUser` helper; this rewrite uses a Node style
 * handler with proper authentication and JSON parsing.
 */

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

async function readJson(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try { return JSON.parse(body); } catch { throw new Error('Invalid JSON body'); }
  }
  if (body && typeof body === 'object') return body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { throw new Error('Invalid JSON body'); }
}

export default async function handler(req, res) {
  try {
    const method = req.method || 'GET';
    // GET /api/sales?clientId=...
    if (method === 'GET') {
      const auth = await requireUserFromReq(req, res);
      if (!auth) return;
      const url = new URL(req.url, 'http://localhost');
      const clientId = Number(url.searchParams.get('clientId')) || null;
      const sql = getSql();
      const rows = await sql`
        SELECT s.id, s.client_id, c.name AS client_name, s.product_id, p.official_name,
               s.qty, s.unit_price_jod, s.sale_date
        FROM sales s
        JOIN clients c ON c.id = s.client_id
        JOIN products p ON p.id = s.product_id
        WHERE ${clientId ? sql`c.id = ${clientId}` : sql`TRUE`}
        ORDER BY s.sale_date DESC, s.id DESC
      `;
      return send(res, 200, { ok: true, sales: rows });
    }
    // POST /api/sales
    if (method === 'POST') {
      const auth = await requireUserFromReq(req, res, { rolesAny: ['main'] });
      if (!auth) return;
      let body;
      try { body = await readJson(req); } catch { return send(res, 400, { ok: false, error: 'Invalid JSON body' }); }
      const clientId = Number(body?.clientId);
      const productId = Number(body?.productId);
      const qty = Number(body?.qty);
      const unitPriceJod = Number(body?.unitPriceJod);
      const saleDate = String(body?.saleDate || '').trim();
      if (!clientId || !productId || !qty || !unitPriceJod || !saleDate) {
        return send(res, 400, { ok: false, error: 'Missing fields' });
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
      return send(res, 201, { ok: true });
    }
    // DELETE /api/sales?id=...
    if (method === 'DELETE') {
      const auth = await requireUserFromReq(req, res, { rolesAny: ['main'] });
      if (!auth) return;
      const url = new URL(req.url, 'http://localhost');
      const id = Number(url.searchParams.get('id'));
      if (!id) return send(res, 400, { ok: false, error: 'id is required' });
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
      return send(res, 200, { ok: true });
    }
    return send(res, 405, { ok: false, error: 'Method not allowed' });
  } catch (err) {
    if (String(err?.message) === 'NOT_FOUND') {
      return send(res, 404, { ok: false, error: 'Sale not found' });
    }
    console.error('api/sales error:', err);
    return send(res, 500, { ok: false, error: 'Server error', detail: String(err?.message || err) });
  }
}