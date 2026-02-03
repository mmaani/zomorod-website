// api/suppliers.js
import { getSql } from "../lib/db.js";
import { requireUserFromReq } from "../lib/requireAuth.js";

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  // Important for APIs in SPA/PWA environments:
  // avoid caching JSON responses by browser/SW/CDN.
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");

  res.end(JSON.stringify(payload));
}

function setCors(req, res) {
  // If you want to restrict origins, replace "*" with your domain:
  // https://www.zomorodmedical.com
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Setup-Token");
  res.setHeader("Access-Control-Max-Age", "86400");
}

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function cleanStr(v, maxLen = 255) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  if (s.length > maxLen) return s.slice(0, maxLen);
  return s;
}

function cleanEmail(v) {
  const s = cleanStr(v, 254);
  if (!s) return null;
  const lower = s.toLowerCase();
  // Very lightweight sanity check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lower)) return null;
  return lower;
}

function cleanUrl(v) {
  const s = cleanStr(v, 2048);
  if (!s) return null;

  // Allow users to type "example.com" and make it valid
  const candidate = s.startsWith("http://") || s.startsWith("https://") ? s : `https://${s}`;

  try {
    const u = new URL(candidate);
    // Only allow http/https
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

function uniqPositiveInts(arr) {
  const out = [];
  const seen = new Set();
  for (const v of Array.isArray(arr) ? arr : []) {
    const x = n(v);
    if (x > 0 && !seen.has(x)) {
      seen.add(x);
      out.push(x);
    }
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

async function loadCategories(sql) {
  const rows = await sql`
    SELECT id, name
    FROM product_categories
    ORDER BY name ASC
  `;
  return rows || [];
}

function getReqUrl(req) {
  // Works on Vercel + local Node, even if req.url is relative
  const host = req.headers?.host || "localhost";
  const proto = (req.headers?.["x-forwarded-proto"] || "http").toString();
  return new URL(req.url || "/", `${proto}://${host}`);
}

export default async function handler(req, res) {
  try {
    setCors(req, res);

    // Preflight
    if ((req.method || "GET") === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    const method = req.method || "GET";
    const sql = getSql();
    const url = getReqUrl(req);

    // -------------------------
    // GET /api/suppliers
    // returns: suppliers + categories
    // supports:
    //   ?q=term   (search business/name/contact)
    //   ?limit=200 (default 500)
    // -------------------------
    if (method === "GET") {
      const auth = await requireUserFromReq(req, res);
      if (!auth) return;

      const q = cleanStr(url.searchParams.get("q"), 80);
      const limitRaw = n(url.searchParams.get("limit"));
      const limit = Math.min(Math.max(limitRaw || 500, 1), 2000);

      const suppliers = q
        ? await sql`
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
                ARRAY_AGG(DISTINCT sc.category_id)
                  FILTER (WHERE sc.category_id IS NOT NULL),
                '{}'::int[]
              ) AS category_ids
            FROM suppliers s
            LEFT JOIN supplier_categories sc ON sc.supplier_id = s.id
            WHERE
              COALESCE(NULLIF(s.business_name, ''), '') ILIKE ${"%" + q + "%"}
              OR COALESCE(NULLIF(s.name, ''), '') ILIKE ${"%" + q + "%"}
              OR COALESCE(NULLIF(s.contact_name, ''), '') ILIKE ${"%" + q + "%"}
            GROUP BY s.id
            ORDER BY COALESCE(NULLIF(s.business_name, ''), s.name) ASC, s.id ASC
            LIMIT ${limit}
          `
        : await sql`
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
                ARRAY_AGG(DISTINCT sc.category_id)
                  FILTER (WHERE sc.category_id IS NOT NULL),
                '{}'::int[]
              ) AS category_ids
            FROM suppliers s
            LEFT JOIN supplier_categories sc ON sc.supplier_id = s.id
            GROUP BY s.id
            ORDER BY COALESCE(NULLIF(s.business_name, ''), s.name) ASC, s.id ASC
            LIMIT ${limit}
          `;

      const categories = await loadCategories(sql);

      return send(res, 200, {
        ok: true,
        suppliers: (suppliers || []).map((r) => ({
          id: r.id,
          name: r.name ?? "",
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

      const businessNameRaw = cleanStr(body?.businessName, 200);
      const contactName = cleanStr(body?.contactName, 200);
      const phone = cleanStr(body?.phone, 50);
      const email = cleanEmail(body?.email);
      const website = cleanUrl(body?.website);
      const supplierCountry = cleanStr(body?.supplierCountry, 120);
      const supplierCity = cleanStr(body?.supplierCity, 120);

      // Rule: if business name empty => set it to contact name
      const businessName = businessNameRaw || contactName || null;

      // name must exist (db NOT NULL)
      const name = cleanStr(body?.name, 200) || businessName || contactName;

      if (!name) {
        return send(res, 400, {
          ok: false,
          error: "Business Name (or Contact Name) is required",
        });
      }

      const categoryIds = uniqPositiveInts(body?.categoryIds);

      const supplierId = await sql.begin(async (tx) => {
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
        const id = rows?.[0]?.id;

        if (id && categoryIds.length) {
          for (const cid of categoryIds) {
            await tx`
              INSERT INTO supplier_categories (supplier_id, category_id)
              VALUES (${id}, ${cid})
              ON CONFLICT (supplier_id, category_id) DO NOTHING
            `;
          }
        }

        return id;
      });

      return send(res, 201, { ok: true, id: supplierId });
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

      const businessNameRaw = cleanStr(body?.businessName, 200);
      const contactName = cleanStr(body?.contactName, 200);
      const phone = cleanStr(body?.phone, 50);
      const email = cleanEmail(body?.email);
      const website = cleanUrl(body?.website);
      const supplierCountry = cleanStr(body?.supplierCountry, 120);
      const supplierCity = cleanStr(body?.supplierCity, 120);

      const businessName = businessNameRaw || contactName || null;
      const name = cleanStr(body?.name, 200) || businessName || contactName;

      if (!name) {
        return send(res, 400, {
          ok: false,
          error: "Business Name (or Contact Name) is required",
        });
      }

      const categoryIds = uniqPositiveInts(body?.categoryIds);

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

      const id = n(url.searchParams.get("id"));
      if (!id) return send(res, 400, { ok: false, error: "id is required" });

      const references = await sql`
        SELECT COUNT(*)::int AS count
        FROM batches
        WHERE supplier_id = ${id}
          AND COALESCE(is_void, false) = false
      `;

      if (Number(references?.[0]?.count || 0) > 0) {
        return send(res, 400, {
          ok: false,
          error: "Cannot delete supplier with existing batches",
        });
      }

      await sql.begin(async (tx) => {
        await tx`DELETE FROM supplier_categories WHERE supplier_id = ${id}`;
        await tx`DELETE FROM suppliers WHERE id = ${id}`;
      });

      return send(res, 200, { ok: true });
    }

    return send(res, 405, { ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("api/suppliers error:", err);
    return send(res, 500, {
      ok: false,
      error: "Server error",
      detail: String(err?.message || err),
    });
  }
}
