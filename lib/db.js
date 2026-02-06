import postgres from "postgres";

/*
 * Database connection helper. Provides a singleton Postgres client
 * configured to talk to Neon or any other Postgres instance.
 */

let _sql = null;

function cleanUrl(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  // Vercel UI copy/paste sometimes adds wrapping quotes.
  return s.replace(/^['"]|['"]$/g, "");
}

function resolveDatabaseUrl() {
  // Priority order keeps backward compatibility.
  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL_NON_POOLING,
  ];

  for (const c of candidates) {
    const v = cleanUrl(c);
    if (v) return v;
  }
  return "";
}

export function getSql() {
  const url = resolveDatabaseUrl();
  if (!url) {
    throw new Error(
      "DATABASE_URL is missing in environment variables (or POSTGRES_URL fallback)."
    );
  }

  if (!_sql) {
    _sql = postgres(url, {
      ssl: "require",
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return _sql;
}
