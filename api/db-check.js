mkdir -p api
cat > api/db-check.js <<'JS'
import postgres from "postgres";

export default async function handler(req, res) {
  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ ok: false, error: "DATABASE_URL missing in Vercel env vars" });
    }

    const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 5 });
    const r = await sql`SELECT NOW() AS now`;
    await sql.end({ timeout: 5 });

    return res.status(200).json({ ok: true, now: r[0].now });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
JS
