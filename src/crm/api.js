import { getToken, logout } from "./auth.js";

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
