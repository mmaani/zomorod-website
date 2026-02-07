import { randomBytes } from "node:crypto";
import { getSql } from "../lib/db.js";
import { verifyPassword, hashPassword } from "../lib/auth.js";
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

function looksLikeBcryptHash(hash) {
  return /^\$2[abxy]?\$\d{2}\$/.test(String(hash || ""));
}

async function verifyViaPgCrypto(sql, password, passwordHash) {
  try {
    const rows = await sql`SELECT (crypt(${String(password)}, ${String(passwordHash)}) = ${String(passwordHash)}) AS ok`;
    return !!rows?.[0]?.ok;
  } catch {
    return false;
  }
}
function makeTempPassword() {
  return randomBytes(9).toString("base64url");
}

async function sendResetEmail({ to, fullName, tempPassword }) {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  const from = String(process.env.CRM_FROM_EMAIL || "").trim();
  if (!apiKey || !from) {
    throw new Error("Email service is not configured (RESEND_API_KEY / CRM_FROM_EMAIL)");
  }

  const subject = "ZOMOROD CRM temporary password";
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5">
      <h2>ZOMOROD CRM Password Reset</h2>
      <p>Hello ${fullName || "there"},</p>
      <p>A temporary password has been generated for your account:</p>
      <p style="font-size:18px"><b>${tempPassword}</b></p>
      <p>Please sign in and change your password immediately.</p>
    </div>
  `;

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Failed to send reset email (${resp.status}) ${text}`);
  }
}

function getAction(req, body) {
  let queryAction = "";
  try {
    const url = new URL(req.url || "", "http://localhost");
    queryAction = String(url.searchParams.get("action") || "").trim().toLowerCase();
  } catch {
    queryAction = "";
  }

  const bodyAction = String(body?.action || "").trim().toLowerCase();
  return queryAction || bodyAction;
}

async function handleForgotPassword(req, res, body) {
  const email = String(body?.email || "").trim().toLowerCase();
  if (!email) return send(res, 400, { ok: false, error: "Email is required" });

  const sql = getSql();
  const users = await sql`
    SELECT id, full_name, email, is_active
    FROM users
    WHERE lower(email) = ${email}
    LIMIT 1
  `;

  const user = users?.[0];
  if (!user || !user.is_active) {
    return send(res, 200, {
      ok: true,
      message: "If the account exists, a temporary password has been emailed.",
    });
  }

  const tempPassword = makeTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  await sql`
    UPDATE users
    SET password_hash = ${passwordHash}
    WHERE id = ${user.id}
  `;

  await sendResetEmail({ to: user.email, fullName: user.full_name, tempPassword });

  return send(res, 200, {
    ok: true,
    message: "If the account exists, a temporary password has been emailed.",
  });
}

async function handleLogin(req, res, body) {
  if (!process.env.JWT_SECRET) {
    return send(res, 500, { ok: false, error: "Server misconfigured" });
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

  let ok = await verifyPassword(password, user.password_hash);

  if (!ok && looksLikeBcryptHash(user.password_hash)) {
    ok = await verifyViaPgCrypto(sql, password, user.password_hash);
  }

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
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    return send(res, 405, { ok: false, error: "Method not allowed" });
  }
  try {
    if (!process.env.DATABASE_URL) {
         return send(res, 500, { ok: false, error: "Server misconfigured" });
    }
    let body;
    try {
      body = await readJson(req);
    } catch {
      return send(res, 400, { ok: false, error: "Invalid JSON body" });
    }

        const action = getAction(req, body);
    if (["forgot", "forgot-password", "forgot_password"].includes(action)) {
      return handleForgotPassword(req, res, body);
    }

    return handleLogin(req, res, body);
  } catch (e) {
    const message = String(e?.message || e);
    if (message.includes('relation "users" does not exist')
      || message.includes('relation "roles" does not exist')
      || message.includes('relation "user_roles" does not exist')) {
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