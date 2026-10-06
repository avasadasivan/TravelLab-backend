import { Injectable, NotFoundException } from '@nestjs/common';
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

@Injectable()
export class TripsService {
  private trips: Trip[] = [
    { id: 1, name: 'Paris spring break', version: 1 },
  ];

  private nextId = 2;

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

  // Things that need to clean up after a deleted trip (right now: activities)
  // register here. Activities depend on trips, not the other way round, so a
  // subscription keeps the dependency one-way. Postgres does this with
  // ON DELETE CASCADE once the data moves into a real database.
  private tripDeletedListeners: ((tripId: number) => void)[] = [];

  onTripDeleted(listener: (tripId: number) => void) {
    this.tripDeletedListeners.push(listener);
  }

  getTrips(): Trip[] {
    return this.trips;
  }

  getTrip(id: number): Trip {
    const trip = this.trips.find((trip) => trip.id === id);
    if (!trip) {
      throw new NotFoundException(`Trip ${id} not found`);
    }
    return trip;
  }

  createTrip(dto: CreateTripDto): Trip {
    const trip: Trip = {
      id: this.nextId++,
      name: dto.name,
      version: 1,
    };
    this.trips.push(trip);
    return trip;
  }

  updateTrip(id: number, updates: UpdateTripDto): Trip {
    const trip = this.getTrip(id);
    // Assign field by field so `version` from the request body can't overwrite
    // the server's own version number.
    if (updates.name !== undefined) {
      trip.name = updates.name;
    }
    trip.version += 1;
    this.announce(trip.id, 'trip.updated', trip);
    return trip;
  }

  deleteTrip(id: number): Trip {
    const index = this.trips.findIndex((trip) => trip.id === id);
    if (index === -1) {
      throw new NotFoundException(`Trip ${id} not found`);
    }
    const [deleted] = this.trips.splice(index, 1);
    for (const listener of this.tripDeletedListeners) {
      listener(deleted.id);
    }
    this.announce(deleted.id, 'trip.deleted', { id: deleted.id });
    return deleted;
  }
}
