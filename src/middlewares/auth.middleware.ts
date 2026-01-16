import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction): Response | void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          message: 'Authentication required',
          code: 'AUTH_REQUIRED',
        },
      });
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    (req as AuthRequest).user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      error: {
        message: error instanceof Error ? error.message : 'Invalid token',
        code: 'INVALID_TOKEN',
      },
    });
  }
}

