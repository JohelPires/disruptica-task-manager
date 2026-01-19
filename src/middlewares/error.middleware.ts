import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { createChildLogger } from '../utils/logger'

/**
 * Global error handling middleware.
 *
 * Maps application errors to appropriate HTTP status codes and standardized error responses.
 * Handles validation errors, database errors, and business logic errors consistently.
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

    // Business logic errors - map common error messages to HTTP status codes
    // This approach allows services to throw simple errors that get automatically mapped
    if (error.message === 'User with this email already exists') {
        return res.status(409).json({
            error: {
                message: error.message,
                code: 'DUPLICATE_EMAIL',
            },
        })
    }

    if (error.message === 'Invalid email or password') {
        return res.status(401).json({
            error: {
                message: error.message,
                code: 'INVALID_CREDENTIALS',
            },
        })
    }

    if (error.message === 'User not found') {
        return res.status(404).json({
            error: {
                message: error.message,
                code: 'USER_NOT_FOUND',
            },
        })
    }

    if (error.message === 'Project not found') {
        return res.status(404).json({
            error: {
                message: error.message,
                code: 'PROJECT_NOT_FOUND',
            },
        })
    }

    if (error.message === 'Task not found') {
        return res.status(404).json({
            error: {
                message: error.message,
                code: 'TASK_NOT_FOUND',
            },
        })
    }

    if (error.message === 'Comment not found') {
        return res.status(404).json({
            error: {
                message: error.message,
                code: 'COMMENT_NOT_FOUND',
            },
        })
    }

    if (error.message === 'Access denied') {
        return res.status(403).json({
            error: {
                message: error.message,
                code: 'ACCESS_DENIED',
            },
        })
    }

    if (error.message === 'Invalid or expired token') {
        return res.status(401).json({
            error: {
                message: error.message,
                code: 'INVALID_TOKEN',
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
            errorCode: (error as any).code,
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
