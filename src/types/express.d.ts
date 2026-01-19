import { JwtPayload } from '../utils/jwt';

/**
 * Express module augmentation to add user property to Request.
 * This provides type-safe access to authenticated user data throughout the application.
 */
declare global {
  namespace Express {
    interface Request {
      /**
       * Authenticated user data attached by the authentication middleware.
       * Optional because not all routes require authentication.
       * For protected routes, the requireAuth middleware guarantees this is present.
       */
      user?: JwtPayload;
    }
  }
}

export {};

