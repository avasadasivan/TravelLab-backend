import 'dotenv/config';

// Tests run against their own database, because they wipe it before every
// test. CI sets TEST_DATABASE_URL; locally it comes from .env, with the
// docker-compose default as a fallback.
export const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  'postgresql://travellab:travellab@localhost:5432/travellab_test';
