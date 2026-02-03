import bcrypt from "bcryptjs";

/*
 * Authentication helpers for the Zomorod CRM backend. These helpers
 * provide functions to hash and verify passwords using bcrypt.
 * JWT helpers live in lib/jwt.js to keep concerns separated.
 */

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
