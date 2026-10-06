import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service.js';
import { TripsService } from '../trips/trips.service.js';
import {
  ActivitiesController,
  TripActivitiesController,
} from './activities.controller.js';
import { ActivitiesService } from './activities.service.js';

describe('ActivitiesController', () => {
  let controller: ActivitiesController;
  let tripController: TripActivitiesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivitiesController, TripActivitiesController],
      providers: [ActivitiesService, TripsService, PrismaService],
    }).compile();

    controller = module.get(ActivitiesController);
    tripController = module.get(TripActivitiesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(tripController).toBeDefined();
  });
});
