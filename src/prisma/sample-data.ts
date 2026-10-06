import type { PrismaClient } from '../generated/prisma/client.js';
import { toDbLocalTime } from './local-time.js';

// The sample Paris trip. `npm run db:seed` loads it for local dev, and the
// tests reload it before each test so they always start from the same data.
export async function insertSampleData(prisma: PrismaClient) {
  const trip = await prisma.trip.create({
    data: { name: 'Paris spring break' },
  });
  // createMany keeps the order, so the activities get ids 1, 2, 3 on a
  // fresh database.
  await prisma.activity.createMany({
    data: [
      {
        title: 'Visit the Louvre',
        startTime: '2026-11-03T10:00',
        notes: 'Buy tickets beforehand',
      },
      {
        title: 'Lunch at Le Relais',
        startTime: '2026-11-03T13:00',
        notes: 'Try the steak frites',
      },
      {
        title: 'Eiffel Tower',
        startTime: '2026-11-03T18:00',
        notes: 'Go around sunset',
      },
    ].map((activity) => ({
      ...activity,
      tripId: trip.id,
      startTime: toDbLocalTime(activity.startTime),
      timeZone: 'Europe/Paris',
      location: 'Paris',
    })),
  });
}
