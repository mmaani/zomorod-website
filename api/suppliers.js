import { getSql } from '../lib/db.js';
import { requireUserFromReq } from '../lib/requireAuth.js';

/*
 * CRUD handler for suppliers.  Supports GET, POST, PATCH and DELETE via
 * Node/Vercel style serverless functions.  The original implementation
 * expected a Fetch API Request and imported a `requireUser` helper
 * that did not exist.  This rewrite uses `requireUserFromReq` and
 * parses JSON bodies manually.
 */

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

async function readJson(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try { return JSON.parse(body || '{}'); } catch { throw new Error('Invalid JSON body'); }
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
    // GET /api/suppliers
    if (method === 'GET') {
      const auth = await requireUserFromReq(req, res);
      if (!auth) return;
      const sql = getSql();
      const rows = await sql`SELECT id, name, contact_name, phone, email FROM suppliers ORDER BY name`;
      return send(res, 200, { ok: true, suppliers: rows });
    }
    // POST /api/suppliers
    if (method === 'POST') {
      const auth = await requireUserFromReq(req, res, { rolesAny: ['main'] });
      if (!auth) return;
      let body;
      try { body = await readJson(req); } catch { return send(res, 400, { ok: false, error: 'Invalid JSON body' }); }
      const name = String(body?.name || '').trim();
      const contactName = String(body?.contactName || '').trim() || null;
      const phone = String(body?.phone || '').trim() || null;
      const email = String(body?.email || '').trim() || null;
      if (!name) return send(res, 400, { ok: false, error: 'Name is required' });
      const sql = getSql();
      const rows = await sql`
        INSERT INTO suppliers (name, contact_name, phone, email)
        VALUES (${name}, ${contactName}, ${phone}, ${email})
        RETURNING id
      `;
      return send(res, 201, { ok: true, id: rows[0].id });
    }
    // PATCH /api/suppliers
    if (method === 'PATCH') {
      const auth = await requireUserFromReq(req, res, { rolesAny: ['main'] });
      if (!auth) return;
      let body;
      try { body = await readJson(req); } catch { return send(res, 400, { ok: false, error: 'Invalid JSON body' }); }
      const id = Number(body?.id);
      const name = String(body?.name || '').trim();
      const contactName = String(body?.contactName || '').trim() || null;
      const phone = String(body?.phone || '').trim() || null;
      const email = String(body?.email || '').trim() || null;
      if (!id) return send(res, 400, { ok: false, error: 'ID is required' });
      const sql = getSql();
      await sql`
        UPDATE suppliers
        SET name = ${name}, contact_name = ${contactName}, phone = ${phone}, email = ${email}, updated_at = NOW()
        WHERE id = ${id}
      `;
      return send(res, 200, { ok: true });
    }
    // DELETE /api/suppliers?id=123
    if (method === 'DELETE') {
      const auth = await requireUserFromReq(req, res, { rolesAny: ['main'] });
      if (!auth) return;
      const url = new URL(req.url, 'http://localhost');
      const id = Number(url.searchParams.get('id'));
      if (!id) return send(res, 400, { ok: false, error: 'id is required' });
      const sql = getSql();
      const references = await sql`SELECT COUNT(*) AS count FROM batches WHERE supplier_id = ${id} AND COALESCE(is_void, false) = false`;
      if (Number(references[0].count) > 0) {
        return send(res, 400, { ok: false, error: 'Cannot delete supplier with existing batches' });
      }
      await sql`DELETE FROM suppliers WHERE id = ${id}`;
      return send(res, 200, { ok: true });
    }
    return send(res, 405, { ok: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('api/suppliers error:', err);
    return send(res, 500, { ok: false, error: 'Server error', detail: String(err?.message || err) });
  }
}