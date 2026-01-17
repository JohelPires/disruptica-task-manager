import { PrismaClient } from '@prisma/client';
import { env } from './env';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

/**
 * Prisma Client singleton.
 * 
 * Uses a global instance in development to prevent multiple connections during hot-reload.
 * Overrides DATABASE_URL for tests to ensure isolation from production/development databases.
 */
// Prisma reads DATABASE_URL from environment automatically
// Override DATABASE_URL for tests before PrismaClient is created
if (env.NODE_ENV === 'test' && env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = env.TEST_DATABASE_URL;
}
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    // Verbose logging in development aids debugging, but only errors in production for performance
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// Persist Prisma instance globally in non-production to prevent connection exhaustion during hot-reload
if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

