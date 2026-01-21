import { verifyJwt, getBearerToken } from "../auth/auth.js";

export async function requireUser(request, { rolesAny = null } = {}) {
  const token = getBearerToken(request);
  if (!token) {
    return Response.json({ ok: false, error: "Missing token" }, { status: 401 });
  }

  let payload;
  try {
    payload = verifyJwt(token);
  } catch {
    return Response.json({ ok: false, error: "Invalid token" }, { status: 401 });
  }

  const roles = Array.isArray(payload.roles) ? payload.roles : [];
  if (rolesAny && !rolesAny.some((r) => roles.includes(r))) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  return {
    userId: payload.sub,
    email: payload.email,
    fullName: payload.fullName,
    roles,
  };
}

export function canSeePurchasePrice(roles) {
  return roles.includes("main") || roles.includes("doctor");
}
