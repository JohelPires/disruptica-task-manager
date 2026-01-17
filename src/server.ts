import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';

/**
 * Application entry point.
 * Starts the HTTP server and handles graceful shutdown on SIGTERM.
 */
const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'Server is running');
});

// Graceful shutdown handler for containerized deployments (e.g., Docker, Kubernetes)
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
  });
});

