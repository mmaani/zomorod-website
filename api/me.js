import { getSql } from "../lib/db.js";
import { hashPassword } from "../lib/auth.js";
import { requireUserFromReq } from "../lib/requireAuth.js";

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

function parseScope(req) {
  try {
    const url = new URL(req.url || "", "http://localhost");
    return url.searchParams.get("scope") || "";
  } catch {
    return "";
  }
}

async function listUsers(sql, res) {
  const rows = await sql`
    SELECT
      u.id,
      u.full_name,
      u.email,
      u.is_active,
      u.created_at,
      COALESCE(array_agg(r.name ORDER BY r.id) FILTER (WHERE r.name IS NOT NULL), '{}') AS roles
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    GROUP BY u.id
    ORDER BY u.id
  `;

  return send(res, 200, {
    ok: true,
    users: rows.map((r) => ({
      id: r.id,
      fullName: r.full_name,
      email: r.email,
      isActive: r.is_active,
      createdAt: r.created_at,
      roles: r.roles || [],
    })),
  });
}

async function createUser(sql, req, res) {
  let body;
  try {
    body = await readJson(req);
  } catch {
    return send(res, 400, { ok: false, error: "Invalid JSON body" });
  }

  const fullName = String(body?.fullName || "").trim();
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  const role = String(body?.role || "").trim().toLowerCase();
  const isActive = body?.isActive !== false;

  if (!fullName || !email || !password || !role) {
    return send(res, 400, { ok: false, error: "fullName, email, password and role are required" });
  }

  const [roleRow] = await sql`SELECT id, name FROM roles WHERE name = ${role} LIMIT 1`;
  if (!roleRow) {
    return send(res, 400, { ok: false, error: "Invalid role" });
  }

  const passwordHash = await hashPassword(password);

  try {
    const [user] = await sql`
      INSERT INTO users (full_name, email, password_hash, is_active)
      VALUES (${fullName}, ${email}, ${passwordHash}, ${isActive})
      RETURNING id, full_name, email, is_active, created_at
    `;

    await sql`
      INSERT INTO user_roles (user_id, role_id)
      VALUES (${user.id}, ${roleRow.id})
      ON CONFLICT DO NOTHING
    `;

    return send(res, 201, {
      ok: true,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        isActive: user.is_active,
        role: roleRow.name,
      },
    });
  } catch (e) {
    const message = String(e?.message || e);
    if (message.includes("duplicate key") && message.includes("users_email_key")) {
      return send(res, 409, { ok: false, error: "Email already exists" });
    }
    throw e;
  }
}

async function updateUser(sql, req, res, currentUserId) {
  let body;
  try {
    body = await readJson(req);
  } catch {
    return send(res, 400, { ok: false, error: "Invalid JSON body" });
  }

  const id = Number(body?.id);
  const fullName = body?.fullName == null ? null : String(body.fullName).trim();
  const email = body?.email == null ? null : String(body.email).trim().toLowerCase();
  const role = body?.role == null ? null : String(body.role).trim().toLowerCase();
  const password = body?.password == null ? null : String(body.password);
  const isActive = typeof body?.isActive === "boolean" ? body.isActive : null;

  if (!Number.isInteger(id) || id <= 0) {
    return send(res, 400, { ok: false, error: "Valid id is required" });
  }

  const [existing] = await sql`SELECT id FROM users WHERE id = ${id} LIMIT 1`;
  if (!existing) {
    return send(res, 404, { ok: false, error: "User not found" });
  }

  if (id === currentUserId && isActive === false) {
    return send(res, 400, { ok: false, error: "You cannot deactivate your own account" });
  }

  if (fullName !== null) {
    await sql`UPDATE users SET full_name = ${fullName} WHERE id = ${id}`;
  }
  if (email !== null) {
    await sql`UPDATE users SET email = ${email} WHERE id = ${id}`;
  }
  if (isActive !== null) {
    await sql`UPDATE users SET is_active = ${isActive} WHERE id = ${id}`;
  }
  if (password !== null && password.length > 0) {
    const passwordHash = await hashPassword(password);
    await sql`UPDATE users SET password_hash = ${passwordHash} WHERE id = ${id}`;
  }

  if (role !== null) {
    const [roleRow] = await sql`SELECT id FROM roles WHERE name = ${role} LIMIT 1`;
    if (!roleRow) return send(res, 400, { ok: false, error: "Invalid role" });

    await sql`DELETE FROM user_roles WHERE user_id = ${id}`;
    await sql`
      INSERT INTO user_roles (user_id, role_id)
      VALUES (${id}, ${roleRow.id})
      ON CONFLICT DO NOTHING
    `;
  }

  return send(res, 200, { ok: true });
}

async function deleteUser(sql, req, res, currentUserId) {
  let rawId = req.query?.id;
  if (rawId == null) {
    try {
      const url = new URL(req.url || "", "http://localhost");
      rawId = url.searchParams.get("id");
    } catch {
      rawId = null;
    }
  }
  const id = Number(rawId);

  if (!Number.isInteger(id) || id <= 0) {
    return send(res, 400, { ok: false, error: "Valid id query param is required" });
  }

  if (id === currentUserId) {
    return send(res, 400, { ok: false, error: "You cannot delete your own account" });
  }

  const deleted = await sql`DELETE FROM users WHERE id = ${id} RETURNING id`;
  if (!deleted.length) {
    return send(res, 404, { ok: false, error: "User not found" });
  }

  return send(res, 200, { ok: true });
}

export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  const user = await requireUserFromReq(req, res);
  if (!user) return;
  const scope = parseScope(req);

  if (scope !== "users") {
    return send(res, 200, {
      ok: true,
      user: {
        id: user.sub || null,
        email: user.email || null,
        fullName: user.fullName || null,
        roles: user.roles || [],
      },
    });
  }

  if (!(user.roles || []).includes("main")) {
    return send(res, 403, { ok: false, error: "Forbidden" });
  }

  const sql = getSql();
  const currentUserId = Number(user.sub);

  if (req.method === "GET") return listUsers(sql, res);
  if (req.method === "POST") return createUser(sql, req, res);
  if (req.method === "PATCH") return updateUser(sql, req, res, currentUserId);
  if (req.method === "DELETE") return deleteUser(sql, req, res, currentUserId);

  return send(res, 405, { ok: false, error: "Method not allowed" });
}