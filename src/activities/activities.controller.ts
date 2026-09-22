import { Controller, Get } from '@nestjs/common';
import { ActivitiesService } from './activities.service.js';

@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  getActivities() {
    return this.activitiesService.getActivities();
  }
}