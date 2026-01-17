import { Router } from 'express';
import * as taskController from './task.controller';
import { requireAuth } from '../../middlewares/auth.middleware';
import { apiRateLimiter } from '../../middlewares/rateLimiter.middleware';

const router = Router();

router.post('/projects/:projectId/tasks', apiRateLimiter, requireAuth, taskController.create);

router.get('/projects/:projectId/tasks', apiRateLimiter, requireAuth, taskController.getByProject);

router.get('/tasks/:id', apiRateLimiter, requireAuth, taskController.getById);

router.put('/tasks/:id', apiRateLimiter, requireAuth, taskController.update);

router.delete('/tasks/:id', apiRateLimiter, requireAuth, taskController.deleteTask);

export default router;

