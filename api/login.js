import { getSql } from "../lib/db.js";
import { verifyPassword } from "../lib/auth.js";
import { signJwt } from "../lib/jwt.js";


export const config = { runtime: "nodejs" };

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

async function readJson(req) {
  let body = req.body;

  if (typeof body === "string") {
    try {
      return JSON.parse(body || "{}");
    } catch {
      throw new Error("Invalid JSON body");
    }
  }
  if (body && typeof body === "object") return body;

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON body");
  }
}

export default async function handler(req, res) {
  // handle preflight safely (optional but good)
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    return send(res, 405, { ok: false, error: "Method not allowed" });
  }

  try {
     if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
      return send(res, 500, { ok: false, error: "Server misconfigured" });
    }
    let body;
    try {
      body = await readJson(req);
    } catch {
      return send(res, 400, { ok: false, error: "Invalid JSON body" });
    }

    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");

    if (!email || !password) {
      return send(res, 400, { ok: false, error: "Email and password are required" });
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
      return send(res, 401, { ok: false, error: "Invalid credentials" });
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return send(res, 401, { ok: false, error: "Invalid credentials" });
    }

    const roleRows = await sql`
      SELECT r.name
      FROM roles r
      JOIN user_roles ur ON ur.role_id = r.id
      WHERE ur.user_id = ${user.id}
      ORDER BY r.id
    `;
    const roles = (roleRows || []).map((r) => r.name);

    const token = signJwt({
      sub: user.id,
      email: user.email,
      roles,
      fullName: user.full_name,
    });

    return send(res, 200, {
      ok: true,
      token,
      user: { id: user.id, fullName: user.full_name, email: user.email, roles },
    });
  } catch (e) {
    const message = String(e?.message || e);
    if (message.includes("relation \"users\" does not exist")
      || message.includes("relation \"roles\" does not exist")
      || message.includes("relation \"user_roles\" does not exist")) {
      return send(res, 500, {
        ok: false,
        error: "Database not initialized",
        detail: "Run /api/setup or apply migrations before logging in.",
      });
    }
    if (message.includes("ECONNREFUSED") || message.includes("connect ECONNREFUSED")) {
      return send(res, 503, { ok: false, error: "Database unavailable" });
    }
    return send(res, 500, { ok: false, error: "Server error", detail: message });
  }
}