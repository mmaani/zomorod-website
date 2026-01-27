import { getToken, logout } from "./auth.js";

/*
 * Wrapper around the Fetch API that prefixes API routes, attaches
 * authentication headers and automatically serializes plain objects
 * passed as the request body.  If the response status is 401 the
 * current session is cleared and the user is redirected to the login
 * screen.  The previous version omitted serialization of object
 * bodies which led to empty payloads being sent to the backend.
 */

const API_BASE = (import.meta.env.VITE_API_BASE || "/api").replace(/\/$/, "");

function normalizePath(path) {
  if (!path) return API_BASE;
  // Full URL
  if (/^https?:\/\//i.test(path)) return path;
  // already /api/*
  if (path.startsWith("/api/")) return path;
  // ensure leading slash
  const p = path.startsWith("/") ? path : `/${path}`;
  // prefix /api
  return `${API_BASE}${p}`;
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const url = normalizePath(path);
  const headers = { ...(options.headers || {}) };
  let body = options.body;
  const isFormData = body instanceof FormData;
  // If a plain object is passed as the body and no explicit Content‑Type is
  // set, assume JSON and serialize.  Do not touch strings, FormData or
  // other binary types.
  const hasContentType = headers["Content-Type"] || headers["content-type"];
  if (!isFormData && body && typeof body === 'object' && !(body instanceof String)) {
    if (!hasContentType) headers["Content-Type"] = "application/json";
    body = JSON.stringify(body);
  }
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { ...options, headers, body });
  if (res.status === 401) {
    logout();
    window.location.href = "/crm/login";
    return res;
  }
  return res;
}