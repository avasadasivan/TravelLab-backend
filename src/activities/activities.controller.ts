import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ActivitiesService } from './activities.service.js';

@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  getActivities() {
    return this.activitiesService.getActivities();
  }

  @Get(':id')
  getActivity(@Param('id') id: string) {
    return this.activitiesService.getActivity(Number(id));
  }

  @Post()
  createActivity(@Body() activity: any) {
    return this.activitiesService.createActivity(activity);
  }

  @Patch(':id')
  updateActivity(@Param('id') id: string, @Body() updates: any) {
    return this.activitiesService.updateActivity(Number(id), updates);
  }

  @Delete(':id')
  deleteActivity(@Param('id') id: string) {
    return this.activitiesService.deleteActivity(Number(id));
  }

}