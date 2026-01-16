import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL environment variable is not set');
}

beforeAll(async () => {
  try {
    execSync('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
      stdio: 'inherit',
    });
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
});

