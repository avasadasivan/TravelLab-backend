import { execSync } from 'node:child_process';
import { testDatabaseUrl } from './database-url.js';

// Runs once before all test files: brings the test database's tables up to
// date with the migrations.
export default function setup() {
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
  });
}
