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

function safeRedirectToLogin() {
  // Avoid crashing in non-browser contexts
  if (typeof window === "undefined") return;

  // Avoid redirect loops (already on login)
  const path = window.location?.pathname || "";
  if (path.startsWith("/crm/login")) return;

  // Guard: don’t redirect repeatedly in a tight loop
  // (best-effort; if storage blocked, it still won’t crash)
  try {
    if (window.__zcrm_redirecting_to_login) return;
    window.__zcrm_redirecting_to_login = true;
  } catch {
    // ignore
  }

  // Use replace() to avoid back-button loops
  try {
    window.location.replace("/crm/login");
  } catch {
    window.location.href = "/crm/login";
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

  // If unauthorized, logout + redirect (without infinite reload loops)
  if (res.status === 401) {
    logout();
    safeRedirectToLogin();
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
