import jwt from "jsonwebtoken";

/**
 * Preferred names used by your API code:
 * - signJwt(payload)
 * - verifyJwt(token)
 *
 * Backward-compatible aliases:
 * - signToken(payload)
 * - verifyToken(token)
 */

function mustHaveSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET missing");
  }
}

export function signJwt(payload) {
  mustHaveSecret();
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
}

export function verifyJwt(token) {
  mustHaveSecret();
  return jwt.verify(token, process.env.JWT_SECRET);
}

// Backward compatible exports (so old imports won't break)
export const signToken = signJwt;
export const verifyToken = verifyJwt;
