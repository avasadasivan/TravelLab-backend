import { NotFoundException } from '@nestjs/common';
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
    });

    expect(updated.name).toBe('Tokyo in autumn');
    expect(updated.version).toBe(2);
  });

  it('ignores a version sent by the client', async () => {
    const trip = await service.createTrip({ name: 'Tokyo' });

    const updated = await service.updateTrip(trip.id, { version: 99 });

    expect(updated.version).toBe(2);
  });

  it('throws NotFound for an unknown id', async () => {
    await expect(service.getTrip(999)).rejects.toThrow(NotFoundException);
    await expect(service.updateTrip(999, { name: 'x' })).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.deleteTrip(999)).rejects.toThrow(NotFoundException);
  });
});
