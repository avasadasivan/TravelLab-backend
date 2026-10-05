import { Injectable, NotFoundException } from '@nestjs/common';
import { TripsService } from '../trips/trips.service.js';
import { CreateActivityDto } from './dto/create-activity.dto.js';
import { UpdateActivityDto } from './dto/update-activity.dto.js';

export type Activity = {
  id: number;
  tripId: number;
  title: string;
  startTime: string;
  timeZone: string;
  location: string;
  notes: string | null;
  version: number;
};

@Injectable()
export class ActivitiesService {
  constructor(private readonly tripsService: TripsService) {
    // When a trip goes away, its activities go with it.
    this.tripsService.onTripDeleted((tripId) => {
      this.activities = this.activities.filter(
        (activity) => activity.tripId !== tripId,
      );
    });
  }

  private activities: Activity[] = [
    {
      id: 1,
      tripId: 1,
      title: 'Visit the Louvre',
      startTime: '2026-11-03T10:00',
      timeZone: 'Europe/Paris',
      location: 'Paris',
      notes: 'Buy tickets beforehand',
      version: 1,
    },
    {
      id: 2,
      tripId: 1,
      title: 'Lunch at Le Relais',
      startTime: '2026-11-03T13:00',
      timeZone: 'Europe/Paris',
      location: 'Paris',
      notes: 'Try the steak frites',
      version: 1,
    },
    {
      id: 3,
      tripId: 1,
      title: 'Eiffel Tower',
      startTime: '2026-11-03T18:00',
      timeZone: 'Europe/Paris',
      location: 'Paris',
      notes: 'Go around sunset',
      version: 1,
    },
  ];

  private nextId = 4;

  getActivitiesForTrip(tripId: number): Activity[] {
    // Throws 404 if the trip doesn't exist, so an unknown trip never looks
    // like a trip with no activities.
    this.tripsService.getTrip(tripId);
    return this.activities
      .filter((activity) => activity.tripId === tripId)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  getActivity(id: number): Activity {
    const activity = this.activities.find((activity) => activity.id === id);
    if (!activity) {
      throw new NotFoundException(`Activity ${id} not found`);
    }
    return activity;
  }

  createActivity(tripId: number, dto: CreateActivityDto): Activity {
    this.tripsService.getTrip(tripId);
    const activity: Activity = {
      id: this.nextId++,
      tripId,
      title: dto.title,
      startTime: dto.startTime,
      timeZone: dto.timeZone,
      location: dto.location,
      notes: dto.notes ?? null,
      version: 1,
    };
    this.activities.push(activity);
    return activity;
  }

  updateActivity(id: number, updates: UpdateActivityDto): Activity {
    const activity = this.getActivity(id);
    // Field by field, so `version` in the request body can't overwrite the
    // server's own version number. A field left out stays as it was.
    if (updates.title !== undefined) {
      activity.title = updates.title;
    }
    if (updates.startTime !== undefined) {
      activity.startTime = updates.startTime;
    }
    if (updates.timeZone !== undefined) {
      activity.timeZone = updates.timeZone;
    }
    if (updates.location !== undefined) {
      activity.location = updates.location;
    }
    if (updates.notes !== undefined) {
      // null clears the notes.
      activity.notes = updates.notes;
    }
    activity.version += 1;
    return activity;
  }

  deleteActivity(id: number): Activity {
    const index = this.activities.findIndex((activity) => activity.id === id);
    if (index === -1) {
      throw new NotFoundException(`Activity ${id} not found`);
    }
    const [deletedActivity] = this.activities.splice(index, 1);
    return deletedActivity;
  }
}
