// api/suppliers.js
import { getSql } from "../lib/db.js";
import { requireUserFromReq } from "../lib/requireAuth.js";

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  // Avoid caching JSON responses by browser/SW/CDN
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

const WORKFLOW_STATUSES = new Set([
  "HARVESTED",
  "UNDER_REVIEW",
  "ENRICHED",
  "APPROVED",
  "BLOCKED",
  "INACTIVE",
]);

const RISK_LEVELS = new Set(["LOW", "MED", "HIGH"]);

function cleanStatus(v) {
  const s = cleanStr(v, 40);
  if (!s) return null;
  const up = s.toUpperCase();
  return WORKFLOW_STATUSES.has(up) ? up : null;
}

function cleanRiskLevel(v) {
  const s = cleanStr(v, 10);
  if (!s) return null;
  const up = s.toUpperCase();
  return RISK_LEVELS.has(up) ? up : null;
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
  const host = req.headers?.host || "localhost";
  const proto = (req.headers?.["x-forwarded-proto"] || "http").toString();
  return new URL(req.url || "/", `${proto}://${host}`);
}

function getPathId(url) {
  const parts = (url.pathname || "").split("/").filter(Boolean);
  if (parts.length >= 3 && parts[0] === "api" && parts[1] === "suppliers") {
    const id = Number(parts[2]);
    return Number.isFinite(id) && id > 0 ? id : 0;
  }
  return 0;
}

