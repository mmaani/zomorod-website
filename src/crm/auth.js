// src/auth.js
import { apiFetch } from "./api.js";

/**
 * Client-side auth helpers for ZOMOROD CRM
 * - If "Remember me" is ON  -> store token/user in localStorage (persists after browser restart)
 * - If "Remember me" is OFF -> store token/user in sessionStorage (clears when tab/window closes)
 */

const TOKEN_KEY = "zcrm_token";
const USER_KEY = "zcrm_user";
const REMEMBER_KEY = "zcrm_remember"; // optional, helps UI remember last choice

function storageForRemember(remember) {
  return remember ? window.localStorage : window.sessionStorage;
}

function getAnyStorageItem(key) {
  // Prefer localStorage (long-term) then sessionStorage
  return (
    window.localStorage.getItem(key) ??
    window.sessionStorage.getItem(key) ??
    null
  );
}

function setRememberFlag(remember) {
  window.localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
}

export function getRememberFlag() {
  return window.localStorage.getItem(REMEMBER_KEY) === "1";
}

/** Token */
export function getToken() {
  return getAnyStorageItem(TOKEN_KEY);
}

export function setToken(token, remember = true) {
  // Clear old copies first to avoid conflicts
  window.localStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(TOKEN_KEY);

  storageForRemember(remember).setItem(TOKEN_KEY, token);
  setRememberFlag(remember);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(TOKEN_KEY);
}

/** User */
export function setUser(user, remember = true) {
  const v = JSON.stringify(user || null);

  // Clear old copies first to avoid conflicts
  window.localStorage.removeItem(USER_KEY);
  window.sessionStorage.removeItem(USER_KEY);

  storageForRemember(remember).setItem(USER_KEY, v);
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
  window.localStorage.removeItem(USER_KEY);
  window.sessionStorage.removeItem(USER_KEY);
  // keep REMEMBER_KEY as-is (so checkbox can default to last choice)
}

/**
 * Login
 * @param {string} email
 * @param {string} password
 * @param {boolean} rememberMe  store in localStorage if true, else sessionStorage
 */
export async function login(email, password, rememberMe = true) {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
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
  const rememberMe = window.localStorage.getItem(TOKEN_KEY) ? true : false;
  setUser(data.user, rememberMe);

  return data.user;
}

export function hasRole(role) {
  const u = getUser();
  return (u?.roles || []).includes(role);
}
