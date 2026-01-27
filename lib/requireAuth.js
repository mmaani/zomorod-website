import { verifyJwt } from "./jwt.js";

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

export async function requireUserFromReq(req, res, opts = {}) {
  const auth = req.headers?.authorization || req.headers?.Authorization || "";
  const m = String(auth).match(/^Bearer\s+(.+)$/i);
  const token = m ? m[1] : null;

  if (!token) {
    send(res, 401, { ok: false, error: "Unauthorized" });
    return null;
  }

  const payload = verifyJwt(token); // must exist in lib/jwt.js
  if (!payload) {
    send(res, 401, { ok: false, error: "Unauthorized" });
    return null;
  }

  // role check (optional)
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
