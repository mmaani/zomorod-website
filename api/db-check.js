import postgres from "postgres";

export default {
  async fetch(request) {
    try {
      if (!process.env.DATABASE_URL) {
        return Response.json(
          { ok: false, error: "DATABASE_URL missing in Vercel env vars" },
          { status: 500 }
        );
      }

      const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });

      const r = await sql`SELECT NOW() AS now`;
      await sql.end();

      return Response.json({ ok: true, now: r[0].now });
    } catch (e) {
      console.error(e);
      return Response.json(
        { ok: false, error: String(e?.message || e) },
        { status: 500 }
      );
    }
  },
};
