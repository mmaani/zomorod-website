import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is missing in the environment variables.");
  return secret;
}

export async function hashPassword(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export function signJwt(payload, options = {}) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d", ...options });
}

export function verifyJwt(token) {
  return jwt.verify(token, getJwtSecret());
}

export function getBearerToken(request) {
  const h = request.headers.get("authorization") || "";
  if (!h.toLowerCase().startsWith("bearer ")) return null;
  return h.slice(7).trim();
}
