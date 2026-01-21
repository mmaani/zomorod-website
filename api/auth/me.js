import { requireAuth } from "../_lib/rbac.js";

export default {
  async fetch(request) {
    const a = requireAuth(request);
    if (!a.ok) return a.response;

    return Response.json({ ok: true, userId: a.userId, roles: a.roles });
  },
};
