// api/debug-env.js
export default function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  const has = (k) => Boolean(process.env[k] && String(process.env[k]).trim());

  res.status(200).end(
    JSON.stringify(
      {
        ok: true,
        now: new Date().toISOString(),
        env: process.env.VERCEL_ENV || null,
        region: process.env.VERCEL_REGION || null,

        // Only booleans — do NOT leak values
        has_DATABASE_URL: has("DATABASE_URL"),
        has_JWT_SECRET: has("JWT_SECRET"),
        has_SETUP_TOKEN: has("SETUP_TOKEN"),
      },
      null,
      2
    )
  );
}
