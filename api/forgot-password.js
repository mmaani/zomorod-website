import { randomBytes } from "node:crypto";
import { getSql } from "../lib/db.js";
import { hashPassword } from "../lib/auth.js";

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

function makeTempPassword() {
  // URL-safe temporary password
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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return send(res, 405, { ok: false, error: "Method not allowed" });
  }

  try {
    const body = await readJson(req);
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

    // Always return generic success for unknown emails (avoid account enumeration)
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
  } catch (e) {
    return send(res, 500, { ok: false, error: "Server error", detail: String(e?.message || e) });
  }
}