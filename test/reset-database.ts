import { createPrismaClient } from '../src/prisma/prisma.service.js';
import { insertSampleData } from '../src/prisma/sample-data.js';

// Runs in every test file: each test starts from the sample Paris trip
// (trip 1, activities 1-3), the same data the old in-memory arrays held.

if (!process.env.DATABASE_URL?.includes('_test')) {
  // Refuse to wipe anything that doesn't look like the test database.
  throw new Error(
    `Tests must use a *_test database, got ${process.env.DATABASE_URL}`,
  );
}

const prisma = createPrismaClient();

beforeEach(async () => {
  // RESTART IDENTITY resets the id counters, so ids start at 1 again.
  await prisma.$executeRaw`TRUNCATE trips, activities RESTART IDENTITY CASCADE`;
  await insertSampleData(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});
