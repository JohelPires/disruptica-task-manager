import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL environment variable is not set');
}

// Configure rate limits for testing (faster tests with lower limits)
// These can be overridden in individual test files if needed
if (process.env.RATE_LIMIT_ENABLED === undefined) {
  process.env.RATE_LIMIT_ENABLED = 'false'; // Disable by default for existing tests
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
    console.error('Migration failed:', error);
    throw error;
  }
});

