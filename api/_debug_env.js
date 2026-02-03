export default function handler(req, res) {
  // Never return secrets; just confirm presence
  const hasJwt = Boolean(process.env.JWT_SECRET);
  const hasDb = Boolean(process.env.DATABASE_URL);

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ ok: true, hasJwt, hasDb }));
}
