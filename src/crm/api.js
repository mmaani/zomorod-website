import { getToken, logout } from "./auth.js";

const API_BASE = (import.meta.env.VITE_API_BASE || "/api").replace(/\/$/, "");

function normalizePath(path) {
  if (!path) return API_BASE;

  if (/^https?:\/\//i.test(path)) return path; // full URL
  if (path.startsWith("/api/")) return path;   // already correct

  const p = path.startsWith("/") ? path : `/${path}`;
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
  }

  return res;
}

export async function apiJson(path, options = {}) {
  const res = await apiFetch(path, options);
  let data = null;
  try {
    data = await res.json();
  } catch {
    // ignore
  }

  if (!res.ok) {
    const msg = data?.error || `HTTP ${res.status}`;
    const detail = data?.detail ? `: ${data.detail}` : "";
    throw new Error(`${msg}${detail}`);
  }
  return data;
}
