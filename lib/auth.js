import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(scryptCb);
const bcryptModulePromise = import("bcryptjs")
  .then((m) => m.default || m)
  .catch(() => null);
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

function isBcryptHash(raw) {
  return /^\$2[abxy]?\$\d{2}\$/.test(raw);
}

async function verifyScryptPassword(password, passwordHash) {
  const parts = String(passwordHash || "").split("$");
  if (parts.length !== 3 || parts[0] !== HASH_PREFIX) return false;

  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");
  if (!salt.length || !expected.length) return false;

  const derived = Buffer.from(await scrypt(String(password), salt, expected.length));
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

/**
 * Verify a plaintext password against supported hash formats.
 * Supports:
 * - scrypt hashes produced by this codebase (s2$...)
 * - legacy bcrypt hashes ($2a$ / $2b$ / $2y$)
 */
export async function verifyPassword(password, passwordHash) {
  const raw = String(passwordHash || "");

  if (raw.startsWith(`${HASH_PREFIX}$`)) {
    return verifyScryptPassword(password, raw);
  }

  if (isBcryptHash(raw)) {
    const bcrypt = await bcryptModulePromise;
    if (!bcrypt?.compare) return false;
    return bcrypt.compare(String(password), raw);
  }

  return false;
}