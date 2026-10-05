import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TripsService } from './trips.service.js';

describe('TripsService', () => {
  let service: TripsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TripsService],
    }).compile();

    service = module.get(TripsService);
  });

  it('creates a trip with version 1 and lists it', () => {
    const trip = service.createTrip({ name: 'Tokyo in autumn' });

    expect(trip.version).toBe(1);
    expect(service.getTrips()).toContainEqual(trip);
  });

  it('never reuses an id after a delete', () => {
    const first = service.createTrip({ name: 'Tokyo' });
    service.deleteTrip(first.id);
    const second = service.createTrip({ name: 'Lisbon' });

    expect(second.id).not.toBe(first.id);
  });

  it('bumps the version on every update', () => {
    const trip = service.createTrip({ name: 'Tokyo' });

    const updated = service.updateTrip(trip.id, { name: 'Tokyo in autumn' });

    expect(updated.name).toBe('Tokyo in autumn');
    expect(updated.version).toBe(2);
  });

  it('ignores a version sent by the client', () => {
    const trip = service.createTrip({ name: 'Tokyo' });

    const updated = service.updateTrip(trip.id, { version: 99 });

    expect(updated.version).toBe(2);
  });

  it('throws NotFound for an unknown id', () => {
    expect(() => service.getTrip(999)).toThrow(NotFoundException);
    expect(() => service.updateTrip(999, { name: 'x' })).toThrow(
      NotFoundException,
    );
    expect(() => service.deleteTrip(999)).toThrow(NotFoundException);
  });
});
