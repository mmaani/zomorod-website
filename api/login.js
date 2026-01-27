import { getSql } from "../lib/db.js";
import { verifyPassword, signJwt } from "../lib/auth.js";

// Vercel Serverless Function (Node-style)
export default async function handler(req, res) {
  // Allow only POST
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: false, error: "Method not allowed" }));
    return;
  }

  try {
    // Parse JSON body safely
    let body = req.body;

    // In some cases req.body might be a string (depending on runtime)
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: false, error: "Invalid JSON body" }));
        return;
      }
    }

    // If body is still empty, read raw stream
    if (!body) {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString("utf8");
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: false, error: "Invalid JSON body" }));
        return;
      }
    }

    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");

    if (!email || !password) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: "Email and password are required" }));
      return;
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
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: "Invalid credentials" }));
      return;
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: false, error: "Invalid credentials" }));
      return;
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

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        ok: true,
        token,
        user: {
          id: user.id,
          fullName: user.full_name,
          email: user.email,
          roles,
        },
      })
    );
  } catch (e) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        ok: false,
        error: "Server error",
        detail: String(e?.message || e),
      })
    );
  }
}
