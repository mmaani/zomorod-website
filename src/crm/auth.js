import { apiJson } from "./api.js";

const TOKEN_KEY = "zms_token";
const USER_KEY = "zms_user";

export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return Boolean(getToken());
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function hasRole(role) {
  const user = getUser();
  return Boolean(user?.roles?.includes(role));
}

export async function login(email, password) {
  const data = await apiJson("/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (!data?.ok || !data?.token) {
    throw new Error(data?.error || "Login failed");
  }

  setSession(data.token, data.user);
  return data.user;
}

export async function fetchMe() {
  const data = await apiJson("/me", { method: "GET" });
  return data;
}
