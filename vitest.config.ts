import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { testDatabaseUrl } from './test/database-url.js';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`.
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    env: { DATABASE_URL: testDatabaseUrl },
    globalSetup: ['./test/global-setup.ts'],
    setupFiles: ['./test/reset-database.ts'],
    // All test files share one database, so they run one at a time.
    fileParallelism: false,
  },
});
