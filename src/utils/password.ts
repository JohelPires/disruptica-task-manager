import bcrypt from 'bcrypt';

/**
 * Number of bcrypt salt rounds.
 * 10 rounds balances security and performance for most applications.
 */
const SALT_ROUNDS = 10;

/**
 * Hashes a plaintext password using bcrypt.
 * Uses a fixed number of salt rounds to ensure consistent hashing time.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compares a plaintext password against a bcrypt hash.
 * Uses constant-time comparison to prevent timing attacks.
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

