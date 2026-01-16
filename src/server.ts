import app from './app';
import { env } from './config/env';

const server = app.listen(env.PORT, () => {
  console.log(`Server is running on port ${env.PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

