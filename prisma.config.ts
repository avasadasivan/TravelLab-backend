import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Migrations need a direct connection; hosted Postgres (Neon) gives a
    // separate pooled URL for the app. Locally both are the same database.
    url: process.env['DIRECT_DATABASE_URL'] ?? process.env['DATABASE_URL'],
  },
});
