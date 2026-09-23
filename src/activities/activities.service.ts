import { Injectable } from '@nestjs/common';

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

  getActivities() {
    return this.activities;
  }

  getActivity(id: number) {
    return this.activities.find((activity) => activity.id === id);
  }

  createActivity(activity: any) {
    const newActivity = {
        id: this.activities.length + 1,
        ...activity,
    };

    this.activities.push(newActivity);

    return newActivity;
  }

  updateActivity(id: number, updates: any) {
    const activity = this.activities.find((activity) => activity.id === id);

    if (!activity) {
        return undefined;
    }

    Object.assign(activity, updates);

    return activity;
  }

  deleteActivity(id: number) {
    const index = this.activities.findIndex(
        (activity) => activity.id === id,
    );

    if (index === -1) {
        return undefined;
    }

    const [deletedActivity] = this.activities.splice(index, 1);

    return deletedActivity;
  }

}