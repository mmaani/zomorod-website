import { verifyJwt } from "./jwt.js";

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

/**
 * Decide who can see purchase prices:
 * - main
 * - doctor
 * You can change this rule anytime.
 */
export function canSeePurchasePrice(roles = []) {
  return Array.isArray(roles) && (roles.includes("main") || roles.includes("doctor"));
}

/**
 * Node/Vercel auth helper
 */
export async function requireUserFromReq(req, res, opts = {}) {
  const auth = req.headers?.authorization || req.headers?.Authorization || "";
  const m = String(auth).match(/^Bearer\s+(.+)$/i);
  const token = m ? m[1] : null;

  if (!token) {
    send(res, 401, { ok: false, error: "Unauthorized" });
    return null;
  }

  const payload = verifyJwt(token);
  if (!payload) {
    send(res, 401, { ok: false, error: "Unauthorized" });
    return null;
  }

  const roles = payload.roles || [];
  if (opts.rolesAny?.length) {
    const ok = opts.rolesAny.some((r) => roles.includes(r));
    if (!ok) {
      send(res, 403, { ok: false, error: "Forbidden" });
      return null;
    }
  }

  return payload;
}
