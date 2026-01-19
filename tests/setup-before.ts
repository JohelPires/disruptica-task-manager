// This file runs BEFORE any test files are loaded
// Set environment variables that need to be available when modules are imported

// Disable rate limiting by default for all tests
// Individual test files (like rateLimiter.test.ts) can override this
process.env.RATE_LIMIT_ENABLED = 'false';

