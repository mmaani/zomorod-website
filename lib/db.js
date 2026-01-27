import postgres from "postgres";

/*
 * Database connection helper.  Provides a singleton Postgres client
 * configured to talk to Neon or any other Postgres instance via the
 * DATABASE_URL environment variable.  The previous version imported
 * an unused `requireAuth` from the RBAC module – that import has been
 * removed here.  Connections are created lazily on first use and
 * reused across invocations to optimize serverless cold starts.
 */

let _sql = null;

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    // Don’t throw at module load time — only throw when the function
    // is actually called.  This avoids breaking static imports during
    // build steps if env vars are missing.
    throw new Error("DATABASE_URL is missing in the environment variables.");
  }

  // Create the client once, reuse across invocations (good for serverless).
  if (!_sql) {
    _sql = postgres(url, {
      // Works well with Neon pooled connection strings
      ssl: "require",
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return _sql;
}