import { verifyJwt } from "./jwt.js";
import { getBearerToken } from "./http.js";

/*
 * Simple role-based access control helpers.  These functions can be
 * reused by edge/serverless functions that accept Fetch API Request
 * objects.  The previous version incorrectly imported its own
 * `requireAuth` function, which led to a circular import and was
 * unused.  That import has been removed.
 */

/**
 * Require a valid JWT on the request.  Returns an object with
 * `{ ok: true, userId, roles }` if the token is valid.  Otherwise
 * returns `{ ok: false, response }` where `response` is a
 * Response-like object to be returned by the route handler.
 *
 * @param {Request} request A Fetch API Request
 */
export function requireAuth(request) {
  const token = getBearerToken(request);
  if (!token) {
    return {
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  try {
    const payload = verifyJwt(token); // { userId, roles }
    return { ok: true, userId: payload.userId, roles: payload.roles || [] };
  } catch {
    return {
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
}

/**
 * Require that a user’s roles include at least one of the allowed roles.
 * Returns `{ ok: true }` if allowed, otherwise `{ ok: false, response }`
 * with a 403 error.
 *
 * @param {string[]} roles The roles of the current user
 * @param {string[]} allowed Roles that are permitted to perform the action
 */
export function requireRole(roles, allowed) {
  const ok = allowed.some((r) => roles.includes(r));
  if (!ok) {
    return {
      ok: false,
      response: Response.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { ok: true };
}