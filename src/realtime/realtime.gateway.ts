import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { ActivitiesService } from '../activities/activities.service.js';
import { TripsService } from '../trips/trips.service.js';

// Sockets need their own CORS setting: enableCors in main.ts only covers REST.
@WebSocketGateway({ cors: { origin: 'http://localhost:3000' } })
export class RealtimeGateway {
  // Nest fills this in with the running socket.io server.
  @WebSocketServer() server!: Server;

  // Writes still go through REST; the socket only announces them, to everyone
  // in that trip's room (including the client that made the change).
  constructor(
    tripsService: TripsService,
    activitiesService: ActivitiesService,
  ) {
    const broadcast = (tripId: number, event: string, payload: object) => {
      this.server.to(`trip:${tripId}`).emit(event, payload);
    };
    tripsService.onChange(broadcast);
    activitiesService.onChange(broadcast);
  }

  @SubscribeMessage('trip.join')
  handleJoin(
    @MessageBody() body: { tripId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `trip:${body.tripId}`; // build room name
    client.join(room); // adds the browser tab's connection to that room
    console.log(`socket ${client.id} joined ${room}`); // proof it worked
  }
}
