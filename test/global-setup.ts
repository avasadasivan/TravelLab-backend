import { execSync } from 'node:child_process';
import { testDatabaseUrl } from './database-url.js';

// Runs once before all test files: brings the test database's tables up to
// date with the migrations.
export default function setup() {
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    // Both, so a DIRECT_DATABASE_URL in .env can't point migrations at dev data.
    env: {
      ...process.env,
      DATABASE_URL: testDatabaseUrl,
      DIRECT_DATABASE_URL: testDatabaseUrl,
    },
  });
}
