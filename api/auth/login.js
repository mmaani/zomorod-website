import { sql } from "../_lib/db.js";
import { verifyPassword, signJwt } from "./auth.js";

// Ensure Node runtime (good for DB access)
export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: "Email and password are required" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const rows = await sql`
      SELECT id, full_name, email, password_hash, is_active
      FROM users
      WHERE email = ${normalizedEmail}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res.status(403).json({ ok: false, error: "User is inactive" });
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }

    const roleRows = await sql`
      SELECT r.name
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = ${user.id}
    `;
    const roles = roleRows.map((r) => r.name);

    const token = signJwt({
      sub: String(user.id),
      email: user.email,
      roles,
    });

    return res.status(200).json({
      ok: true,
      token,
      user: { id: user.id, fullName: user.full_name, email: user.email, roles },
    });
  } catch (err) {
    console.error("LOGIN_ERROR:", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
