import app from './app';
import { env } from './config/env';

/**
 * Application entry point.
 * Starts the HTTP server and handles graceful shutdown on SIGTERM.
 */
const server = app.listen(env.PORT, () => {
  console.log(`Server is running on port ${env.PORT}`);
});

// Graceful shutdown handler for containerized deployments (e.g., Docker, Kubernetes)
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

