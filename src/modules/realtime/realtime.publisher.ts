import { Injectable, Optional } from '@nestjs/common';
import type { Server } from 'socket.io';
import { AppLoggerService } from '../../logging/app-logger.service';
import {
  REALTIME_EVENTS,
  echoQueueUpdatedSchema,
  notificationCreatedSchema,
  pulseStatusUpdatedSchema,
  signalUpdatedSchema,
  type EchoQueueUpdatedPayload,
  type NotificationCreatedPayload,
  type PulseStatusUpdatedPayload,
  type SignalUpdatedPayload,
} from './realtime.events';
import { echoesRoom, pulseRoom, tenantRoom, userRoom } from './realtime.rooms';
import {
  messageRefsFromPayload,
  RealtimeStore,
} from './realtime.store';
import type { RealtimeEventName } from '../../database/schema';

@Injectable()
export class RealtimePublisher {
  private server: Server | null = null;

  constructor(
    private readonly logger: AppLoggerService,
    @Optional() private readonly store?: RealtimeStore,
  ) {
    this.logger.setContext(RealtimePublisher.name);
  }

  setServer(server: Server): void {
    this.server = server;
  }

  emitEchoQueueUpdated(input: EchoQueueUpdatedPayload): void {
    const payload = echoQueueUpdatedSchema.parse(input);
    this.emit(
      echoesRoom(payload.tenantId),
      REALTIME_EVENTS.echoQueueUpdated,
      payload,
    );
  }

  emitPulseStatusUpdated(input: PulseStatusUpdatedPayload): void {
    const payload = pulseStatusUpdatedSchema.parse(input);
    this.emit(
      pulseRoom(payload.tenantId),
      REALTIME_EVENTS.pulseStatusUpdated,
      payload,
    );
  }

  emitNotificationCreated(input: NotificationCreatedPayload): void {
    const payload = notificationCreatedSchema.parse(input);
    this.emit(
      userRoom(payload.userId),
      REALTIME_EVENTS.notificationCreated,
      payload,
    );
  }

  publishSignalUpdate(
    tenantId: string | number,
    input: { signalId: string | number; updateType: SignalUpdatedPayload['updateType'] },
  ): void {
    const payload = signalUpdatedSchema.parse({
      tenantId: String(tenantId),
      signalId: String(input.signalId),
      updateType: input.updateType,
    });
    this.emit(tenantRoom(payload.tenantId), REALTIME_EVENTS.signalUpdated, payload);
  }

  private emit(room: string, event: RealtimeEventName, payload: object): void {
    if (!this.server) {
      this.logger.warn(
        `Realtime server not ready; dropped event ${event}`,
        `RealtimePublisher.emit`,
      );
      return;
    }
    this.server.to(room).emit(event, payload);
    this.persist(room, event, payload as Record<string, unknown>);
  }

  private persist(
    room: string,
    event: RealtimeEventName,
    payload: Record<string, unknown>,
  ): void {
    const tenantId = Number(payload.tenantId);
    if (!this.store || !Number.isInteger(tenantId) || tenantId <= 0) {
      return;
    }
    const refs = messageRefsFromPayload(event, payload);
    this.store.recordOutbound({
      tenantId,
      direction: 'outbound',
      eventName: event,
      roomName: room,
      payload,
      ...refs,
    });
  }
}
