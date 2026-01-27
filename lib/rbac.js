import { verifyToken } from "./jwt.js";
import { getBearerToken } from "./http.js";
import { requireAuth } from '../lib/rbac.js';


export function requireAuth(request) {
  const token = getBearerToken(request);
  if (!token) {
    return { ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  try {
    const payload = verifyToken(token); // { userId, roles }
    return { ok: true, userId: payload.userId, roles: payload.roles || [] };
  } catch {
    return { ok: false, response: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }
}

export function requireRole(roles, allowed) {
  const ok = allowed.some((r) => roles.includes(r));
  if (!ok) {
    return { ok: false, response: Response.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true };
}
