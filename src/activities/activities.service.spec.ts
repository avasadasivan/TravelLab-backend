import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ActivitiesService } from './activities.service.js';

describe('ActivitiesService', () => {
  let service: ActivitiesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ActivitiesService],
    }).compile();

    service = module.get<ActivitiesService>(ActivitiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('gives a new activity a unique id after a delete', () => {
    // Arrange: delete the activity in the middle of the list
    service.deleteActivity(2);

    // Act: create a new activity
    service.createActivity({
      title: 'testTitle',
      time: 'testTime',
      location: 'testLocation',
      notes: 'thisIsATest',
    });

    // Assert: no two activities share an id
    const ids = service.getActivities().map((activity) => activity.id);
    expect(new Set(ids).size).toBe(ids.length);
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
});
