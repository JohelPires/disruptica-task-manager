import { PrismaClient } from '@prisma/client';
import { env } from './env';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Prisma reads DATABASE_URL from environment automatically
// Override DATABASE_URL for tests before PrismaClient is created
if (env.NODE_ENV === 'test' && env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = env.TEST_DATABASE_URL;
}
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

