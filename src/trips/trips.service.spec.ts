import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { TripsService } from './trips.service.js';

describe('TripsService', () => {
  let service: TripsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TripsService, PrismaService],
    }).compile();

    service = module.get(TripsService);
  });

  it('creates a trip with version 1 and lists it', async () => {
    const trip = await service.createTrip({ name: 'Tokyo in autumn' });

    expect(trip.version).toBe(1);
    expect(await service.getTrips()).toContainEqual(trip);
  });

  it('never reuses an id after a delete', async () => {
    const first = await service.createTrip({ name: 'Tokyo' });
    await service.deleteTrip(first.id);
    const second = await service.createTrip({ name: 'Lisbon' });

    expect(second.id).not.toBe(first.id);
  });

  it('bumps the version on every update', async () => {
    const trip = await service.createTrip({ name: 'Tokyo' });

    const updated = await service.updateTrip(trip.id, {
      name: 'Tokyo in autumn',
      version: 1,
    });

    expect(updated.name).toBe('Tokyo in autumn');
    expect(updated.version).toBe(2);
  });

  it('rejects an edit based on a stale version with 409', async () => {
    const trip = await service.createTrip({ name: 'Tokyo' });
    await service.updateTrip(trip.id, { name: 'Tokyo in autumn', version: 1 });

    // Still based on version 1, but someone else already made it version 2.
    const stale = service.updateTrip(trip.id, { name: 'Kyoto', version: 1 });

    await expect(stale).rejects.toThrow(ConflictException);
    // Nothing was overwritten.
    expect((await service.getTrip(trip.id)).name).toBe('Tokyo in autumn');
  });

  it('throws NotFound for an unknown id', async () => {
    await expect(service.getTrip(999)).rejects.toThrow(NotFoundException);
    await expect(
      service.updateTrip(999, { name: 'x', version: 1 }),
    ).rejects.toThrow(NotFoundException);
    await expect(service.deleteTrip(999)).rejects.toThrow(NotFoundException);
  });
});
