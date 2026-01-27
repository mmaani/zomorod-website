import { verifyJwt } from "./jwt.js";

/*
 * Node/Vercel authentication helpers.  Provides a helper to read the
 * Authorization header from a Node-style request object and decode
 * the JWT.  Also exports a function to decide whether a user is
 * allowed to see purchase prices based on their roles.
 */

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

/**
 * Decide who can see purchase prices.
 * Roles allowed: 'main' and 'doctor'.  You can change this rule at
 * any time without modifying the rest of the code.
 *
 * @param {string[]} roles The roles associated with the authenticated user
 * @returns {boolean} True if the user may see purchase prices
 */
export function canSeePurchasePrice(roles = []) {
  return (
    Array.isArray(roles) &&
    (roles.includes("main") || roles.includes("doctor"))
  );
}

/**
 * Require an authenticated user from a Node request/response pair.
 * Reads the `Authorization` header, verifies the JWT and optionally
 * checks that the user has one of a set of required roles.  If the
 * token is missing or invalid, this helper sends a 401/403 response
 * automatically and returns null.  Otherwise it returns the decoded
 * payload containing at least `sub`, `email` and `roles`.
 *
 * Usage: `const auth = await requireUserFromReq(req, res, { rolesAny: ['main'] });`
 *
 * @param {IncomingMessage} req The Node request object
 * @param {ServerResponse} res The Node response object
 * @param {object} opts Optional options: `rolesAny` (array of roles, any of which must be present)
 * @returns {object|null} The decoded token payload if authorised, otherwise null
 */
export async function requireUserFromReq(req, res, opts = {}) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization || "";
  const m = String(authHeader).match(/^Bearer\s+(.+)$/i);
  const token = m ? m[1] : null;
  if (!token) {
    send(res, 401, { ok: false, error: "Unauthorized" });
    return null;
  }
  let payload;
  try {
    payload = verifyJwt(token);
  } catch {
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