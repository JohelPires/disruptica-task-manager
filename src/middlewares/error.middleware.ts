import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { createChildLogger } from '../utils/logger'
import { AppError } from '../errors/AppError'

/**
 * Map of error messages to error codes and HTTP status codes.
 * Used as fallback when errors don't have explicit codes.
 */
const ERROR_MESSAGE_MAP: Record<
    string,
    { code: string; statusCode: number }
> = {
    'User with this email already exists': {
        code: 'DUPLICATE_EMAIL',
        statusCode: 409,
    },
    'Invalid email or password': {
        code: 'INVALID_CREDENTIALS',
        statusCode: 401,
    },
    'User not found': {
        code: 'USER_NOT_FOUND',
        statusCode: 404,
    },
    'Project not found': {
        code: 'PROJECT_NOT_FOUND',
        statusCode: 404,
    },
    'Task not found': {
        code: 'TASK_NOT_FOUND',
        statusCode: 404,
    },
    'Comment not found': {
        code: 'COMMENT_NOT_FOUND',
        statusCode: 404,
    },
    'Access denied': {
        code: 'ACCESS_DENIED',
        statusCode: 403,
    },
    'Invalid or expired token': {
        code: 'INVALID_TOKEN',
        statusCode: 401,
    },
}

/**
 * Global error handling middleware.
 *
 * Maps application errors to appropriate HTTP status codes and standardized error responses.
 * Handles validation errors, database errors, and business logic errors consistently.
 * Uses explicit error codes when available (AppError), falls back to message matching for backward compatibility.
 */
export function errorMiddleware(
    error: Error,
    req: Request,
    res: Response,
    _next: NextFunction
): Response | void {
    // Create child logger with request context
    const requestLogger = createChildLogger({
        requestId: req.requestId,
        userId: req.user?.userId,
        endpoint: req.path,
        method: req.method,
    })

    // Zod validation errors - transform into user-friendly messages
    if (error instanceof ZodError) {
        const errorMessages = error.errors.map((e) => {
            const field = e.path.length > 0 ? e.path.join('.') : 'body'
            const message =
                e.message === 'Required'
                    ? `${field} is required`
                    : `${field}: ${e.message}`
            return message
        })

        return res.status(400).json({
            error: {
                message: errorMessages.join(', '),
                code: 'VALIDATION_ERROR',
                details: error.errors,
            },
        })
    }

    // Prisma database errors - map known error codes to HTTP status codes
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        const prismaError = error as Prisma.PrismaClientKnownRequestError
        // P2002: Unique constraint violation
        if (prismaError.code === 'P2002') {
            return res.status(409).json({
                error: {
                    message: 'A record with this value already exists',
                    code: 'DUPLICATE_ENTRY',
                },
            })
        }

        // P2025: Record not found (used in update/delete operations)
        if (prismaError.code === 'P2025') {
            return res.status(404).json({
                error: {
                    message: 'Record not found',
                    code: 'NOT_FOUND',
                },
            })
        }

        // Other Prisma errors - generic database error response
        return res.status(500).json({
            error: {
                message: 'Database error',
                code: 'DATABASE_ERROR',
            },
        })
    }

    // AppError with explicit error code - preferred approach
    if (error instanceof AppError) {
        return res.status(error.statusCode).json({
            error: {
                message: error.message,
                code: error.code,
            },
        })
    }

    // Business logic errors - map error messages to HTTP status codes
    // Fallback for backward compatibility with plain Error instances
    const errorMapping = ERROR_MESSAGE_MAP[error.message]
    if (errorMapping) {
        return res.status(errorMapping.statusCode).json({
            error: {
                message: error.message,
                code: errorMapping.code,
            },
        })
    }

    // Check for explicit error code on Error instance (for manually added codes)
    const errorWithCode = error as Error & { code?: string; statusCode?: number }
    if (errorWithCode.code && errorWithCode.statusCode) {
        return res.status(errorWithCode.statusCode).json({
            error: {
                message: error.message,
                code: errorWithCode.code,
            },
        })
    }


    // Unhandled errors - log for debugging but don't expose details to client
    // Log full error details including stack trace for server errors
    requestLogger.error(
        {
            err: error,
            errorName: error.name,
            errorMessage: error.message,
            errorCode: (error as Error & { code?: string }).code,
        },
        'Unhandled error'
    )

    return res.status(500).json({
        error: {
            message: 'Internal server error',
            code: 'INTERNAL_ERROR',
        },
    })
}
