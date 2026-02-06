import postgres from "postgres";

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

export default async function handler(_req, res) {
  const raw = String(process.env.DATABASE_URL || "");
  const diag = {
    hasValue: raw.length > 0,
    length: raw.length,
    startsWith: raw.slice(0, 12),
    hasWhitespace: /\s/.test(raw),
    hasScheme: raw.startsWith("postgresql://") || raw.startsWith("postgres://"),
  };

  try {
    new URL(raw);
  } catch {
    return send(res, 500, { ok: false, error: "Invalid URL", diag });
  }

  try {
    const sql = postgres(raw, { ssl: "require", max: 1 });
    const r = await sql`SELECT NOW() AS now`;
    await sql.end();
    return send(res, 200, { ok: true, now: r[0].now, diag });
  } catch (e) {
    return send(res, 500, { ok: false, error: String(e?.message || e), diag });
  }
  }

