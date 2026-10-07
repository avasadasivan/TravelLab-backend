import { Injectable, NotFoundException } from '@nestjs/common';
import { fromDbLocalTime, toDbLocalTime } from '../prisma/local-time.js';
import {
  isRecordNotFound,
  PrismaService,
  staleVersion,
} from '../prisma/prisma.service.js';
import { ChangeListener, TripsService } from '../trips/trips.service.js';
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

// Only the fields in the API contract; createdAt/updatedAt stay internal.
const activityFields = {
  id: true,
  tripId: true,
  title: true,
  startTime: true,
  timeZone: true,
  location: true,
  notes: true,
  version: true,
} as const;

type ActivityRow = Omit<Activity, 'startTime'> & { startTime: Date };

// The database hands back startTime as a Date; the API speaks local
// wall-clock strings.
function toActivity(row: ActivityRow): Activity {
  return { ...row, startTime: fromDbLocalTime(row.startTime) };
}

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tripsService: TripsService,
  ) {}

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

  async getActivitiesForTrip(tripId: number): Promise<Activity[]> {
    // Throws 404 if the trip doesn't exist, so an unknown trip never looks
    // like a trip with no activities.
    await this.tripsService.getTrip(tripId);
    const rows = await this.prisma.activity.findMany({
      where: { tripId },
      select: activityFields,
      // Served by the (trip_id, start_time) index.
      orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
    });
    return rows.map(toActivity);
  }

  async getActivity(id: number): Promise<Activity> {
    const row = await this.prisma.activity.findUnique({
      where: { id },
      select: activityFields,
    });
    if (!row) {
      throw new NotFoundException(`Activity ${id} not found`);
    }
    return toActivity(row);
  }

  async createActivity(
    tripId: number,
    dto: CreateActivityDto,
  ): Promise<Activity> {
    await this.tripsService.getTrip(tripId);
    const row = await this.prisma.activity.create({
      data: {
        tripId,
        title: dto.title,
        startTime: toDbLocalTime(dto.startTime),
        timeZone: dto.timeZone,
        location: dto.location,
        notes: dto.notes ?? null,
      },
      select: activityFields,
    });
    const activity = toActivity(row);
    this.announce(tripId, 'activity.created', activity);
    return activity;
  }

  async updateActivity(
    id: number,
    updates: UpdateActivityDto,
  ): Promise<Activity> {
    try {
      // Optimistic concurrency: one atomic
      //   UPDATE activities SET ..., version = version + 1
      //   WHERE id = ? AND version = ?
      // If someone else saved first, the version no longer matches, no row is
      // updated, and nothing gets overwritten.
      const row = await this.prisma.activity.update({
        where: { id, version: updates.version },
        // Field by field, so `version` in the request body can't overwrite the
        // server's own version number. Prisma skips undefined fields, so a
        // field left out stays as it was; null clears the notes.
        data: {
          title: updates.title,
          startTime:
            updates.startTime === undefined
              ? undefined
              : toDbLocalTime(updates.startTime),
          timeZone: updates.timeZone,
          location: updates.location,
          notes: updates.notes,
          version: { increment: 1 },
        },
        select: activityFields,
      });
      const activity = toActivity(row);
      this.announce(activity.tripId, 'activity.updated', activity);
      return activity;
    } catch (err) {
      if (isRecordNotFound(err)) {
        // No row matched: either the activity is gone (404) or it changed
        // (409, with the current version so the client can show it).
        const current = await this.prisma.activity.findUnique({
          where: { id },
          select: activityFields,
        });
        if (!current) {
          throw new NotFoundException(`Activity ${id} not found`);
        }
        throw staleVersion(
          `Activity ${id} was changed by someone else`,
          toActivity(current),
        );
      }
      throw err;
    }
  }

  async deleteActivity(id: number): Promise<Activity> {
    try {
      const row = await this.prisma.activity.delete({
        where: { id },
        select: activityFields,
      });
      const deleted = toActivity(row);
      // The contract's payload includes tripId so clients know which trip changed.
      this.announce(deleted.tripId, 'activity.deleted', {
        id: deleted.id,
        tripId: deleted.tripId,
      });
      return deleted;
    } catch (err) {
      if (isRecordNotFound(err)) {
        throw new NotFoundException(`Activity ${id} not found`);
      }
      throw err;
    }
  }
}
