import { execSync } from 'child_process';
import dotenv from 'dotenv';
import { logger } from '../src/utils/logger';

dotenv.config();

if (!process.env.TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL environment variable is not set');
}

// Rate limiting is disabled in setup-before.ts (runs before modules are imported)
// Only set it here if it wasn't set (as a fallback)
if (process.env.RATE_LIMIT_ENABLED === undefined) {
  process.env.RATE_LIMIT_ENABLED = 'false';
}

if (process.env.RATE_LIMIT_AUTH_MAX === undefined) {
  process.env.RATE_LIMIT_AUTH_MAX = '1000'; // High limit for existing tests
}

if (process.env.RATE_LIMIT_API_MAX === undefined) {
  process.env.RATE_LIMIT_API_MAX = '10000'; // High limit for existing tests
}

if (process.env.RATE_LIMIT_GLOBAL_MAX === undefined) {
  process.env.RATE_LIMIT_GLOBAL_MAX = '20000'; // High limit for existing tests
}

if (process.env.RATE_LIMIT_WINDOW_MS === undefined) {
  process.env.RATE_LIMIT_WINDOW_MS = '60000'; // 1 minute default for tests
}

beforeAll(async () => {
  try {
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
      stdio: 'inherit',
    });
  } catch (error) {
    logger.error({ err: error }, 'Migration failed');
    throw error;
  }
});

