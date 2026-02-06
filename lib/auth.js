import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(scryptCb);
const HASH_PREFIX = "s2";

/**
 * Hash a plaintext password using Node's built-in scrypt.
 * Stored format: s2$<saltHex>$<derivedKeyHex>
 */
export async function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = await scrypt(String(password), salt, 64);
  return `${HASH_PREFIX}$${salt.toString("hex")}$${Buffer.from(derived).toString("hex")}`;
}

/**
 * Verify a plaintext password against an scrypt hash.
 * Returns false for malformed or unsupported hash formats.
 */
export async function verifyPassword(password, passwordHash) {
    const raw = String(passwordHash || "");
  const parts = raw.split("$");
  if (parts.length !== 3 || parts[0] !== HASH_PREFIX) return false;

  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");
  if (!salt.length || !expected.length) return false;

  const derived = Buffer.from(await scrypt(String(password), salt, expected.length));
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}