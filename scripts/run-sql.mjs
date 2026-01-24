import fs from "node:fs";
import postgres from "postgres";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/run-sql.mjs <path-to-sql-file>");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const sqlText = fs.readFileSync(file, "utf8");

// Neon + postgres: SSL is required
const sql = postgres(url, {
  ssl: "require",
  max: 1,
  idle_timeout: 10,
  connect_timeout: 10,
});

try {
  // Split and run statements safely (ignores empty chunks)
  const statements = sqlText
    .split(/;\s*$/m)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stmt of statements) {
    await sql.unsafe(stmt);
  }

  console.log("✅ Migration executed:", file);
} catch (e) {
  console.error("❌ Migration failed:", e);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
