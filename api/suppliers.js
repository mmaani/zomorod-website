import { getSql } from '../lib/db.js';
import { requireUser } from '../lib/requireAuth.js';

export async function GET(request) {
  const sql = getSql();
  const rows = await sql`SELECT id, name, contact_name, phone, email FROM suppliers ORDER BY name`;
  return Response.json({ ok: true, suppliers: rows });
}

export async function POST(request) {
  const auth = await requireUser(request, { rolesAny: ['main'] });
  if (auth instanceof Response) return auth;

  const { name, contactName, phone, email } = await request.json();
  if (!name) return Response.json({ ok: false, error: 'Name is required' }, { status: 400 });

  const sql = getSql();
  const rows = await sql`
    INSERT INTO suppliers (name, contact_name, phone, email)
    VALUES (${name}, ${contactName || null}, ${phone || null}, ${email || null})
    RETURNING id
  `;
  return Response.json({ ok: true, id: rows[0].id }, { status: 201 });
}

export async function PATCH(request) {
  const auth = await requireUser(request, { rolesAny: ['main'] });
  if (auth instanceof Response) return auth;

  const { id, name, contactName, phone, email } = await request.json();
  if (!id) return Response.json({ ok: false, error: 'ID is required' }, { status: 400 });

  const sql = getSql();
  await sql`
    UPDATE suppliers
    SET name = ${name}, contact_name = ${contactName}, phone = ${phone}, email = ${email}, updated_at = NOW()
    WHERE id = ${id}
  `;
  return Response.json({ ok: true }, { status: 200 });
}

export async function DELETE(request) {
  const auth = await requireUser(request, { rolesAny: ['main'] });
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const id = Number(url.searchParams.get('id'));
  if (!id) return Response.json({ ok: false, error: 'id is required' }, { status: 400 });

  const sql = getSql();
  const references = await sql`
    SELECT COUNT(*) AS count FROM batches WHERE supplier_id = ${id} AND COALESCE(is_void, false) = false
  `;
  if (Number(references[0].count) > 0) {
    return Response.json(
      { ok: false, error: 'Cannot delete supplier with existing batches' },
      { status: 400 }
    );
  }

  await sql`DELETE FROM suppliers WHERE id = ${id}`;
  return Response.json({ ok: true }, { status: 200 });
}
