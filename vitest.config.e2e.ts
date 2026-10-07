import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { testDatabaseUrl } from './test/database-url.js';

// Same test database setup as vitest.config.ts: migrated once, then wiped and
// reseeded before every test, so these never touch dev data.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    env: { DATABASE_URL: testDatabaseUrl },
    globalSetup: ['./test/global-setup.ts'],
    setupFiles: ['./test/reset-database.ts'],
    fileParallelism: false,
  },
});
