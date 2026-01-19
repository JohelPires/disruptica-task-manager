import { Router } from 'express';
import * as projectController from './project.controller';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requireProjectOwner } from '../../middlewares/project-owner.middleware';
import { apiRateLimiter } from '../../middlewares/rateLimiter.middleware';
import { idempotencyMiddleware } from '../../middlewares/idempotency.middleware';

const router = Router();

router.post('/', apiRateLimiter, requireAuth, idempotencyMiddleware, projectController.create);

router.get('/', apiRateLimiter, requireAuth, projectController.getAll);

router.get('/:id', apiRateLimiter, requireAuth, projectController.getById);

router.put('/:id', apiRateLimiter, requireAuth, requireProjectOwner, projectController.update);

router.delete('/:id', apiRateLimiter, requireAuth, requireProjectOwner, projectController.deleteProject);

router.post('/:id/members', apiRateLimiter, requireAuth, requireProjectOwner, projectController.addMember);

router.delete('/:id/members/:userId', apiRateLimiter, requireAuth, requireProjectOwner, projectController.removeMember);

export default router;

