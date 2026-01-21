import { getSql } from "../_lib/db.js";
import { hashPassword } from "./auth.js";

export async function POST(request) {
  try {
    const headerToken = request.headers.get("x-setup-token") || "";
    const envToken = process.env.SETUP_TOKEN || "";

    if (!envToken) {
      return Response.json(
        { ok: false, error: "SETUP_TOKEN is not set in Vercel env vars" },
        { status: 500 }
      );
    }

    if (!headerToken || headerToken !== envToken) {
      return Response.json(
        { ok: false, error: "Invalid setup token" },
        { status: 401 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const sql = getSql();

    // Ensure roles exist (safe even if already inserted)
    const roleNames = ["main", "doctor", "general"];
    const roleIdByName = {};

    for (const name of roleNames) {
      const rows = await sql`
        INSERT INTO roles (name)
        VALUES (${name})
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id, name
      `;
      roleIdByName[name] = rows[0].id;
    }

    async function upsertUser(roleKey, u) {
      const fullName = String(u?.fullName || "").trim();
      const email = String(u?.email || "").trim().toLowerCase();
      const password = String(u?.password || "");

      if (!fullName || !email || !password) {
        throw new Error(`Missing fields for ${roleKey} user`);
      }

      const passwordHash = await hashPassword(password);

      const userRows = await sql`
        INSERT INTO users (full_name, email, password_hash, is_active)
        VALUES (${fullName}, ${email}, ${passwordHash}, TRUE)
        ON CONFLICT (email) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          password_hash = EXCLUDED.password_hash,
          is_active = TRUE
        RETURNING id, full_name, email, is_active
      `;
      const user = userRows[0];

      const roleId = roleIdByName[roleKey];
      await sql`
        INSERT INTO user_roles (user_id, role_id)
        VALUES (${user.id}, ${roleId})
        ON CONFLICT DO NOTHING
      `;

      return { id: user.id, fullName: user.full_name, email: user.email, role: roleKey };
    }

    const results = [];
    results.push(await upsertUser("main", body.main));
    results.push(await upsertUser("doctor", body.doctor));
    results.push(await upsertUser("general", body.general));

    return Response.json({ ok: true, users: results }, { status: 200 });
  } catch (e) {
    // Return JSON so you can see the actual error in curl instead of generic Vercel 500 page
    return Response.json(
      { ok: false, error: "Server error", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
