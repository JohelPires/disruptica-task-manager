import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { env } from '../config/env';
import { AuthRequest } from './auth.middleware';

/**
 * Strict rate limiter for authentication endpoints (register, login).
 * Lower limits help mitigate brute-force and credential stuffing attacks.
 */
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

/**
 * Rate limiter for authenticated API endpoints.
 * Uses user ID as the key when available, falling back to IP address for unauthenticated requests.
 * Higher limits than auth endpoints since users are already authenticated.
 */
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
  // Use user ID if available, otherwise fall back to IP (with IPv6 support)
  // Per-user limiting prevents abuse while allowing legitimate concurrent requests
  keyGenerator: (req) => {
    const userId = (req as AuthRequest).user?.userId;
    if (userId) {
      return `user:${userId}`;
    }
    // Use ipKeyGenerator helper for proper IPv6 handling
    return ipKeyGenerator(req as any);
  },
});

/**
 * Global rate limiter applied to all endpoints as a catch-all.
 * Uses IP-based limiting as a last line of defense against abuse.
 */
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

