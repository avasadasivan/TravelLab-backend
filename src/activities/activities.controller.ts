import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ActivitiesService } from './activities.service.js';
import { CreateActivityDto } from './dto/create-activity.dto.js';
import { UpdateActivityDto } from './dto/update-activity.dto.js';

// Listing and creating need to know which trip, so those paths are nested.
@Controller('trips/:tripId/activities')
export class TripActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  getActivities(@Param('tripId', ParseIntPipe) tripId: number) {
    return this.activitiesService.getActivitiesForTrip(tripId);
  }

  @Post()
  createActivity(
    @Param('tripId', ParseIntPipe) tripId: number,
    @Body() activity: CreateActivityDto,
  ) {
    return this.activitiesService.createActivity(tripId, activity);
  }
}

// One activity is findable by its own id, so these paths stay short.
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get(':id')
  getActivity(@Param('id', ParseIntPipe) id: number) {
    return this.activitiesService.getActivity(id);
  }

  @Patch(':id')
  updateActivity(
    @Param('id', ParseIntPipe) id: number,
    @Body() updates: UpdateActivityDto,
  ) {
    return this.activitiesService.updateActivity(id, updates);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteActivity(@Param('id', ParseIntPipe) id: number) {
    // Awaited so a 404 reaches the client; the deleted activity isn't sent.
    await this.activitiesService.deleteActivity(id);
  }
}
