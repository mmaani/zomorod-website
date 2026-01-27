import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

/*
 * Authentication helpers for the Zomorod CRM backend.  These helpers
 * provide functions to hash and verify passwords using bcrypt and to
 * sign and verify JWT tokens.  The previous implementation imported
 * a `requireAuth` function from the RBAC module that was unused.  The
 * unused import has been removed to avoid circular dependencies and
 * unnecessary code.
 */

// Resolve the secret used to sign JWTs from the environment.  If the
// secret is missing, throw a descriptive error so configuration issues
// surface early at runtime.
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is missing in the environment variables.");
  }
  return secret;
}

/**
 * Hash a plaintext password.  This function uses bcrypt with a
 * reasonable default number of salt rounds.  It returns a promise that
 * resolves with the hashed password.
 *
 * @param {string} password The plaintext password to hash
 * @returns {Promise<string>} The bcrypt hash of the password
 */
export async function hashPassword(password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Compare a plaintext password against a previously hashed password.
 * Returns a boolean indicating whether the password matches the hash.
 *
 * @param {string} password The plaintext password supplied by the user
 * @param {string} passwordHash The bcrypt hash stored in the database
 * @returns {Promise<boolean>} True if the password matches the hash
 */
export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

/**
 * Sign a JWT payload.  Uses the JWT secret from the environment and
 * provides a default expiration of seven days.  Additional options may
 * be passed to override the defaults (e.g. expiresIn).
 *
 * @param {object} payload Arbitrary claims to encode in the token
 * @param {object} options Optional JWT signing options
 * @returns {string} A signed JWT
 */
export function signJwt(payload, options = {}) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d", ...options });
}

/**
 * Verify a JWT and return its decoded payload.  Throws if the token
 * signature is invalid or expired.  Uses the same secret as signJwt.
 *
 * @param {string} token The encoded JWT
 * @returns {object} The decoded payload
 */
export function verifyJwt(token) {
  return jwt.verify(token, getJwtSecret());
}

/**
 * Extract a bearer token from a Request object.  This helper is used
 * by some API routes to retrieve the JWT from the Authorization header.
 *
 * @param {Request} request A Fetch API Request
 * @returns {string|null} The token string if present, otherwise null
 */
export function getBearerToken(request) {
  const h = request.headers.get("authorization") || "";
  if (!h.toLowerCase().startsWith("bearer ")) return null;
  return h.slice(7).trim();
}