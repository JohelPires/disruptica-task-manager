import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Extend Express Request type to include requestId
 */
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/**
 * Request ID middleware.
 * 
 * Generates a unique UUID for every incoming request and attaches it to:
 * - The request object (req.requestId)
 * - Response header (X-Request-Id)
 * - All logs via child logger context
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Generate or use existing request ID (useful for distributed tracing)
  const requestId = req.headers['x-request-id'] as string || randomUUID();
  
  // Attach to request object for use in controllers/services
  req.requestId = requestId;
  
  // Include in response header for client correlation
  res.setHeader('X-Request-Id', requestId);
  
  next();
}

