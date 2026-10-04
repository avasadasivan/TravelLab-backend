import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ActivitiesService } from './activities.service.js';
import { CreateActivityDto } from './dto/create-activity.dto.js';
import { UpdateActivityDto } from './dto/update-activity.dto.js';

@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  getActivities() {
    return this.activitiesService.getActivities();
  }

  @Get(':id')
  getActivity(@Param('id', ParseIntPipe) id: number) {
    return this.activitiesService.getActivity(id);
  }

  @Post()
  createActivity(@Body() activity: CreateActivityDto) {
    return this.activitiesService.createActivity(activity);
  }

  @Patch(':id')
  updateActivity(
    @Param('id', ParseIntPipe) id: number,
    @Body() updates: UpdateActivityDto,
  ) {
    return this.activitiesService.updateActivity(id, updates);
  }

  @Delete(':id')
  deleteActivity(@Param('id', ParseIntPipe) id: number) {
    return this.activitiesService.deleteActivity(id);
  }
}
