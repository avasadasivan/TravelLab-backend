import { Injectable, NotFoundException } from '@nestjs/common';
import { isRecordNotFound, PrismaService } from '../prisma/prisma.service.js';
import { CreateTripDto } from './dto/create-trip.dto.js';
import { UpdateTripDto } from './dto/update-trip.dto.js';

export type Trip = {
  id: number;
  name: string;
  version: number;
};

export type ChangeListener = (
  tripId: number,
  event: string,
  payload: object,
) => void;

// Only the fields in the API contract; createdAt/updatedAt stay internal.
const tripFields = { id: true, name: true, version: true } as const;

@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService) {}

  // Live sync: the gateway subscribes here and forwards each change to the
  // trip's room. The service doesn't know sockets exist, which keeps it
  // easy to unit test.
  private changeListeners: ChangeListener[] = [];

  onChange(listener: ChangeListener) {
    this.changeListeners.push(listener);
  }

  private announce(tripId: number, event: string, payload: object) {
    for (const listener of this.changeListeners) {
      listener(tripId, event, payload);
    }
  }

  getTrips(): Promise<Trip[]> {
    return this.prisma.trip.findMany({
      select: tripFields,
      orderBy: { id: 'asc' },
    });
  }

  async getTrip(id: number): Promise<Trip> {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      select: tripFields,
    });
    if (!trip) {
      throw new NotFoundException(`Trip ${id} not found`);
    }
    return trip;
  }

  createTrip(dto: CreateTripDto): Promise<Trip> {
    return this.prisma.trip.create({
      data: { name: dto.name },
      select: tripFields,
    });
  }

  async updateTrip(id: number, updates: UpdateTripDto): Promise<Trip> {
    try {
      const trip = await this.prisma.trip.update({
        where: { id },
        // Only the fields we allow, so `version` from the request body can't
        // overwrite the server's own version number. Prisma skips undefined.
        data: { name: updates.name, version: { increment: 1 } },
        select: tripFields,
      });
      this.announce(trip.id, 'trip.updated', trip);
      return trip;
    } catch (err) {
      if (isRecordNotFound(err)) {
        throw new NotFoundException(`Trip ${id} not found`);
      }
      throw err;
    }
  }

  async deleteTrip(id: number): Promise<Trip> {
    try {
      // The database deletes the trip's activities too (ON DELETE CASCADE).
      const deleted = await this.prisma.trip.delete({
        where: { id },
        select: tripFields,
      });
      this.announce(deleted.id, 'trip.deleted', { id: deleted.id });
      return deleted;
    } catch (err) {
      if (isRecordNotFound(err)) {
        throw new NotFoundException(`Trip ${id} not found`);
      }
      throw err;
    }
  }
}
