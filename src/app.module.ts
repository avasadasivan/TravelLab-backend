import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ActivitiesModule } from './activities/activities.module.js';
import { RealtimeModule } from './realtime/realtime.module.js';
import { TripsModule } from './trips/trips.module.js';

@Module({
  imports: [TripsModule, ActivitiesModule, RealtimeModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
