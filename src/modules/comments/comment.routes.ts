import { Router } from 'express'
import * as commentController from './comment.controller'
import { requireAuth } from '../../middlewares/auth.middleware'
import { apiRateLimiter } from '../../middlewares/rateLimiter.middleware'
import { idempotencyMiddleware } from '../../middlewares/idempotency.middleware'

const router = Router()

router.post(
    '/tasks/:taskId/comments',
    apiRateLimiter,
    requireAuth,
    idempotencyMiddleware,
    commentController.create
)

router.get(
    '/tasks/:taskId/comments',
    apiRateLimiter,
    requireAuth,
    commentController.getByTask
)

router.delete(
    '/comments/:id',
    apiRateLimiter,
    requireAuth,
    commentController.deleteComment
)

export default router
