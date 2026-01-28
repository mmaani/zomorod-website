// api/salespersons.js
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

function s(v) {
  const x = String(v || "").trim();
  return x || "";
}

export default async function handler(req, res) {
  try {
    const method = req.method || "GET";
    const sql = getSql();

    // GET /api/salespersons  (any logged-in user)
    if (method === "GET") {
      const auth = await requireUserFromReq(req, res);
      if (!auth) return;

      const rows = await sql`
        SELECT
          id,
          salesperson_type,
          employee_id,
          first_name,
          last_name,
          display_name,
          phone,
          email,
          is_default
        FROM salespersons
        ORDER BY is_default DESC, display_name ASC
      `;

      const salespersons = (rows || []).map((r) => ({
        id: r.id,
        salespersonType: r.salesperson_type,
        employeeId: r.employee_id || "",
        firstName: r.first_name || "",
        lastName: r.last_name || "",
        displayName: r.display_name,
        phone: r.phone || "",
        email: r.email || "",
        isDefault: !!r.is_default,
      }));

      return send(res, 200, { ok: true, salespersons });
    }

    // POST /api/salespersons (main only)
    if (method === "POST") {
      const auth = await requireUserFromReq(req, res, { rolesAny: ["main"] });
      if (!auth) return;

      let body;
      try {
        body = await readJson(req);
      } catch {
        return send(res, 400, { ok: false, error: "Invalid JSON body" });
      }

      const salespersonType = s(body?.salespersonType) || "external";
      const employeeId = s(body?.employeeId) || null;
      const firstName = s(body?.firstName) || null;
      const lastName = s(body?.lastName) || null;
      const displayName = s(body?.displayName);

      const phone = s(body?.phone) || null;
      const email = s(body?.email) || null;
      const isDefault = body?.isDefault === true;

      if (!displayName) return send(res, 400, { ok: false, error: "displayName is required" });

      const rows = await sql.begin(async (tx) => {
        if (isDefault) {
          // unset other defaults
          await tx`UPDATE salespersons SET is_default = false WHERE is_default = true`;
        }
        const ins = await tx`
          INSERT INTO salespersons
            (salesperson_type, employee_id, first_name, last_name, display_name, phone, email, is_default, updated_at)
          VALUES
            (${salespersonType}, ${employeeId}, ${firstName}, ${lastName}, ${displayName}, ${phone}, ${email}, ${isDefault}, now())
          RETURNING id
        `;
        return ins;
      });

      return send(res, 201, { ok: true, id: rows[0].id });
    }

    // PATCH /api/salespersons (main only)
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
      if (!id) return send(res, 400, { ok: false, error: "id is required" });

      const salespersonType = s(body?.salespersonType) || "external";
      const employeeId = s(body?.employeeId) || null;
      const firstName = s(body?.firstName) || null;
      const lastName = s(body?.lastName) || null;
      const displayName = s(body?.displayName);
      const phone = s(body?.phone) || null;
      const email = s(body?.email) || null;
      const isDefault = body?.isDefault === true;

      if (!displayName) return send(res, 400, { ok: false, error: "displayName is required" });

      await sql.begin(async (tx) => {
        if (isDefault) {
          await tx`UPDATE salespersons SET is_default = false WHERE is_default = true AND id <> ${id}`;
        }
        await tx`
          UPDATE salespersons
          SET
            salesperson_type = ${salespersonType},
            employee_id = ${employeeId},
            first_name = ${firstName},
            last_name = ${lastName},
            display_name = ${displayName},
            phone = ${phone},
            email = ${email},
            is_default = ${isDefault},
            updated_at = now()
          WHERE id = ${id}
        `;
      });

      return send(res, 200, { ok: true });
    }

    // DELETE /api/salespersons?id=... (main only)
    if (method === "DELETE") {
      const auth = await requireUserFromReq(req, res, { rolesAny: ["main"] });
      if (!auth) return;

      const url = new URL(req.url, "http://localhost");
      const id = Number(url.searchParams.get("id"));
      if (!id) return send(res, 400, { ok: false, error: "id is required" });

      // Don’t allow deleting default
      const chk = await sql`SELECT is_default FROM salespersons WHERE id = ${id} LIMIT 1`;
      if (!chk.length) return send(res, 404, { ok: false, error: "Salesperson not found" });
      if (chk[0].is_default) return send(res, 400, { ok: false, error: "Cannot delete default salesperson" });

      // If used in sales_orders, block deletion (restrict)
      const refs = await sql`SELECT COUNT(*)::int AS cnt FROM sales_orders WHERE salesperson_id = ${id}`;
      if (Number(refs?.[0]?.cnt || 0) > 0) {
        return send(res, 400, { ok: false, error: "Cannot delete salesperson used in sales" });
      }

      await sql`DELETE FROM salespersons WHERE id = ${id}`;
      return send(res, 200, { ok: true });
    }

    return send(res, 405, { ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("api/salespersons error:", err);
    return send(res, 500, { ok: false, error: "Server error", detail: String(err?.message || err) });
  }
}
