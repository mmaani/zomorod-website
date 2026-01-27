import { getToken, logout } from "./auth.js";

/**
 * API base path.
 * - In production on Vercel: "/api"
 * - Optional override: VITE_API_BASE
 */
const API_BASE = (import.meta.env.VITE_API_BASE || "/api").replace(/\/$/, "");

/**
 * Ensures we always hit Vercel serverless functions under /api/*
 * - If caller passes "/api/login" => keep it
 * - If caller passes "login" or "/login" => becomes "/api/login"
 * - If caller passes full URL "https://..." => keep it
 */
function normalizePath(path) {
  if (!path) return API_BASE;

  // Full URL (leave it)
  if (/^https?:\/\//i.test(path)) return path;

  // Already /api/...
  if (path.startsWith("/api/")) return path;

  // Ensure leading slash
  const p = path.startsWith("/") ? path : `/${path}`;

  // Prefix with /api
  return `${API_BASE}${p}`;
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const url = normalizePath(path);

  const headers = { ...(options.headers || {}) };

  // Add JSON header only when not using FormData
  const isFormData = options.body instanceof FormData;
  if (!isFormData && !headers["Content-Type"] && !headers["content-type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    logout();
    window.location.href = "/crm/login";
    return res;
  }

  return res;
}

// Optional helpers (useful in LoginPage)
export async function login(email, password) {
  return apiFetch("/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function me() {
  return apiFetch("/me", { method: "GET" });
}
