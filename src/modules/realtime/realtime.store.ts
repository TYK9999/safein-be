import { Inject, Injectable } from '@nestjs/common';
import type { Kysely } from 'kysely';
import { APP_DB } from '../../database/db.provider';
import type {
  DB,
  RealtimeEventName,
  RealtimeMessageDirection,
} from '../../database/schema';
import { AppLoggerService } from '../../logging/app-logger.service';
import type { RealtimeHandshake } from './realtime.rooms';

export type OpenRealtimeConnectionInput = {
  socketId: string;
  handshake: RealtimeHandshake;
  rooms: string[];
  userAgent?: string;
  remoteAddress?: string;
};

export type RecordRealtimeMessageInput = {
  tenantId: number;
  direction: RealtimeMessageDirection;
  eventName: RealtimeEventName;
  roomName?: string;
  targetUserId?: number;
  pulseId?: number;
  signalId?: number;
  payload: Record<string, unknown>;
  createdBy?: number;
};

function optionalPositiveInt(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const parsed = Number(value.trim());
    return parsed > 0 ? parsed : undefined;
  }
  return undefined;
}

@Injectable()
export class RealtimeStore {
  constructor(
    @Inject(APP_DB) private readonly db: Kysely<DB>,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(RealtimeStore.name);
  }

  async markServerRestarted(): Promise<void> {
    await this.db
      .updateTable('realtime_connection')
      .set({
        status: 'disconnected',
        disconnected_at: new Date(),
        disconnect_reason: 'server_restart',
      })
      .where('status', '=', 'connected')
      .execute();
  }

  async openConnection(input: OpenRealtimeConnectionInput): Promise<number> {
    const { handshake } = input;
    const row = await this.db
      .insertInto('realtime_connection')
      .values({
        tenant_id: handshake.tenantId,
        user_id: handshake.userId ?? null,
        socket_id: input.socketId,
        client_type: handshake.clientType,
        status: 'connected',
        site_ids: handshake.siteIds ?? [],
        user_agent: input.userAgent ?? null,
        remote_address: input.remoteAddress ?? null,
        created_by: handshake.userId ?? null,
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    if (input.rooms.length > 0) {
      await this.db
        .insertInto('realtime_connection_room')
        .values(
          input.rooms.map((room_name) => ({
            connection_id: row.id,
            room_name,
            created_by: handshake.userId ?? null,
          })),
        )
        .execute();
    }

    return row.id;
  }

  async closeConnection(socketId: string, reason?: string): Promise<void> {
    await this.db
      .updateTable('realtime_connection')
      .set({
        status: 'disconnected',
        disconnected_at: new Date(),
        disconnect_reason: reason ?? 'client_disconnect',
      })
      .where('socket_id', '=', socketId)
      .where('status', '=', 'connected')
      .execute();
  }

  recordOutbound(input: RecordRealtimeMessageInput): void {
    void this.persistMessage(input).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to persist realtime message ${input.eventName}: ${message}`,
        `RealtimeStore.recordOutbound`,
      );
    });
  }

  async persistMessage(input: RecordRealtimeMessageInput): Promise<void> {
    await this.db
      .insertInto('realtime_message')
      .values({
        tenant_id: input.tenantId,
        direction: input.direction,
        event_name: input.eventName,
        room_name: input.roomName ?? null,
        target_user_id: input.targetUserId ?? null,
        pulse_id: input.pulseId ?? null,
        signal_id: input.signalId ?? null,
        payload: JSON.stringify(input.payload),
        created_by: input.createdBy ?? null,
      })
      .execute();
  }
}

export function messageRefsFromPayload(
  eventName: RealtimeEventName,
  payload: Record<string, unknown>,
): Pick<RecordRealtimeMessageInput, 'pulseId' | 'signalId' | 'targetUserId'> {
  const pulseId =
    eventName === 'pulse.status.updated'
      ? optionalPositiveInt(payload.sessionId)
      : undefined;
  const signalId =
    eventName === 'signal.updated'
      ? optionalPositiveInt(payload.signalId)
      : undefined;
  const targetUserId =
    eventName === 'notification.created'
      ? optionalPositiveInt(payload.userId)
      : undefined;
  return { pulseId, signalId, targetUserId };
}
