import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { AppLoggerService } from '../../logging/app-logger.service';
import { RealtimePublisher } from './realtime.publisher';
import { parseRealtimeHandshake, roomsForHandshake } from './realtime.rooms';
import { RealtimeStore } from './realtime.store';

@WebSocketGateway({
  namespace: '/realtime',
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly publisher: RealtimePublisher,
    private readonly store: RealtimeStore,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(RealtimeGateway.name);
  }

  async afterInit(server: Server): Promise<void> {
    this.publisher.setServer(server);
    try {
      await this.store.markServerRestarted();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Could not close leftover realtime connections: ${message}`,
        `RealtimeGateway.afterInit`,
      );
    }
    this.logger.log(
      'Socket.IO namespace /realtime ready',
      `RealtimeGateway.afterInit`,
    );
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const handshake = parseRealtimeHandshake(client.handshake.auth);
      const rooms = roomsForHandshake(handshake);
      const userAgentHeader = client.handshake.headers['user-agent'];
      await this.store.openConnection({
        socketId: client.id,
        handshake,
        rooms,
        userAgent:
          typeof userAgentHeader === 'string' ? userAgentHeader : undefined,
        remoteAddress: client.handshake.address,
      });
      for (const room of rooms) {
        void client.join(room);
      }
      client.data.handshake = handshake;
      this.logger.debug(
        `Connected ${client.id} type=${handshake.clientType} tenant=${handshake.tenantId}`,
        `RealtimeGateway.handleConnection`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unauthorized';
      this.logger.warn(
        `Rejecting socket ${client.id}: ${message}`,
        `RealtimeGateway.handleConnection`,
      );
      client.emit('error', { message });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    void this.store.closeConnection(client.id).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to record disconnect for ${client.id}: ${message}`,
        `RealtimeGateway.handleDisconnect`,
      );
    });
    this.logger.debug(
      `Disconnected ${client.id}`,
      `RealtimeGateway.handleDisconnect`,
    );
  }
}
