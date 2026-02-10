// api/clients.js
import { getSql } from "../lib/db.js";
import { requireUserFromReq } from "../lib/requireAuth.js";

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  res.end(JSON.stringify(payload));
}

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function cleanStr(v, maxLen = 255) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function cleanEmail(v) {
  const s = cleanStr(v, 254);
  if (!s) return null;
  const lower = s.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lower)) return null;
  return lower;
}

function cleanUrl(v) {
  const s = cleanStr(v, 2048);
  if (!s) return null;

  const candidate = s.startsWith("http://") || s.startsWith("https://") ? s : `https://${s}`;
  try {
    const u = new URL(candidate);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

function parseInterestIds(raw) {
  const out = [];
  const seen = new Set();
  for (const x of Array.isArray(raw) ? raw : []) {
    const id = n(x);
    if (!Number.isInteger(id) || id <= 0) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

async function readJson(req) {
  const body = req.body;

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

function getReqUrl(req) {
  const host = req.headers?.host || "localhost";
  const proto = (req.headers?.["x-forwarded-proto"] || "http").toString();
  return new URL(req.url || "/", `${proto}://${host}`);
}

export default async function handler(req, res) {
  try {
    const method = req.method || "GET";
    const sql = getSql();
    const url = getReqUrl(req);

    // -------------------------
    // GET /api/clients
    // supports:
    //   ?q=term
    //   ?clientType=pharmacy
    //   ?productId=123
    //   ?limit=500 (default 500, max 2000)
    // -------------------------
    if (method === "GET") {
      const auth = await requireUserFromReq(req, res);
      if (!auth) return;

      const q = cleanStr(url.searchParams.get("q"), 120);
      const like = q ? `%${q}%` : null;

      const clientType = cleanStr(url.searchParams.get("clientType"), 30); // optional
      const productId = n(url.searchParams.get("productId")) || 0;

      const limitRaw = n(url.searchParams.get("limit"));
      const limit = Math.min(Math.max(limitRaw || 500, 1), 2000);

      const rows = await sql`
        SELECT
          c.id,
          c.client_type,
          c.name,
          c.website,
          c.email,
          c.phone,
          c.contact_person,
          c.created_at,
          COALESCE(
            json_agg(
              json_build_object('id', p.id, 'name', p.official_name)
              ORDER BY p.official_name
            ) FILTER (WHERE p.id IS NOT NULL),
            '[]'::json
          ) AS interests
        FROM clients c
        LEFT JOIN client_interests ci ON ci.client_id = c.id
        LEFT JOIN products p ON p.id = ci.product_id
        WHERE
          (
            ${q}::text IS NULL
            OR COALESCE(NULLIF(c.name, ''), '') ILIKE ${like}
            OR COALESCE(NULLIF(c.contact_person, ''), '') ILIKE ${like}
            OR COALESCE(NULLIF(c.email, ''), '') ILIKE ${like}
            OR COALESCE(NULLIF(c.phone, ''), '') ILIKE ${like}
            OR COALESCE(NULLIF(c.website, ''), '') ILIKE ${like}
          )
          AND (
            ${clientType}::text IS NULL
            OR c.client_type = ${clientType}
          )
          AND (
            ${productId}::int = 0
            OR EXISTS (
              SELECT 1
              FROM client_interests ci2
              WHERE ci2.client_id = c.id
                AND ci2.product_id = ${productId}
            )
          )
        GROUP BY c.id
        ORDER BY c.name ASC, c.id ASC
        LIMIT ${limit}
      `;

      return send(res, 200, { ok: true, clients: rows || [] });
    }

    // POST /api/clients
    if (method === "POST") {
      const auth = await requireUserFromReq(req, res, { rolesAny: ["main"] });
      if (!auth) return;

      let body;
      try {
        body = await readJson(req);
      } catch {
        return send(res, 400, { ok: false, error: "Invalid JSON body" });
      }

      const clientType = cleanStr(body?.clientType, 30) || "pharmacy";
      const name = cleanStr(body?.name, 200);
      const website = cleanUrl(body?.website);
      const email = cleanEmail(body?.email);
      const phone = cleanStr(body?.phone, 50);
      const contactPerson = cleanStr(body?.contactPerson, 200);
      const interestProductIds = parseInterestIds(body?.interestProductIds);

      if (!name) return send(res, 400, { ok: false, error: "Name is required" });

      const created = await sql.begin(async (tx) => {
        const rows = await tx`
          INSERT INTO clients (client_type, name, website, email, phone, contact_person)
          VALUES (${clientType}, ${name}, ${website}, ${email}, ${phone}, ${contactPerson})
          RETURNING id
        `;
        const clientId = rows?.[0]?.id;

        for (const productId of interestProductIds) {
          await tx`
            INSERT INTO client_interests (client_id, product_id)
            VALUES (${clientId}, ${productId})
            ON CONFLICT DO NOTHING
          `;
        }

        return clientId;
      });

      return send(res, 201, { ok: true, id: created });
    }

    // PATCH /api/clients
    if (method === "PATCH") {
      const auth = await requireUserFromReq(req, res, { rolesAny: ["main"] });
      if (!auth) return;

      let body;
      try {
        body = await readJson(req);
      } catch {
        return send(res, 400, { ok: false, error: "Invalid JSON body" });
      }

      const id = n(body?.id);
      if (!id) return send(res, 400, { ok: false, error: "ID is required" });

      const clientType = cleanStr(body?.clientType, 30) || "pharmacy";
      const name = cleanStr(body?.name, 200);
      const website = cleanUrl(body?.website);
      const email = cleanEmail(body?.email);
      const phone = cleanStr(body?.phone, 50);
      const contactPerson = cleanStr(body?.contactPerson, 200);
      const interestProductIds = parseInterestIds(body?.interestProductIds);

      if (!name) return send(res, 400, { ok: false, error: "Name is required" });

      await sql.begin(async (tx) => {
        await tx`
          UPDATE clients
          SET
            client_type = ${clientType},
            name = ${name},
            website = ${website},
            email = ${email},
            phone = ${phone},
            contact_person = ${contactPerson}
          WHERE id = ${id}
        `;

        await tx`DELETE FROM client_interests WHERE client_id = ${id}`;

        for (const productId of interestProductIds) {
          await tx`
            INSERT INTO client_interests (client_id, product_id)
            VALUES (${id}, ${productId})
            ON CONFLICT DO NOTHING
          `;
        }
      });

      return send(res, 200, { ok: true });
    }

    // DELETE /api/clients?id=123
    if (method === "DELETE") {
      const auth = await requireUserFromReq(req, res, { rolesAny: ["main"] });
      if (!auth) return;

      const id = n(url.searchParams.get("id"));
      if (!id) return send(res, 400, { ok: false, error: "id is required" });

      const references = await sql`
        SELECT COUNT(*)::int AS count
        FROM sales_orders
        WHERE client_id = ${id}
      `;
      if (Number(references?.[0]?.count || 0) > 0) {
        return send(res, 400, { ok: false, error: "Cannot delete client with existing sales" });
      }

      await sql.begin(async (tx) => {
        await tx`DELETE FROM client_interests WHERE client_id = ${id}`;
        await tx`DELETE FROM clients WHERE id = ${id}`;
      });

      return send(res, 200, { ok: true });
    }

    return send(res, 405, { ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("api/clients error:", err);
    return send(res, 500, { ok: false, error: "Server error", detail: String(err?.message || err) });
  }
}
