// Client-side authentication utilities for the CRM application.

const STORAGE_KEY = "crm_jwt_token";

export function getToken() {
  return localStorage.getItem(STORAGE_KEY) || null;
}

export function getUser() {
  const token = getToken();
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const data = JSON.parse(json);
    return data || null;
  } catch (err) {
    console.warn("Failed to decode JWT payload", err);
    return null;
  }
}

export function isLoggedIn() {
  const user = getUser();
  if (!user) return false;
  if (typeof user.exp === "number") {
    const now = Math.floor(Date.now() / 1000);
    if (user.exp < now) {
      logout();
      return false;
    }
  }
  return true;
}

export function hasRole(role) {
  const user = getUser();
  return !!(user && Array.isArray(user.roles) && user.roles.includes(role));
}

export async function login(email, password) {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok || !data?.token) {
    const msg = data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  localStorage.setItem(STORAGE_KEY, data.token);
}

export function logout() {
  localStorage.removeItem(STORAGE_KEY);
}
