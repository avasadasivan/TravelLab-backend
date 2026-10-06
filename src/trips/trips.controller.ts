// The waiter: maps each URL to a service method.

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
import { CreateTripDto } from './dto/create-trip.dto.js';
import { UpdateTripDto } from './dto/update-trip.dto.js';
import { TripsService } from './trips.service.js';

@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Get()
  getTrips() {
    return this.tripsService.getTrips();
  }

  @Get(':id')
  getTrip(@Param('id', ParseIntPipe) id: number) {
    return this.tripsService.getTrip(id);
  }

  @Post()
  createTrip(@Body() trip: CreateTripDto) {
    return this.tripsService.createTrip(trip);
  }

  @Patch(':id')
  updateTrip(
    @Param('id', ParseIntPipe) id: number,
    @Body() updates: UpdateTripDto,
  ) {
    return this.tripsService.updateTrip(id, updates);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTrip(@Param('id', ParseIntPipe) id: number) {
    // Awaited so a 404 reaches the client; the deleted trip itself isn't sent.
    await this.tripsService.deleteTrip(id);
  }
}
