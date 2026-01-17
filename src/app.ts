import express from 'express';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/user.routes';
import projectRoutes from './modules/projects/project.routes';
import taskRoutes from './modules/tasks/task.routes';
import commentRoutes from './modules/comments/comment.routes';
import { errorMiddleware } from './middlewares/error.middleware';
import { globalRateLimiter } from './middlewares/rateLimiter.middleware';
import { requestIdMiddleware } from './middlewares/requestId.middleware';
import { swaggerSpec } from './config/swagger';
import { env } from './config/env';

const app = express();

// Trust proxy - required when behind reverse proxy (nginx, load balancer, etc.)
// This allows express-rate-limit to correctly identify client IPs from X-Forwarded-For header
app.set('trust proxy', env.TRUST_PROXY !== 'false');

// Request ID middleware must be first to ensure all logs have requestId
app.use(requestIdMiddleware);

app.use(express.json());

// Global rate limiter (catch-all for all endpoints)
app.use(globalRateLimiter);

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Task Management API Documentation',
}));

// Serve raw OpenAPI JSON spec
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Root endpoint with API information and useful links
app.get('/', (_req, res) => {
  res.json({
    name: 'Disruptica Task Manager API',
    version: '1.0.0',
    documentation: '/api-docs',
    api_docs_json: '/api-docs.json',
    dbdiagram: 'https://dbdiagram.io/d/disruptica-696958add6e030a02430399f',
    github_repo: 'https://github.com/JohelPires/disruptica-task-manager',
  });
});

// API routes - ordered by specificity (more specific routes first)
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/projects', projectRoutes);
// Task and comment routes use root path due to nested routing structure
app.use('/', taskRoutes);
app.use('/', commentRoutes);

// Error handling middleware must be last to catch errors from all routes
app.use(errorMiddleware);

export default app;

