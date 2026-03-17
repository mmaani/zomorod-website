// api/secure-env.js
import { requireUserFromReq } from "../lib/requireAuth.js";

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  res.end(JSON.stringify(payload));
}

function hasEnv(key) {
  const v = process.env[key];
  return Boolean(v && String(v).trim());
}

function hasGoogleServiceAccount() {
  const b64 = process.env.GOOGLE_SA_B64;
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (b64) {
    try {
      const raw = Buffer.from(b64, "base64").toString("utf8");
      const parsed = JSON.parse(raw);
      return Boolean(parsed?.client_email && parsed?.private_key);
    } catch {
      return false;
    }
  }

  if (json) {
    try {
      const parsed = JSON.parse(json);
      return Boolean(parsed?.client_email && parsed?.private_key);
    } catch {
      return false;
    }
  }

  return false;
}

export default async function handler(req, res) {
  const auth = await requireUserFromReq(req, res);
  if (!auth) return;

  const env = {
    database: hasEnv("DATABASE_URL"),
    jwtSecret: hasEnv("JWT_SECRET"),
    googleServiceAccount: hasGoogleServiceAccount(),
    googleOauth:
      hasEnv("GOOGLE_OAUTH_CLIENT_ID") &&
      hasEnv("GOOGLE_OAUTH_CLIENT_SECRET") &&
      hasEnv("GOOGLE_OAUTH_REFRESH_TOKEN"),
  };

  return send(res, 200, { ok: true, env });
}
