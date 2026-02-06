import { getSql } from "../lib/db.js";
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

function cleanStr(v) {
  const s = String(v ?? "").trim();
  return s || null;
}
function parseInterestIds(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seen = new Set();
  for (const x of raw) {
    const id = Number(x);
    if (!Number.isInteger(id) || id <= 0) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export default async function handler(req, res) {
  try {
    const method = req.method || "GET";
    const sql = getSql();

    // GET /api/clients
    if (method === "GET") {
      const auth = await requireUserFromReq(req, res);
      if (!auth) return;

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
        GROUP BY c.id
        ORDER BY c.name
      `;

      return send(res, 200, { ok: true, clients: rows });
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

      const clientType = cleanStr(body?.clientType) || "pharmacy";
      const name = cleanStr(body?.name);
      const website = cleanStr(body?.website);
      const email = cleanStr(body?.email);
      const phone = cleanStr(body?.phone);
      const contactPerson = cleanStr(body?.contactPerson);
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

      const id = Number(body?.id);
      if (!id) return send(res, 400, { ok: false, error: "ID is required" });

      const clientType = cleanStr(body?.clientType) || "pharmacy";
      const name = cleanStr(body?.name);
      const website = cleanStr(body?.website);
      const email = cleanStr(body?.email);
      const phone = cleanStr(body?.phone);
      const contactPerson = cleanStr(body?.contactPerson);
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

      const url = new URL(req.url, "http://localhost");
      const id = Number(url.searchParams.get("id"));
      if (!id) return send(res, 400, { ok: false, error: "id is required" });

      const references = await sql`SELECT COUNT(*) AS count FROM sales_orders WHERE client_id = ${id}`;      if (Number(references?.[0]?.count || 0) > 0) {
        return send(res, 400, { ok: false, error: "Cannot delete client with existing sales" });
      }

      await sql`DELETE FROM clients WHERE id = ${id}`;
      return send(res, 200, { ok: true });
    }

    return send(res, 405, { ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("api/clients error:", err);
    return send(res, 500, { ok: false, error: "Server error", detail: String(err?.message || err) });
  }
}
