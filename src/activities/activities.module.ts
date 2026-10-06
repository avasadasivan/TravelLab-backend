import { Module } from '@nestjs/common';
import { TripsModule } from '../trips/trips.module.js';
import {
  ActivitiesController,
  TripActivitiesController,
} from './activities.controller.js';
import { ActivitiesService } from './activities.service.js';

@Module({
  imports: [TripsModule],
  controllers: [TripActivitiesController, ActivitiesController],
  providers: [ActivitiesService],
  // RealtimeModule subscribes to activity changes.
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
