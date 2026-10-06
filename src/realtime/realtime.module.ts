import { Module } from '@nestjs/common';
import { ActivitiesModule } from '../activities/activities.module.js';
import { TripsModule } from '../trips/trips.module.js';
import { RealtimeGateway } from './realtime.gateway.js';

@Module({
  // The gateway listens to both services and forwards their changes.
  imports: [TripsModule, ActivitiesModule],
  providers: [RealtimeGateway],
})
export class RealtimeModule {}
