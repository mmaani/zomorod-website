// api/suppliers.js
import { getSql } from "../lib/db.js";
import { requireUserFromReq } from "../lib/requireAuth.js";

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function cleanStr(v) {
  const s = String(v ?? "").trim();
  return s ? s : null;
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

async function loadCategories(sql) {
  // We reuse product_categories as “potential product categories supplier can supply”
  const rows = await sql`
    SELECT id, name
    FROM product_categories
    ORDER BY name ASC
  `;
  return rows || [];
}

export default async function handler(req, res) {
  try {
    const method = req.method || "GET";
    const sql = getSql();

    // -------------------------
    // GET /api/suppliers
    // returns: suppliers + categories
    // -------------------------
    if (method === "GET") {
      const auth = await requireUserFromReq(req, res);
      if (!auth) return;

      const suppliers = await sql`
        SELECT
          s.id,
          s.name,
          s.business_name,
          s.contact_name,
          s.phone,
          s.email,
          s.website,
          s.supplier_country,
          s.supplier_city,
          s.created_at,
          s.updated_at,
          COALESCE(
            ARRAY_AGG(sc.category_id) FILTER (WHERE sc.category_id IS NOT NULL),
            '{}'::int[]
          ) AS category_ids
        FROM suppliers s
        LEFT JOIN supplier_categories sc ON sc.supplier_id = s.id
        GROUP BY s.id
        ORDER BY COALESCE(NULLIF(s.business_name, ''), s.name) ASC, s.id ASC
      `;

      const categories = await loadCategories(sql);

      return send(res, 200, {
        ok: true,
        suppliers: (suppliers || []).map((r) => ({
          id: r.id,
          name: r.name,
          businessName: r.business_name ?? "",
          contactName: r.contact_name ?? "",
          phone: r.phone ?? "",
          email: r.email ?? "",
          website: r.website ?? "",
          supplierCountry: r.supplier_country ?? "",
          supplierCity: r.supplier_city ?? "",
          categoryIds: Array.isArray(r.category_ids) ? r.category_ids : [],
        })),
        categories: categories.map((c) => ({ id: c.id, name: c.name })),
      });
    }

    // -------------------------
    // POST /api/suppliers
    // -------------------------
    if (method === "POST") {
      const auth = await requireUserFromReq(req, res, { rolesAny: ["main"] });
      if (!auth) return;

      let body;
      try {
        body = await readJson(req);
      } catch {
        return send(res, 400, { ok: false, error: "Invalid JSON body" });
      }

      // UI label is "Business Name" but you also keep "name" in DB (NOT NULL)
      // We'll store:
      // - name: always required (fallback to business/contact)
      // - business_name: optional but if empty -> becomes contact_name (rule)
      const businessNameRaw = cleanStr(body?.businessName);
      const contactName = cleanStr(body?.contactName);
      const phone = cleanStr(body?.phone);
      const email = cleanStr(body?.email);
      const website = cleanStr(body?.website);
      const supplierCountry = cleanStr(body?.supplierCountry);
      const supplierCity = cleanStr(body?.supplierCity);

      // Rule: if business name empty => set it to contact name
      const businessName = businessNameRaw || contactName || null;

      // name must exist (db NOT NULL).
      // We’ll set name to businessName if present, else contactName, else body.name
      const name =
        cleanStr(body?.name) ||
        businessName ||
        contactName;

      if (!name) {
        return send(res, 400, { ok: false, error: "Business Name (or Contact Name) is required" });
      }

      const categoryIds = Array.isArray(body?.categoryIds)
        ? body.categoryIds.map(n).filter((x) => x > 0)
        : [];

      const result = await sql.begin(async (tx) => {
        const rows = await tx`
          INSERT INTO suppliers (
            name, business_name, contact_name, phone, email, website,
            supplier_country, supplier_city
          )
          VALUES (
            ${name},
            ${businessName},
            ${contactName},
            ${phone},
            ${email},
            ${website},
            ${supplierCountry},
            ${supplierCity}
          )
          RETURNING id
        `;
        const supplierId = rows?.[0]?.id;

        if (supplierId && categoryIds.length) {
          for (const cid of categoryIds) {
            await tx`
              INSERT INTO supplier_categories (supplier_id, category_id)
              VALUES (${supplierId}, ${cid})
              ON CONFLICT (supplier_id, category_id) DO NOTHING
            `;
          }
        }

        return supplierId;
      });

      return send(res, 201, { ok: true, id: result });
    }

    // -------------------------
    // PATCH /api/suppliers
    // -------------------------
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
      if (!id) return send(res, 400, { ok: false, error: "id is required" });

      const businessNameRaw = cleanStr(body?.businessName);
      const contactName = cleanStr(body?.contactName);
      const phone = cleanStr(body?.phone);
      const email = cleanStr(body?.email);
      const website = cleanStr(body?.website);
      const supplierCountry = cleanStr(body?.supplierCountry);
      const supplierCity = cleanStr(body?.supplierCity);

      const businessName = businessNameRaw || contactName || null;
      const name = cleanStr(body?.name) || businessName || contactName;

      if (!name) {
        return send(res, 400, { ok: false, error: "Business Name (or Contact Name) is required" });
      }

      const categoryIds = Array.isArray(body?.categoryIds)
        ? body.categoryIds.map(n).filter((x) => x > 0)
        : [];

      await sql.begin(async (tx) => {
        await tx`
          UPDATE suppliers
          SET
            name = ${name},
            business_name = ${businessName},
            contact_name = ${contactName},
            phone = ${phone},
            email = ${email},
            website = ${website},
            supplier_country = ${supplierCountry},
            supplier_city = ${supplierCity},
            updated_at = NOW()
          WHERE id = ${id}
        `;

        // Replace category assignments (simple + reliable)
        await tx`DELETE FROM supplier_categories WHERE supplier_id = ${id}`;

        if (categoryIds.length) {
          for (const cid of categoryIds) {
            await tx`
              INSERT INTO supplier_categories (supplier_id, category_id)
              VALUES (${id}, ${cid})
              ON CONFLICT (supplier_id, category_id) DO NOTHING
            `;
          }
        }
      });

      return send(res, 200, { ok: true });
    }

    // -------------------------
    // DELETE /api/suppliers?id=123
    // -------------------------
    if (method === "DELETE") {
      const auth = await requireUserFromReq(req, res, { rolesAny: ["main"] });
      if (!auth) return;

      const url = new URL(req.url, "http://localhost");
      const id = n(url.searchParams.get("id"));
      if (!id) return send(res, 400, { ok: false, error: "id is required" });

      const references = await sql`
        SELECT COUNT(*)::int AS count
        FROM batches
        WHERE supplier_id = ${id}
          AND COALESCE(is_void, false) = false
      `;
      if (Number(references?.[0]?.count || 0) > 0) {
        return send(res, 400, { ok: false, error: "Cannot delete supplier with existing batches" });
      }

      await sql.begin(async (tx) => {
        // supplier_categories will cascade delete, but safe anyway
        await tx`DELETE FROM supplier_categories WHERE supplier_id = ${id}`;
        await tx`DELETE FROM suppliers WHERE id = ${id}`;
      });

      return send(res, 200, { ok: true });
    }

    return send(res, 405, { ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("api/suppliers error:", err);
    return send(res, 500, { ok: false, error: "Server error", detail: String(err?.message || err) });
  }
}
