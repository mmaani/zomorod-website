#!/usr/bin/env node
// Lightweight supplier API smoke test
// Usage: BASE_URL=http://localhost:3000 node scripts/test_suppliers_api.mjs

import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

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
  if (!res.ok) {
    const errText = [
      data?.error,
      data?.detail,
      data?.message,
      typeof data === "string" ? data : "",
    ]
      .filter(Boolean)
      .join(" | ");
    if (errText) console.log(`  ↳ error: ${errText}`);
  }
  return { res, data };
}

function logStep(name, ok, extra = "") {
  const status = ok ? "PASS" : "FAIL";
  console.log(`[${status}] ${name}${extra ? " — " + extra : ""}`);
}

function getArgValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return "";
  return process.argv[idx + 1] || "";
}

const seedEnabled = !process.argv.includes("--no-seed");
const seedName = getArgValue("--seed-name") || "General";

async function seedCategoryViaProducts(name = "General") {
  try {
    const url = baseUrl.replace(/\/$/, "");
    const res = await fetch(`${url}/api/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({
        productCode: `SEED-${Date.now()}`,
        officialName: "Seed Product",
        marketName: "Seed Product",
        category: name,
        defaultSellPriceJod: 0,
        priceTiers: [],
      }),
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  } catch (e) {
    return { res: { ok: false, status: 0 }, data: { error: e?.message || "Seed failed" } };
  }
}

async function seedCategoryDirectDb(name = "General") {
  const url = process.env.DATABASE_URL;
  if (!url) return { ok: false, error: "DATABASE_URL not set" };
  try {
    const { default: postgres } = await import("postgres");
    const sql = postgres(url, {
      ssl: "require",
      max: 1,
      idle_timeout: 10,
      connect_timeout: 10,
    });
    const existing = await sql`
      SELECT id, name
      FROM product_categories
      WHERE lower(name) = lower(${name})
      LIMIT 1
    `;
    if (!existing?.length) {
      await sql`INSERT INTO product_categories (name) VALUES (${name})`;
    }
    await sql.end({ timeout: 5 });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

(async () => {
  console.log(`Base URL: ${baseUrl}`);

  // 1) GET suppliers (and categories)
  const g1 = await req("/api/suppliers");
  logStep("GET /api/suppliers", g1.res.ok && g1.data?.ok, `status=${g1.res.status}`);

  const categories = Array.isArray(g1.data?.categories) ? g1.data.categories : [];
  const primaryCategoryId = categories[0]?.id || null;

  if (!primaryCategoryId) {
    console.log("No categories found. Attempting to seed a default category...");
    if (!seedEnabled) {
      console.log("Seeding disabled (--no-seed). Create a product category before POST tests.");
      process.exit(1);
    }
    const seed = await seedCategoryViaProducts(seedName);
    if (!seed.res.ok || !seed.data?.ok) {
      console.log(
        `Seed via /api/products failed (status=${seed.res.status || "?"}). Trying direct DB seed...`
      );
      const dbSeed = await seedCategoryDirectDb(seedName);
      if (!dbSeed.ok) {
        console.log(
          `Direct DB seed failed: ${dbSeed.error || "unknown error"}. Create a product category before POST tests.`
        );
        process.exit(1);
      }
    }
    const g1b = await req("/api/suppliers");
    const categories2 = Array.isArray(g1b.data?.categories) ? g1b.data.categories : [];
    if (!categories2.length) {
      console.log("No categories found after seeding. Cannot continue.");
      process.exit(1);
    }
    console.log("Seeded category successfully.");
    const primaryCategoryId2 = categories2[0]?.id || null;
    if (!primaryCategoryId2) {
      console.log("No categories found after seeding. Cannot continue.");
      process.exit(1);
    }
    // Use the seeded category for tests
    globalThis.__primaryCategoryId = primaryCategoryId2;
  }

  const catId = globalThis.__primaryCategoryId || primaryCategoryId;

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
    primaryCategoryId: catId,
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
    primaryCategoryId: catId,
    secondaryCategoryIds: [],
  };
  const p2 = await req("/api/suppliers", { method: "PATCH", body: JSON.stringify(patchPayload) });
  logStep("PATCH /api/suppliers", p2.res.ok && p2.data?.ok, `status=${p2.res.status}`);

  // 4) search
  const g2 = await req("/api/suppliers?q=Test%20Supplier");
  logStep("GET /api/suppliers?q=...", g2.res.ok && g2.data?.ok, `status=${g2.res.status}`);

  // 5) category filter
  const g3 = await req(`/api/suppliers?categoryId=${catId}`);
  logStep("GET /api/suppliers?categoryId=", g3.res.ok && g3.data?.ok, `status=${g3.res.status}`);

  console.log("Done.");
})().catch((err) => {
  console.error("Smoke test error:", err);
  process.exit(1);
});
