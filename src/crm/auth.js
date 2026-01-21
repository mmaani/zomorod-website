const TOKEN_KEY = "zomorod_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Step 1: placeholder login (Step 2 will connect real backend + roles)
export async function login({ email, password }) {
  if (!email || !password) throw new Error("Missing credentials");
  setToken("dev-token");
}
