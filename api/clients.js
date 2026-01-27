import { getSql } from '../lib/db.js';
import { requireUserFromReq } from '../lib/requireAuth.js';

/*
 * CRUD handler for clients.  This serverless function supports
 * GET, POST, PATCH and DELETE for the /api/clients route using a
 * Node/Vercel style `req`/`res` signature.  The previous version
 * incorrectly imported a non‑existent `requireUser` helper and used
 * Fetch API conventions that do not exist on Node request objects.
 * This rewrite parses JSON bodies manually, checks authentication
 * using `requireUserFromReq`, and returns consistent JSON responses.
 */

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

async function readJson(req) {
  // Vercel often provides req.body pre‑parsed, but not always.
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
      return body;
    } catch {
      throw new Error('Invalid JSON body');
    }
  }
  if (body && typeof body === 'object') return body;
  // Fallback: read from the request stream
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON body');
  }
}

export default async function handler(req, res) {
  try {
    const method = req.method || 'GET';
    // GET /api/clients
    if (method === 'GET') {
      // require authentication but allow any role
      const auth = await requireUserFromReq(req, res);
      if (!auth) return;
      const sql = getSql();
      const rows = await sql`SELECT id, name, contact_name, phone, email FROM clients ORDER BY name`;
      return send(res, 200, { ok: true, clients: rows });
    }
    // POST /api/clients
    if (method === 'POST') {
      const auth = await requireUserFromReq(req, res, { rolesAny: ['main'] });
      if (!auth) return;
      let body;
      try {
        body = await readJson(req);
      } catch {
        return send(res, 400, { ok: false, error: 'Invalid JSON body' });
      }
      const name = String(body?.name || '').trim();
      const contactName = String(body?.contactName || '').trim() || null;
      const phone = String(body?.phone || '').trim() || null;
      const email = String(body?.email || '').trim() || null;
      if (!name) return send(res, 400, { ok: false, error: 'Name is required' });
      const sql = getSql();
      const rows = await sql`
        INSERT INTO clients (name, contact_name, phone, email)
        VALUES (${name}, ${contactName}, ${phone}, ${email})
        RETURNING id
      `;
      return send(res, 201, { ok: true, id: rows[0].id });
    }
    // PATCH /api/clients
    if (method === 'PATCH') {
      const auth = await requireUserFromReq(req, res, { rolesAny: ['main'] });
      if (!auth) return;
      let body;
      try {
        body = await readJson(req);
      } catch {
        return send(res, 400, { ok: false, error: 'Invalid JSON body' });
      }
      const id = Number(body?.id);
      const name = String(body?.name || '').trim();
      const contactName = String(body?.contactName || '').trim() || null;
      const phone = String(body?.phone || '').trim() || null;
      const email = String(body?.email || '').trim() || null;
      if (!id) return send(res, 400, { ok: false, error: 'ID is required' });
      const sql = getSql();
      await sql`
        UPDATE clients
        SET name = ${name}, contact_name = ${contactName}, phone = ${phone}, email = ${email}, updated_at = NOW()
        WHERE id = ${id}
      `;
      return send(res, 200, { ok: true });
    }
    // DELETE /api/clients?id=123
    if (method === 'DELETE') {
      const auth = await requireUserFromReq(req, res, { rolesAny: ['main'] });
      if (!auth) return;
      const url = new URL(req.url, 'http://localhost');
      const id = Number(url.searchParams.get('id'));
      if (!id) return send(res, 400, { ok: false, error: 'id is required' });
      const sql = getSql();
      const references = await sql`SELECT COUNT(*) AS count FROM sales WHERE client_id = ${id}`;
      if (Number(references[0].count) > 0) {
        return send(res, 400, { ok: false, error: 'Cannot delete client with existing sales' });
      }
      await sql`DELETE FROM clients WHERE id = ${id}`;
      return send(res, 200, { ok: true });
    }
    // Method not allowed
    return send(res, 405, { ok: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('api/clients error:', err);
    return send(res, 500, { ok: false, error: 'Server error', detail: String(err?.message || err) });
  }
}