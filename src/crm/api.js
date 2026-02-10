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

async function safeText(res) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

function safeRedirectToLogin() {
  if (typeof window === "undefined") return;

  const path = window.location?.pathname || "";
  if (path.startsWith("/crm/login")) return;

  try {
    if (window.__zcrm_redirecting_to_login) return;
    window.__zcrm_redirecting_to_login = true;
  } catch {
    // ignore
  }

  try {
    window.location.replace("/crm/login");
  } catch {
    window.location.href = "/crm/login";
  }
}

function getRefId(res) {
  return (
    res.headers.get("x-vercel-id") ||
    res.headers.get("x-request-id") ||
    res.headers.get("cf-ray") ||
    ""
  );
}

function buildErrorMessageFromResponse(res, dataOrText) {
  if (dataOrText && typeof dataOrText === "object") {
    const msg = dataOrText.error || dataOrText.detail || dataOrText.message;
    if (msg) return String(msg);
  }

  const t = typeof dataOrText === "string" ? dataOrText.trim() : "";
  if (t) return t.length > 180 ? `${t.slice(0, 180)}…` : t;

  return `HTTP ${res.status}`;
}

/**
 * Backward-compatible:
 * - returns Response for 2xx + 3xx + 4xx (except 401 triggers logout+redirect and returns Response)
 * - throws only for network errors, timeouts, and 5xx
 *
 * Extra option:
 * - timeoutMs: number (e.g., 15000)
 */
export async function apiFetch(path, options = {}) {
  const token = getToken();
  const url = normalizePath(path);

  // Extract our custom options (don’t pass to fetch)
  const { timeoutMs, ...rest } = options || {};

  const opts = { ...rest };
  const headers = { ...(opts.headers || {}) };

  // Default Accept header (safe)
  if (!headers.Accept && !headers.accept) headers.Accept = "application/json";

  // Auto JSON for plain object bodies
  if (isPlainObject(opts.body)) {
    opts.body = JSON.stringify(opts.body);
    if (!headers["Content-Type"] && !headers["content-type"]) {
      headers["Content-Type"] = "application/json";
    }
  }

  // Add auth header
  if (token) headers.Authorization = `Bearer ${token}`;

  // Optional timeout
  let controller;
  let timeout;
  if (Number.isFinite(Number(timeoutMs)) && Number(timeoutMs) > 0) {
    controller = new AbortController();
    opts.signal = controller.signal;
    timeout = setTimeout(() => controller.abort(), Number(timeoutMs));
  }

  let res;
  try {
    res = await fetch(url, { ...opts, headers });
  } catch (e) {
    if (timeout) clearTimeout(timeout);

    // Abort / timeout
    if (e?.name === "AbortError") {
      throw new Error(`Request timeout${timeoutMs ? ` (${timeoutMs}ms)` : ""}`);
    }

    // Network/DNS
    throw new Error(e?.message || "Network error");
  } finally {
    if (timeout) clearTimeout(timeout);
  }

  // 401 => logout + redirect; return response so callers won't crash
  if (res.status === 401) {
    logout();
    safeRedirectToLogin();
    return res;
  }

  // Throw ONLY for 5xx (keep 4xx behavior for existing pages & allSettled logic)
  if (res.status >= 500) {
    const data = await safeJson(res);
    const text = data ? "" : await safeText(res);
    const msg = buildErrorMessageFromResponse(res, data || text);
    const ref = getRefId(res);

    console.error("API 5xx:", {
      url,
      status: res.status,
      ref,
      data: data || (text ? text.slice(0, 500) : ""),
    });

    throw new Error(ref ? `${msg} (ref: ${ref})` : msg);
  }

  return res;
}

/**
 * Convenience helper (optional):
 * - Fetches + parses JSON
 * - Throws on any non-OK or {ok:false}
 * - Returns parsed JSON object
 */
export async function apiJson(path, options = {}) {
  const res = await apiFetch(path, options);

  // Handle 204 No Content
  if (res.status === 204) return { ok: true };

  const data = await safeJson(res);
  if (!data) {
    const t = await safeText(res);
    const msg = buildErrorMessageFromResponse(res, t);
    throw new Error(msg);
  }

  if (!res.ok || data.ok === false) {
    const msg = buildErrorMessageFromResponse(res, data);
    throw new Error(msg);
  }

  return data;
}
