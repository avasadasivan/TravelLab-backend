import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TripsService } from '../trips/trips.service.js';
import { ActivitiesService } from './activities.service.js';

describe('ActivitiesService', () => {
  let service: ActivitiesService;
  let trips: TripsService;

  const newActivity = {
    title: 'testTitle',
    startTime: '2026-11-04T09:00',
    timeZone: 'Europe/Paris',
    location: 'testLocation',
    notes: 'thisIsATest',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ActivitiesService, TripsService],
    }).compile();

    service = module.get(ActivitiesService);
    trips = module.get(TripsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('gives a new activity a unique id after a delete', () => {
    // Arrange: delete the activity in the middle of the list
    service.deleteActivity(2);

    // Act: create a new activity
    service.createActivity(1, newActivity);

    // Assert: no two activities share an id
    const ids = service.getActivitiesForTrip(1).map((activity) => activity.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('lists a trip activities in start time order', () => {
    service.createActivity(1, { ...newActivity, startTime: '2026-11-03T08:00' });

    const startTimes = service
      .getActivitiesForTrip(1)
      .map((activity) => activity.startTime);

    expect(startTimes).toEqual([...startTimes].sort());
  });

  it('only lists activities belonging to the trip asked for', () => {
    const otherTrip = trips.createTrip({ name: 'Tokyo' });
    service.createActivity(otherTrip.id, newActivity);

    const tripIds = service
      .getActivitiesForTrip(1)
      .map((activity) => activity.tripId);

    expect(tripIds.every((tripId) => tripId === 1)).toBe(true);
  });

  it('deletes a trip activities along with the trip', () => {
    trips.deleteTrip(1);

    expect(() => service.getActivity(1)).toThrow(NotFoundException);
  });

  it('leaves a field alone when the update leaves it out', () => {
    const before = service.getActivity(1).title;

    const after = service.updateActivity(1, { notes: 'changed' });

    expect(after.title).toBe(before);
    expect(after.notes).toBe('changed');
  });

  it('bumps the version on every update', () => {
    const before = service.getActivity(1).version;

    const after = service.updateActivity(1, { notes: 'changed' });

    expect(after.version).toBe(before + 1);
  });

  it('getActivity throws NotFound for an unknown id', () => {
    expect(() => service.getActivity(999)).toThrow(NotFoundException);
  });

  it('updateActivity throws NotFound for an unknown id', () => {
    expect(() => service.updateActivity(999, { title: 'x' })).toThrow(
      NotFoundException,
    );
  });

  it('deleteActivity throws NotFound for an unknown id', () => {
    expect(() => service.deleteActivity(999)).toThrow(NotFoundException);
  });

  it('createActivity throws NotFound for an unknown trip', () => {
    expect(() => service.createActivity(999, newActivity)).toThrow(
      NotFoundException,
    );
  });
});
