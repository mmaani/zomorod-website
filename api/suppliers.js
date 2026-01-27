// api/suppliers.js
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
  const x = String(v ?? "").trim();
  return x ? x : "";
}

export default async function handler(req, res) {
  try {
    const method = req.method || "GET";
    const sql = getSql();

    // -------------------------
    // GET /api/suppliers
    // -------------------------
    if (method === "GET") {
      const auth = await requireUserFromReq(req, res);
      if (!auth) return;

      const rows = await sql`
        SELECT
          s.id,
          s.business_name,
          s.contact_name,
          s.phone,
          s.email,
          s.website,
          s.supplier_country,
          s.supplier_city,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object('id', pc.id, 'name', pc.name)
            ) FILTER (WHERE pc.id IS NOT NULL),
            '[]'::json
          ) AS categories
        FROM suppliers s
        LEFT JOIN supplier_categories sc ON sc.supplier_id = s.id
        LEFT JOIN product_categories pc ON pc.id = sc.category_id
        GROUP BY s.id
        ORDER BY COALESCE(NULLIF(s.business_name,''), NULLIF(s.contact_name,''), s.name, '') ASC
      `;

      // Backward compatibility:
      // If your old UI relied on `name`, we return `name` as alias to business_name.
      const suppliers = rows.map((r) => ({
        id: r.id,
        // preferred
        business_name: r.business_name || "",
        contact_name: r.contact_name || "",
        // legacy field
        name: r.business_name || r.contact_name || "",
        phone: r.phone || "",
        email: r.email || "",
        website: r.website || "",
        supplier_country: r.supplier_country || "",
        supplier_city: r.supplier_city || "",
        categories: Array.isArray(r.categories) ? r.categories : [],
      }));

      return send(res, 200, { ok: true, suppliers });
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

      const businessNameRaw = s(body?.businessName);
      const contactName = s(body?.contactName);
      const businessName = businessNameRaw || contactName; // ✅ rule: fallback
      const phone = s(body?.phone) || null;
      const email = s(body?.email) || null;
      const website = s(body?.website) || null;

      const supplierCountry = s(body?.supplierCountry) || null; // ISO2 e.g. "JO"
      const supplierCity = s(body?.supplierCity) || null;

      const categoryNames = Array.isArray(body?.categoryNames)
        ? body.categoryNames.map((x) => s(x)).filter(Boolean)
        : [];

      if (!businessName) {
        return send(res, 400, { ok: false, error: "Business Name or Contact Name is required" });
      }

      const result = await sql.begin(async (tx) => {
        const ins = await tx`
          INSERT INTO suppliers (business_name, contact_name, phone, email, website, supplier_country, supplier_city, updated_at)
          VALUES (${businessName}, ${contactName || null}, ${phone}, ${email}, ${website}, ${supplierCountry}, ${supplierCity}, NOW())
          RETURNING id
        `;
        const supplierId = ins[0].id;

        // Upsert categories and create junction rows
        for (const name of categoryNames) {
          const cat = await tx`
            INSERT INTO product_categories (name)
            VALUES (${name})
            ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
            RETURNING id
          `;
          const categoryId = cat?.[0]?.id;
          if (!categoryId) continue;

          await tx`
            INSERT INTO supplier_categories (supplier_id, category_id)
            VALUES (${supplierId}, ${categoryId})
            ON CONFLICT DO NOTHING
          `;
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

      const id = Number(body?.id);
      if (!id) return send(res, 400, { ok: false, error: "ID is required" });

      const businessNameRaw = s(body?.businessName);
      const contactName = s(body?.contactName);
      const businessName = businessNameRaw || contactName; // ✅ rule: fallback

      const phone = s(body?.phone) || null;
      const email = s(body?.email) || null;
      const website = s(body?.website) || null;

      const supplierCountry = s(body?.supplierCountry) || null;
      const supplierCity = s(body?.supplierCity) || null;

      const categoryNames = Array.isArray(body?.categoryNames)
        ? body.categoryNames.map((x) => s(x)).filter(Boolean)
        : null; // null = do not modify; [] = clear all

      if (!businessName) {
        return send(res, 400, { ok: false, error: "Business Name or Contact Name is required" });
      }

      await sql.begin(async (tx) => {
        await tx`
          UPDATE suppliers
          SET
            business_name = ${businessName},
            contact_name = ${contactName || null},
            phone = ${phone},
            email = ${email},
            website = ${website},
            supplier_country = ${supplierCountry},
            supplier_city = ${supplierCity},
            updated_at = NOW()
          WHERE id = ${id}
        `;

        if (categoryNames !== null) {
          // Replace all categories for this supplier
          await tx`DELETE FROM supplier_categories WHERE supplier_id = ${id}`;

          for (const name of categoryNames) {
            const cat = await tx`
              INSERT INTO product_categories (name)
              VALUES (${name})
              ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
              RETURNING id
            `;
            const categoryId = cat?.[0]?.id;
            if (!categoryId) continue;

            await tx`
              INSERT INTO supplier_categories (supplier_id, category_id)
              VALUES (${id}, ${categoryId})
              ON CONFLICT DO NOTHING
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
      const id = Number(url.searchParams.get("id"));
      if (!id) return send(res, 400, { ok: false, error: "id is required" });

      const references = await sql`
        SELECT COUNT(*) AS count
        FROM batches
        WHERE supplier_id = ${id}
          AND COALESCE(is_void, false) = false
      `;
      if (Number(references?.[0]?.count || 0) > 0) {
        return send(res, 400, { ok: false, error: "Cannot delete supplier with existing batches" });
      }

      // supplier_categories will auto-delete via ON DELETE CASCADE if you used it
      await sql`DELETE FROM suppliers WHERE id = ${id}`;
      return send(res, 200, { ok: true });
    }

    return send(res, 405, { ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("api/suppliers error:", err);
    return send(res, 500, { ok: false, error: "Server error", detail: String(err?.message || err) });
  }
}
