#!/usr/bin/env node
import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: ".env.local" });
dotenv.config();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const categoryName = process.argv[2] || "General";

const sql = postgres(url, {
  ssl: "require",
  max: 1,
  idle_timeout: 10,
  connect_timeout: 10,
});

async function run() {
  const existing = await sql`
    SELECT id, name
    FROM product_categories
    WHERE lower(name) = lower(${categoryName})
    LIMIT 1
  `;

  if (existing?.length) {
    console.log(`Category exists: ${existing[0].name} (id=${existing[0].id})`);
  } else {
    const inserted = await sql`
      INSERT INTO product_categories (name)
      VALUES (${categoryName})
      RETURNING id, name
    `;
    console.log(`Category created: ${inserted[0].name} (id=${inserted[0].id})`);
  }
}

run()
  .catch((e) => {
    console.error("Seed failed:", e?.message || e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end({ timeout: 5 });
  });
