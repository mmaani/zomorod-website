#!/usr/bin/env node
// Lightweight supplier API smoke test
// Usage: BASE_URL=http://localhost:3000 node scripts/test_suppliers_api.mjs

const baseUrl = process.env.BASE_URL || "http://localhost:3000";

const authToken = process.env.AUTH_TOKEN || "";

async function req(path, opts = {}) {
  const url = baseUrl.replace(/\/$/, "") + path;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

function logStep(name, ok, extra = "") {
  const status = ok ? "PASS" : "FAIL";
  console.log(`[${status}] ${name}${extra ? " — " + extra : ""}`);
}

(async () => {
  console.log(`Base URL: ${baseUrl}`);

  // 1) GET suppliers (and categories)
  const g1 = await req("/api/suppliers");
  logStep("GET /api/suppliers", g1.res.ok && g1.data?.ok, `status=${g1.res.status}`);

  const categories = Array.isArray(g1.data?.categories) ? g1.data.categories : [];
  const primaryCategoryId = categories[0]?.id || null;

  if (!primaryCategoryId) {
    console.log("No categories found. Create a product category before POST tests.");
    process.exit(1);
  }

  // 2) POST supplier (required fields)
  const payload = {
    legalName: "Test Supplier Co",
    contactName: "Test Contact",
    email: "test-supplier@example.com",
    phoneWhatsapp: "+962700000000",
    website: "https://example.com",
    supplierCountry: "Jordan",
    supplierCity: "Amman",
    supplierType: "Manufacturer",
    workflowStatus: "UNDER_REVIEW",
    riskLevel: "MED",
    primaryCategoryId,
    secondaryCategoryIds: [],
    certificationsIso13485: "Stated",
    certificationsCe: "Stated",
    certificationsOther: "",
    evidenceUrl: "https://example.com/certs",
    expectedPriceRangeUsd: "0.10-0.20",
    sourceName: "Manual",
    sourceUrl: "https://example.com",
    notes: "Smoke test supplier",
  };

  const p1 = await req("/api/suppliers", { method: "POST", body: JSON.stringify(payload) });
  logStep("POST /api/suppliers", p1.res.ok && p1.data?.ok, `status=${p1.res.status}`);

  const id = p1.data?.id;
  if (!id) {
    console.log("POST failed; cannot continue PATCH tests.");
    process.exit(1);
  }

  // 3) PATCH supplier
  const patchPayload = {
    id,
    legalName: "Test Supplier Co (Updated)",
    supplierCountry: "Jordan",
    workflowStatus: "ENRICHED",
    riskLevel: "LOW",
    primaryCategoryId,
    secondaryCategoryIds: [],
  };
  const p2 = await req("/api/suppliers", { method: "PATCH", body: JSON.stringify(patchPayload) });
  logStep("PATCH /api/suppliers", p2.res.ok && p2.data?.ok, `status=${p2.res.status}`);

  // 4) search
  const g2 = await req("/api/suppliers?q=Test%20Supplier");
  logStep("GET /api/suppliers?q=...", g2.res.ok && g2.data?.ok, `status=${g2.res.status}`);

  // 5) category filter
  const g3 = await req(`/api/suppliers?categoryId=${primaryCategoryId}`);
  logStep("GET /api/suppliers?categoryId=", g3.res.ok && g3.data?.ok, `status=${g3.res.status}`);

  console.log("Done.");
})().catch((err) => {
  console.error("Smoke test error:", err);
  process.exit(1);
});
