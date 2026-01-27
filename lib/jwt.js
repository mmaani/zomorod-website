
// lib/jwt.js
import jwt from "jsonwebtoken";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET missing");
  return secret;
}

export function signJwt(payload, options = {}) {
  return jwt.sign(payload, getSecret(), { expiresIn: "7d", ...options });
}

export function verifyJwt(token) {
  return jwt.verify(token, getSecret());
}
