import { Request, Response, NextFunction } from 'express'
import { prisma } from '../config/prisma'
import { createChildLogger } from '../utils/logger'

const IDEMPOTENCY_KEY_HEADER = 'idempotency-key'
const IDEMPOTENCY_TTL_HOURS = 24

/**
 * Idempotency middleware for POST endpoints that create resources.
 *
 * Prevents duplicate resource creation by:
 * 1. Extracting Idempotency-Key header from requests
 * 2. Checking if key exists and is valid (not expired)
 * 3. Returning cached response if found
 * 4. Storing response after successful creation (201 status)
 *
 * The idempotency key is scoped by:
 * - User ID (from auth token)
 * - HTTP method
 * - Request path (with path parameters included for scoping)
 * - The idempotency key value itself
 *
 * This ensures that:
 * - Same key can be used for different endpoints
 * - Same key can be used by different users
 * - Path parameters (like projectId, taskId) are included in the scope
 */
export function idempotencyMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
) {
    // Only apply to POST requests
    if (req.method !== 'POST') {
        return next()
    }

    const idempotencyKey = req.headers[IDEMPOTENCY_KEY_HEADER] as string

    // If no idempotency key provided, proceed normally
    if (!idempotencyKey) {
        return next()
    }

    // Validate idempotency key format (basic validation)
    if (typeof idempotencyKey !== 'string' || idempotencyKey.trim().length === 0) {
        return res.status(400).json({
            error: {
                message: 'Invalid idempotency key format',
                code: 'INVALID_IDEMPOTENCY_KEY',
            },
        })
    }

    const userId = (req as any).user?.userId
    if (!userId) {
        return res.status(401).json({
            error: {
                message: 'Authentication required for idempotency',
                code: 'UNAUTHORIZED',
            },
        })
    }

    // Build the scoped key: includes method, path, userId, and the idempotency key
    // Path includes route parameters (e.g., /projects/:projectId/tasks includes the actual projectId)
    const scopedKey = `${req.method}:${req.path}:${userId}:${idempotencyKey.trim()}`

    // Store original send and json methods
    const originalSend = res.send.bind(res)
    const originalJson = res.json.bind(res)

    // Track response data
    let responseData: any = null

    // Override res.json to capture response data
    res.json = function (body: any) {
        responseData = body
        return originalJson.call(this, body)
    }

    // Override res.send to capture response data
    res.send = function (body: any) {
        responseData = body
        return originalSend.call(this, body)
    }

    // Check for existing idempotency key
    prisma.idempotencyKey
        .findUnique({
            where: { key: scopedKey },
        })
        .then(async (existingKey) => {
            // If key exists and not expired, return cached response
            if (existingKey) {
                const now = new Date()
                if (existingKey.expiresAt > now) {
                    const requestLogger = createChildLogger({
                        requestId: req.requestId,
                        userId,
                        endpoint: req.path,
                        method: req.method,
                    })
                    requestLogger.info(
                        {
                            idempotencyKey: scopedKey,
                        },
                        'Returning cached response for idempotency key'
                    )

                    // Restore original methods before sending response
                    res.json = originalJson
                    res.send = originalSend

                    // Return cached response
                    return res.status(200).json(existingKey.response as any)
                } else {
                    // Key expired, delete it and proceed
                    await prisma.idempotencyKey.delete({
                        where: { key: scopedKey },
                    })
                }
            }

            // No valid cached response, proceed with request
            // After response is sent, store it if status is 201
            res.once('finish', () => {
                // Restore original methods
                res.json = originalJson
                res.send = originalSend

                // Store response if creation was successful (201)
                // Use res.statusCode to get the actual status code sent
                if (res.statusCode === 201 && responseData) {
                    const expiresAt = new Date()
                    expiresAt.setHours(expiresAt.getHours() + IDEMPOTENCY_TTL_HOURS)

                    prisma.idempotencyKey
                        .create({
                            data: {
                                key: scopedKey,
                                method: req.method,
                                path: req.path,
                                userId,
                                response: responseData,
                                expiresAt,
                            },
                        })
                        .catch((error) => {
                            const requestLogger = createChildLogger({
                                requestId: req.requestId,
                                userId,
                                endpoint: req.path,
                                method: req.method,
                            })
                            requestLogger.error(
                                {
                                    err: error,
                                    idempotencyKey: scopedKey,
                                },
                                'Failed to store idempotency key response'
                            )
                        })
                }
            })

            next()
        })
        .catch((error) => {
            const requestLogger = createChildLogger({
                requestId: req.requestId,
                userId,
                endpoint: req.path,
                method: req.method,
            })
            requestLogger.error(
                {
                    err: error,
                    idempotencyKey: scopedKey,
                },
                'Error checking idempotency key'
            )

            // Restore original methods on error
            res.json = originalJson
            res.send = originalSend

            // On error, proceed with request (fail open)
            next()
        })
}

