import { apiFetch } from "./api.js";

const TOKEN_KEY = "zcrm_token";
const USER_KEY = "zcrm_user";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function setUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user || null));
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return !!getToken();
}

export function logout() {
  clearToken();
  localStorage.removeItem(USER_KEY);
}

export async function login(email, password) {
  const res = await apiFetch("/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `Login failed (${res.status})`);
  }

  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
  return data;
}

export async function fetchMe() {
  const res = await apiFetch("/me", { method: "GET" });
  const data = await res.json();
  if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed to load profile");
  setUser(data.user);
  return data.user;
}

export function hasRole(role) {
  const u = getUser();
  return (u?.roles || []).includes(role);
}
