import dotenv from 'dotenv';

dotenv.config();

/**
 * Centralized environment configuration.
 * Validates required variables and provides defaults for optional settings.
 */
export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  TEST_DATABASE_URL: process.env.TEST_DATABASE_URL!,
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  // Logging configuration
  LOG_LEVEL: process.env.LOG_LEVEL,
  // Proxy configuration
  // Parse TRUST_PROXY as number (e.g., '1' for one proxy) or false if disabled
  // This prevents express-rate-limit from throwing ERR_ERL_PERMISSIVE_TRUST_PROXY
  TRUST_PROXY: process.env.TRUST_PROXY === 'false' 
    ? false 
    : process.env.TRUST_PROXY 
      ? parseInt(process.env.TRUST_PROXY, 10) || 1 
      : 1,
  // Rate limiting configuration
  // Enabled by default unless explicitly set to 'false' (allows opt-out for testing)
  RATE_LIMIT_ENABLED: process.env.RATE_LIMIT_ENABLED !== 'false',
  // Stricter limits for auth endpoints to mitigate brute-force attacks
  RATE_LIMIT_AUTH_MAX: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '5', 10),
  // More lenient limits for authenticated API endpoints
  RATE_LIMIT_API_MAX: parseInt(process.env.RATE_LIMIT_API_MAX || '100', 10),
  // Global fallback limit applied to all endpoints
  RATE_LIMIT_GLOBAL_MAX: parseInt(process.env.RATE_LIMIT_GLOBAL_MAX || '200', 10),
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
};

const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];

// Skip validation in test environment to allow flexible test setup
if (process.env.NODE_ENV !== 'test') {
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
}

