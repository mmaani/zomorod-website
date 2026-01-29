import { getToken, logout } from "./auth.js";

/**
 * API base path:
 * - On Vercel: "/api"
 * - You can override with VITE_API_BASE (ex: "https://www.zomorodmedical.com/api")
 */
const API_BASE = (import.meta.env.VITE_API_BASE || "/api").replace(/\/$/, "");

/** Normalize path so callers can pass "/api/x" or "/x" */
function normalizePath(path) {
  if (!path) return API_BASE;

  // Full URL
  if (/^https?:\/\//i.test(path)) return path;

  // Already prefixed
  if (path.startsWith("/api/")) return path;

  // Prefix with API_BASE
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

function isPlainObject(v) {
  return v && typeof v === "object" && v.constructor === Object;
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const url = normalizePath(path);

  const opts = { ...options };
  const headers = { ...(opts.headers || {}) };

  // Auto JSON for plain object bodies
  if (isPlainObject(opts.body)) {
    opts.body = JSON.stringify(opts.body);
    if (!headers["Content-Type"] && !headers["content-type"]) {
      headers["Content-Type"] = "application/json";
    }
  }

  // Add auth header
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(url, { ...opts, headers });
  } catch (e) {
    // network or DNS error
    const msg = e?.message || "Network error";
    throw new Error(msg);
  }

  // If unauthorized, force logout
  if (res.status === 401) {
    logout();
    window.location.href = "/crm/login";
    return res;
  }

  // Helpful debugging: if server errors, try to show detail
  if (res.status >= 500) {
    const data = await safeJson(res);
    const detail = data?.detail || data?.error || `HTTP ${res.status}`;
    console.error("API 5xx:", url, data);
    throw new Error(detail);
  }

  return res;
}
