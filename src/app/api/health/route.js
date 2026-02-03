export async function GET() {
  const result = {
    ok: false,
    env: process.env.VERCEL_ENV || "unknown",
    hasDb: Boolean(process.env.DATABASE_URL),
  };

  try {
    // If you use `pg`, use it here. Otherwise, just report env presence for now.
    // Minimal check without leaking secrets:
    result.ok = true;
    return Response.json(result, { status: 200 });
  } catch (e) {
    result.error = e?.message || String(e);
    return Response.json(result, { status: 500 });
  }
}
