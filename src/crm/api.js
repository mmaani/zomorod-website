import { getToken, logout } from "./auth.js";

/**
 * API base path:
 * - On Vercel: "/api"
 * - You can override with VITE_API_BASE
 */
const API_BASE = (import.meta.env.VITE_API_BASE || "/api").replace(/\/$/, "");

/** Normalize path so callers can pass "/products" or "/api/products" */
function normalizePath(path) {
  if (!path) return API_BASE;

  // full URL
  if (/^https?:\/\//i.test(path)) return path;

  // already /api/...
  if (path.startsWith("/api/")) return path;

  // ensure leading slash then prefix with /api
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

/** Detect plain objects (not FormData, not string, not Blob, etc.) */
function isPlainObject(v) {
  return v && typeof v === "object" && v.constructor === Object;
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const url = normalizePath(path);

  // clone options so we can safely modify
  const opts = { ...options };

  // Build headers
  const headers = { ...(opts.headers || {}) };

  // If body is a plain object, JSON.stringify it
  if (isPlainObject(opts.body)) {
    opts.body = JSON.stringify(opts.body);
    if (!headers["Content-Type"] && !headers["content-type"]) {
      headers["Content-Type"] = "application/json";
    }
  }

  // If body is not FormData and Content-Type isn't set, default to JSON for safety
  const isFormData = typeof FormData !== "undefined" && opts.body instanceof FormData;
  if (!isFormData && opts.body && !headers["Content-Type"] && !headers["content-type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...opts, headers });

  if (res.status === 401) {
    logout();
    window.location.href = "/crm/login";
    return res;
  }

  return res;
}
