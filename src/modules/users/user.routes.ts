import { Router } from 'express';
import * as userController from './user.controller';
import { requireAuth } from '../../middlewares/auth.middleware';
import { apiRateLimiter } from '../../middlewares/rateLimiter.middleware';

const router = Router();

router.get('/', apiRateLimiter, requireAuth, userController.getAll);

router.get('/:id', apiRateLimiter, requireAuth, userController.getById);

export default router;

