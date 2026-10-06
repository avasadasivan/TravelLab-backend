// `npm run db:seed`: loads the sample Paris trip into an empty database.
import 'dotenv/config';
import { createPrismaClient } from '../src/prisma/prisma.service.js';
import { insertSampleData } from '../src/prisma/sample-data.js';

const prisma = createPrismaClient();

if ((await prisma.trip.count()) > 0) {
  console.log('Database already has trips, skipping the seed.');
} else {
  await insertSampleData(prisma);
  console.log('Seeded the sample Paris trip.');
}

await prisma.$disconnect();
