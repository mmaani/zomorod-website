// api/_debug_env.js
export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  // never print actual secrets
  const hasJwt = !!process.env.JWT_SECRET;
  const hasDb = !!process.env.DATABASE_URL;

  res.statusCode = 200;
  res.end(JSON.stringify({ ok: true, hasJwt, hasDb }));
}
