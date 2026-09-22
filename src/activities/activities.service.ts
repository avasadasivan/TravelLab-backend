import { Injectable } from '@nestjs/common';

@Injectable()
export class ActivitiesService {
  getActivities() {
    return [
      {
        id: 1,
        title: 'Visit the Louvre',
        time: '10:00',
        location: 'Paris',
        notes: 'Buy tickets beforehand',
      },
    ];
  }
}