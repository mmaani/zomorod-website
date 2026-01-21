import postgres from "postgres";

export default {
  async fetch() {
    const raw = String(process.env.DATABASE_URL || "");

    const diag = {
      hasValue: raw.length > 0,
      length: raw.length,
      startsWith: raw.slice(0, 12),       // should be "postgresql://"
      hasWhitespace: /\s/.test(raw),
      hasScheme:
        raw.startsWith("postgresql://") || raw.startsWith("postgres://"),
    };

    try {
      // Validate URL format before using postgres()
      new URL(raw);
    } catch (e) {
      return Response.json(
        { ok: false, error: "Invalid URL", diag },
        { status: 500 }
      );
    }

    try {
      const sql = postgres(raw, { ssl: "require", max: 1 });
      const r = await sql`SELECT NOW() AS now`;
      await sql.end();
      return Response.json({ ok: true, now: r[0].now, diag });
    } catch (e) {
      return Response.json(
        { ok: false, error: String(e?.message || e), diag },
        { status: 500 }
      );
    }
  },
};
