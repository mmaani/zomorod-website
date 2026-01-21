import postgres from "postgres";

let _sql = null;

export function getSql() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    // Don’t throw at module load time — only throw when the function is actually called.
    throw new Error("DATABASE_URL is missing in the environment variables.");
  }

  // Create once, reuse across invocations (good for serverless).
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
