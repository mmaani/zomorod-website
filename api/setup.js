import { getSql } from "../lib/db.js";
import { hashPassword } from "../lib/auth.js";

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return send(res, 405, { ok: false, error: "Method not allowed" });
  }

  try {
    const headerToken = req.headers["x-setup-token"] || "";
    const envToken = process.env.SETUP_TOKEN || "";
    if (!envToken) {
      return send(res, 500, { ok: false, error: "SETUP_TOKEN is not set in Vercel env vars" });    }
    if (!headerToken || headerToken !== envToken) {
      return Response.json({ ok: false, error: 'Invalid setup token' }, { status: 401 });
    }

    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body || "{}");
      } catch {
        return send(res, 400, { ok: false, error: "Invalid JSON body" });
      }
    }
        if (!body || typeof body !== "object") {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString("utf8");
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch {
        return send(res, 400, { ok: false, error: "Invalid JSON body" });
      }
    }

    const sql = getSql();
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
    return send(res, 200, { ok: true, users: results });
    } catch (e) {
    return send(res, 500, { ok: false, error: "Server error", detail: String(e?.message || e) });
    }
}