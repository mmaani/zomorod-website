import { requireUserFromReq } from "../lib/requireAuth.js";

function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

export const config = { runtime: "nodejs" };

// Returns basic user info for an authenticated request.
export default async function handler(req, res) {
  const user = await requireUserFromReq(req, res);
  if (!user) return;

  return send(res, 200, {
    ok: true,
    user: {
      id: user.sub || null,
      email: user.email || null,
      fullName: user.fullName || null,
      roles: user.roles || [],
    },
  });
}