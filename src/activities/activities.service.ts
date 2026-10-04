import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateActivityDto } from './dto/create-activity.dto.js';
import { UpdateActivityDto } from './dto/update-activity.dto.js';

@Injectable()
export class ActivitiesService {
  private activities = [
    {
      id: 1,
      title: 'Visit the Louvre',
      time: '10:00',
      location: 'Paris',
      notes: 'Buy tickets beforehand',
    },
    {
      id: 2,
      title: 'Lunch at Le Relais',
      time: '13:00',
      location: 'Paris',
      notes: 'Try the steak frites',
    },
    {
      id: 3,
      title: 'Eiffel Tower',
      time: '18:00',
      location: 'Paris',
      notes: 'Go around sunset',
    },
  ];

  private nextId = 4;

  getActivities() {
    return this.activities;
  }

  getActivity(id: number) {
    const activity = this.activities.find((activity) => activity.id === id);

    if (!activity) {
      throw new NotFoundException(`Activity ${id} not found`);
    }

    return activity;
  }

  createActivity(activity: CreateActivityDto) {
    const newActivity = {
      ...activity,
      id: this.nextId++,
    };

    this.activities.push(newActivity);

    return newActivity;
  }

  updateActivity(id: number, updates: UpdateActivityDto) {
    const activity = this.activities.find((activity) => activity.id === id);

    if (!activity) {
      throw new NotFoundException(`Activity ${id} not found`);
    }

    Object.assign(activity, updates);

    return activity;
  }

  deleteActivity(id: number) {
    const index = this.activities.findIndex((activity) => activity.id === id);

    if (index === -1) {
      throw new NotFoundException(`Activity ${id} not found`);
    }

    const [deletedActivity] = this.activities.splice(index, 1);

    return deletedActivity;
  }
}
