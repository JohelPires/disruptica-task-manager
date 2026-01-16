import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export function errorMiddleware(error: Error, _req: Request, res: Response, _next: NextFunction): Response | void {
  if (error instanceof ZodError) {
    const errorMessages = error.errors.map((e) => {
      const field = e.path.length > 0 ? e.path.join('.') : 'body';
      const message = e.message === 'Required' 
        ? `${field} is required` 
        : `${field}: ${e.message}`;
      return message;
    });
    
    return res.status(400).json({
      error: {
        message: errorMessages.join(', '),
        code: 'VALIDATION_ERROR',
        details: error.errors,
      },
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        error: {
          message: 'A record with this value already exists',
          code: 'DUPLICATE_ENTRY',
        },
      });
    }

    if (error.code === 'P2025') {
      return res.status(404).json({
        error: {
          message: 'Record not found',
          code: 'NOT_FOUND',
        },
      });
    }

    return res.status(500).json({
      error: {
        message: 'Database error',
        code: 'DATABASE_ERROR',
      },
    });
  }

  if (error.message === 'User with this email already exists') {
    return res.status(409).json({
      error: {
        message: error.message,
        code: 'DUPLICATE_EMAIL',
      },
    });
  }

  if (error.message === 'Invalid email or password') {
    return res.status(401).json({
      error: {
        message: error.message,
        code: 'INVALID_CREDENTIALS',
      },
    });
  }

  if (error.message === 'User not found') {
    return res.status(404).json({
      error: {
        message: error.message,
        code: 'USER_NOT_FOUND',
      },
    });
  }

  if (error.message === 'Project not found') {
    return res.status(404).json({
      error: {
        message: error.message,
        code: 'PROJECT_NOT_FOUND',
      },
    });
  }

  if (error.message === 'Task not found') {
    return res.status(404).json({
      error: {
        message: error.message,
        code: 'TASK_NOT_FOUND',
      },
    });
  }

  if (error.message === 'Comment not found') {
    return res.status(404).json({
      error: {
        message: error.message,
        code: 'COMMENT_NOT_FOUND',
      },
    });
  }

  if (error.message === 'Access denied') {
    return res.status(403).json({
      error: {
        message: error.message,
        code: 'ACCESS_DENIED',
      },
    });
  }

  if (error.message === 'Invalid or expired token') {
    return res.status(401).json({
      error: {
        message: error.message,
        code: 'INVALID_TOKEN',
      },
    });
  }

  console.error('Unhandled error:', error);

  return res.status(500).json({
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
  });
}

