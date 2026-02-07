// src/crm/auth.js
import { apiFetch } from "./api.js";

/**
 * Client-side auth helpers for ZOMOROD CRM
 * - If "Remember me" is ON  -> store token/user in localStorage (persists after browser restart)
 * - If "Remember me" is OFF -> store token/user in sessionStorage (clears when tab/window closes)
 *
 * Mobile-safe: avoids crashes when Web Storage is blocked (iOS Private Mode / in-app browsers).
 */

const TOKEN_KEY = "zcrm_token";
const USER_KEY = "zcrm_user";
const REMEMBER_KEY = "zcrm_remember";

// In-memory fallback (survives until refresh)
const memory = new Map();
const memoryStorage = {
  getItem: (k) => (memory.has(k) ? memory.get(k) : null),
  setItem: (k, v) => memory.set(k, String(v)),
  removeItem: (k) => memory.delete(k),
};

function hasWindow() {
  return typeof window !== "undefined";
}

function safeGetStorage(type) {
  // type: "localStorage" | "sessionStorage"
  if (!hasWindow()) return memoryStorage;

  try {
    const s = window[type];
    // Probe: some browsers throw only on setItem
    const testKey = "__zcrm_storage_test__";
    s.setItem(testKey, "1");
    s.removeItem(testKey);
    return s;
  } catch {
    return memoryStorage;
  }
}

function safeGetItem(storage, key) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(storage, key, value) {
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemoveItem(storage, key) {
  try {
    storage.removeItem(key);
  } catch {
    // ignore
  }
}

function getAnyStorageItem(key) {
  // Prefer localStorage (long-term) then sessionStorage, with fallback.
  const ls = safeGetStorage("localStorage");
  const ss = safeGetStorage("sessionStorage");
  return safeGetItem(ls, key) ?? safeGetItem(ss, key) ?? null;
}

function clearKeyEverywhere(key) {
  safeRemoveItem(safeGetStorage("localStorage"), key);
  safeRemoveItem(safeGetStorage("sessionStorage"), key);
  safeRemoveItem(memoryStorage, key);
}

function storageForRemember(remember) {
  return remember ? safeGetStorage("localStorage") : safeGetStorage("sessionStorage");
}

function setRememberFlag(remember) {
  // Remember flag is best-effort (don’t crash if storage blocked)
  safeSetItem(safeGetStorage("localStorage"), REMEMBER_KEY, remember ? "1" : "0");
}

export function getRememberFlag() {
  return safeGetItem(safeGetStorage("localStorage"), REMEMBER_KEY) === "1";
}

/** Token */
export function getToken() {
  return getAnyStorageItem(TOKEN_KEY);
}

export function setToken(token, remember = true) {
  // Clear old copies first to avoid conflicts
  clearKeyEverywhere(TOKEN_KEY);

  const target = storageForRemember(remember);
  safeSetItem(target, TOKEN_KEY, token);
  setRememberFlag(remember);
}

export function clearToken() {
  clearKeyEverywhere(TOKEN_KEY);
}

/** User */
export function setUser(user, remember = true) {
  const v = JSON.stringify(user || null);

  // Clear old copies first to avoid conflicts
  clearKeyEverywhere(USER_KEY);

  const target = storageForRemember(remember);
  safeSetItem(target, USER_KEY, v);
  setRememberFlag(remember);
}

export function getUser() {
  try {
    const raw = getAnyStorageItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Session helpers */
export function isLoggedIn() {
  return !!getToken();
}

export function logout() {
  clearToken();
  clearKeyEverywhere(USER_KEY);
  // keep REMEMBER_KEY as-is so checkbox can default to last choice
}

/**
 * Login
 * @param {string} email
 * @param {string} password
 * @param {boolean} rememberMe store in localStorage if true, else sessionStorage
 */
export async function login(email, password, rememberMe = true) {
  
  const normalizedEmail = String(email || "")
   .trim()
   .toLowerCase()
   .replace("@zoomorodmedical.com", "@zomorodmedical.com");

  const res = await apiFetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: normalizedEmail, password }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `Login failed (${res.status})`);
  }

  setToken(data.token, rememberMe);
  setUser(data.user, rememberMe);
  return data;
}

export async function fetchMe() {
  // keep as-is (depends on how apiFetch prefixes routes in your project)
  const res = await apiFetch("/me", { method: "GET" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed to load profile");

  // store user in the same storage type as current token
  // IMPORTANT: use safe storage access (no direct window.localStorage)
  const rememberMe = !!safeGetItem(safeGetStorage("localStorage"), TOKEN_KEY);
  setUser(data.user, rememberMe);

  return data.user;
}

export async function forgotPassword(email) {
  const res = await fetch("/api/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || data.detail || `Request failed (${res.status})`);
  }
  return data;
}

export function hasRole(role) {
  const u = getUser();
  return (u?.roles || []).includes(role);
}
