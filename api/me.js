import { requireAuth } from './lib/rbac.js';

// Returns basic user info (userId and roles) for an authenticated request.
// The `requireAuth` helper returns { ok, userId, roles } or { ok: false, response }.
export default {
  async fetch(request) {
    const a = requireAuth(request);
    if (!a.ok) return a.response;

    return Response.json({ ok: true, userId: a.userId, roles: a.roles });
  }
};
