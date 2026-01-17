import { Router } from 'express'
import * as authController from './auth.controller'
import { requireAuth } from '../../middlewares/auth.middleware'
import {
    authRateLimiter,
    apiRateLimiter,
} from '../../middlewares/rateLimiter.middleware'

const router = Router()

router.post('/register', authRateLimiter, authController.register)

router.post('/login', authRateLimiter, authController.login)

router.get('/me', apiRateLimiter, requireAuth, authController.getMe)

export default router
