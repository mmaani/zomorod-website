import { getSql } from '../db.js';
import { verifyPassword, signJwt } from '../auth.js';

export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    if (!email || !password) {
      return Response.json({ ok: false, error: "Email and password are required" }, { status: 400 });
    }
    const sql = getSql();
    const rows = await sql`
      SELECT id, full_name, email, password_hash, is_active
      FROM users
      WHERE lower(email) = ${email}
      LIMIT 1
    `;
    const user = rows?.[0];
    if (!user || !user.is_active) {
      return Response.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    }
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return Response.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
    }
    const roleRows = await sql`
      SELECT r.name
      FROM roles r
      JOIN user_roles ur ON ur.role_id = r.id
      WHERE ur.user_id = ${user.id}
      ORDER BY r.id
    `;
    const roles = roleRows.map((r) => r.name);
    const token = signJwt({
      sub: user.id,
      email: user.email,
      roles,
      fullName: user.full_name,
    });
    return Response.json({
      ok: true,
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        roles,
      },
    });
  } catch (e) {
    return Response.json(
      { ok: false, error: "Server error", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
