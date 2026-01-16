import 'dotenv/config';
import { defineConfig, env } from '@prisma/config';

// Use a dummy URL during build (when DATABASE_URL might not be available)
// Prisma Client generation doesn't actually connect to the database
const databaseUrl = process.env.DATABASE_URL || 'postgresql://dummy:dummy@localhost:5432/dummy?schema=public';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: databaseUrl,
  },
});

