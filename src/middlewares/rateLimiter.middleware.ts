import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { AuthRequest } from './auth.middleware';

// Strict rate limiter for authentication endpoints (register, login)
export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_AUTH_MAX,
  message: {
    error: {
      message: 'Too many authentication attempts, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: () => !env.RATE_LIMIT_ENABLED, // Skip if rate limiting is disabled
});

// Moderate rate limiter for authenticated API endpoints
export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_API_MAX,
  message: {
    error: {
      message: 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !env.RATE_LIMIT_ENABLED,
  // Use user ID if available, otherwise fall back to IP
  keyGenerator: (req) => {
    const userId = (req as AuthRequest).user?.userId;
    return userId ? `user:${userId}` : req.ip || 'unknown';
  },
});

// Global rate limiter (catch-all for all endpoints)
export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_GLOBAL_MAX,
  message: {
    error: {
      message: 'Too many requests from this IP, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !env.RATE_LIMIT_ENABLED,
});

