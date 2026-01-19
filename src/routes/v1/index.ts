import { Router } from 'express';
import authRoutes from '../../modules/auth/auth.routes';
import userRoutes from '../../modules/users/user.routes';
import projectRoutes from '../../modules/projects/project.routes';
import taskRoutes from '../../modules/tasks/task.routes';
import commentRoutes from '../../modules/comments/comment.routes';

const router = Router();

// Mount all v1 API routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/projects', projectRoutes);
router.use('/', taskRoutes);
router.use('/', commentRoutes);

export default router;