export default async function handler(req, res) {
  try {
    const method = req.method || "GET";
    const sql = getSql();
    const url = getReqUrl(req);
    const pathId = getPathId(url);

    // -------------------------
    // GET /api/suppliers
    // supports:
    //   ?q=term
    //   ?categoryId=7
    //   ?limit=500 (default 500, max 2000)
    // -------------------------
    if (method === "GET") {
      const auth = await requireUserFromReq(req, res);
      if (!auth) return;

      const q = cleanStr(url.searchParams.get("q"), 120);
      const categoryId = n(url.searchParams.get("categoryId")) || 0;

      const limitRaw = n(url.searchParams.get("limit"));
      const limit = Math.min(Math.max(limitRaw || 500, 1), 2000);

      const like = q ? `%${q}%` : null;

      const suppliers = await sql`
        SELECT
          s.id,
          s.name,
          s.business_name,
          s.legal_name,
          s.contact_name,
          s.phone,
          s.phone_whatsapp,
          s.email,
          s.website,
          s.supplier_country,
          s.supplier_city,
          s.supplier_type,
          s.workflow_status,
          s.risk_level,
          s.certifications_iso13485,
          s.certifications_ce,
          s.certifications_other,
          s.evidence_url,
          s.expected_price_range_usd,
          s.source_name,
          s.source_url,
          s.notes,
          s.primary_category_id,
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
          (
            ${q}::text IS NULL
            OR COALESCE(NULLIF(s.business_name, ''), '') ILIKE ${like}
            OR COALESCE(NULLIF(s.legal_name, ''), '') ILIKE ${like}
            OR COALESCE(NULLIF(s.name, ''), '') ILIKE ${like}
            OR COALESCE(NULLIF(s.contact_name, ''), '') ILIKE ${like}
            OR COALESCE(NULLIF(s.email, ''), '') ILIKE ${like}
            OR COALESCE(NULLIF(s.phone, ''), '') ILIKE ${like}
            OR COALESCE(NULLIF(s.website, ''), '') ILIKE ${like}
            OR COALESCE(NULLIF(s.supplier_country, ''), '') ILIKE ${like}
            OR COALESCE(NULLIF(s.supplier_city, ''), '') ILIKE ${like}
          )
          AND (
            ${categoryId}::int = 0
            OR EXISTS (
              SELECT 1
              FROM supplier_categories sc2
              WHERE sc2.supplier_id = s.id
                AND sc2.category_id = ${categoryId}
            )
            OR s.primary_category_id = ${categoryId}
          )
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
          legalName: r.legal_name ?? "",
          contactName: r.contact_name ?? "",
          phone: r.phone ?? "",
          phoneWhatsapp: r.phone_whatsapp ?? "",
          email: r.email ?? "",
          website: r.website ?? "",
          supplierCountry: r.supplier_country ?? "",
          supplierCity: r.supplier_city ?? "",
          supplierType: r.supplier_type ?? "",
          workflowStatus: r.workflow_status ?? "",
          riskLevel: r.risk_level ?? "",
          certificationsIso13485: r.certifications_iso13485 ?? "",
          certificationsCe: r.certifications_ce ?? "",
          certificationsOther: r.certifications_other ?? "",
          evidenceUrl: r.evidence_url ?? "",
          expectedPriceRangeUsd: r.expected_price_range_usd ?? "",
          sourceName: r.source_name ?? "",
          sourceUrl: r.source_url ?? "",
          notes: r.notes ?? "",
          primaryCategoryId: r.primary_category_id ?? null,
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

      const legalNameRaw = cleanStr(body?.legalName, 200);
      const businessNameRaw = cleanStr(body?.businessName, 200);
      const nameRaw = cleanStr(body?.name, 200);
      const contactName = cleanStr(body?.contactName, 200);
      const phone = cleanStr(body?.phone, 50);
      const phoneWhatsapp = cleanStr(body?.phoneWhatsapp, 50);
      const email = cleanEmail(body?.email);
      const website = cleanUrl(body?.website);
      const supplierCountry = cleanStr(body?.supplierCountry, 120);
      const supplierCity = cleanStr(body?.supplierCity, 120);
      const supplierType = cleanStr(body?.supplierType, 80);
      const workflowStatus = cleanStatus(body?.workflowStatus);
      const riskLevel = cleanRiskLevel(body?.riskLevel);
      const certificationsIso13485 = cleanStr(body?.certificationsIso13485, 120);
      const certificationsCe = cleanStr(body?.certificationsCe, 120);
      const certificationsOther = cleanStr(body?.certificationsOther, 255);
      const evidenceUrl = cleanUrl(body?.evidenceUrl);
      const expectedPriceRangeUsd = cleanStr(body?.expectedPriceRangeUsd, 120);
      const sourceName = cleanStr(body?.sourceName, 200);
      const sourceUrl = cleanUrl(body?.sourceUrl);
      const notes = cleanStr(body?.notes, 2000);
      const primaryCategoryId = n(body?.primaryCategoryId) || 0;

      const legalName = legalNameRaw || businessNameRaw || nameRaw || contactName || null;
      const businessName = businessNameRaw || legalName;
      const name = nameRaw || legalName;

      if (!legalName) {
        return send(res, 400, { ok: false, error: "Legal Name is required" });
      }
      if (!supplierCountry) {
        return send(res, 400, { ok: false, error: "Country is required" });
      }
      if (!workflowStatus) {
        return send(res, 400, { ok: false, error: "Workflow Status is required" });
      }
      if (!riskLevel) {
        return send(res, 400, { ok: false, error: "Risk Level is required" });
      }
      if (!primaryCategoryId) {
        return send(res, 400, { ok: false, error: "Primary Category is required" });
      }

      const categoryIds = uniqPositiveInts(body?.secondaryCategoryIds || body?.categoryIds);

      const supplierId = await sql.begin(async (tx) => {
        const rows = await tx`
          INSERT INTO suppliers (
            name, business_name, legal_name, contact_name, phone, phone_whatsapp, email, website,
            supplier_country, supplier_city, supplier_type, workflow_status, risk_level,
            certifications_iso13485, certifications_ce, certifications_other,
            evidence_url, expected_price_range_usd, source_name, source_url, notes,
            primary_category_id
          )
          VALUES (
            ${name},
            ${businessName},
            ${legalName},
            ${contactName},
            ${phone},
            ${phoneWhatsapp},
            ${email},
            ${website},
            ${supplierCountry},
            ${supplierCity},
            ${supplierType},
            ${workflowStatus},
            ${riskLevel},
            ${certificationsIso13485},
            ${certificationsCe},
            ${certificationsOther},
            ${evidenceUrl},
            ${expectedPriceRangeUsd},
            ${sourceName},
            ${sourceUrl},
            ${notes},
            ${primaryCategoryId}
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

      const id = n(body?.id) || pathId;
      if (!id) return send(res, 400, { ok: false, error: "id is required" });

      const legalNameRaw = cleanStr(body?.legalName, 200);
      const businessNameRaw = cleanStr(body?.businessName, 200);
      const nameRaw = cleanStr(body?.name, 200);
      const contactName = cleanStr(body?.contactName, 200);
      const phone = cleanStr(body?.phone, 50);
      const phoneWhatsapp = cleanStr(body?.phoneWhatsapp, 50);
      const email = cleanEmail(body?.email);
      const website = cleanUrl(body?.website);
      const supplierCountry = cleanStr(body?.supplierCountry, 120);
      const supplierCity = cleanStr(body?.supplierCity, 120);
      const supplierType = cleanStr(body?.supplierType, 80);
      const workflowStatus = cleanStatus(body?.workflowStatus);
      const riskLevel = cleanRiskLevel(body?.riskLevel);
      const certificationsIso13485 = cleanStr(body?.certificationsIso13485, 120);
      const certificationsCe = cleanStr(body?.certificationsCe, 120);
      const certificationsOther = cleanStr(body?.certificationsOther, 255);
      const evidenceUrl = cleanUrl(body?.evidenceUrl);
      const expectedPriceRangeUsd = cleanStr(body?.expectedPriceRangeUsd, 120);
      const sourceName = cleanStr(body?.sourceName, 200);
      const sourceUrl = cleanUrl(body?.sourceUrl);
      const notes = cleanStr(body?.notes, 2000);
      const primaryCategoryId = n(body?.primaryCategoryId) || 0;

      const legalName = legalNameRaw || businessNameRaw || nameRaw || contactName || null;
      const businessName = businessNameRaw || legalName;
      const name = nameRaw || legalName;

      if (!legalName) {
        return send(res, 400, { ok: false, error: "Legal Name is required" });
      }
      if (!supplierCountry) {
        return send(res, 400, { ok: false, error: "Country is required" });
      }
      if (!workflowStatus) {
        return send(res, 400, { ok: false, error: "Workflow Status is required" });
      }
      if (!riskLevel) {
        return send(res, 400, { ok: false, error: "Risk Level is required" });
      }
      if (!primaryCategoryId) {
        return send(res, 400, { ok: false, error: "Primary Category is required" });
      }

      const categoryIds = uniqPositiveInts(body?.secondaryCategoryIds || body?.categoryIds);

      await sql.begin(async (tx) => {
        await tx`
          UPDATE suppliers
          SET
            name = ${name},
            business_name = ${businessName},
            legal_name = ${legalName},
            contact_name = ${contactName},
            phone = ${phone},
            phone_whatsapp = ${phoneWhatsapp},
            email = ${email},
            website = ${website},
            supplier_country = ${supplierCountry},
            supplier_city = ${supplierCity},
            supplier_type = ${supplierType},
            workflow_status = ${workflowStatus},
            risk_level = ${riskLevel},
            certifications_iso13485 = ${certificationsIso13485},
            certifications_ce = ${certificationsCe},
            certifications_other = ${certificationsOther},
            evidence_url = ${evidenceUrl},
            expected_price_range_usd = ${expectedPriceRangeUsd},
            source_name = ${sourceName},
            source_url = ${sourceUrl},
            notes = ${notes},
            primary_category_id = ${primaryCategoryId},
            updated_at = NOW()
          WHERE id = ${id}
        `;

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
        return send(res, 400, { ok: false, error: "Cannot delete supplier with existing batches" });
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
    return send(res, 500, { ok: false, error: "Server error", detail: String(err?.message || err) });
  }
}
