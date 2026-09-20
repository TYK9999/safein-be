export type RealtimeClientType = 'worker' | 'backoffice';

export type RealtimeHandshake = {
  clientType: RealtimeClientType;
  tenantId: number;
  userId?: number;
  siteIds?: number[];
  token?: string;
};

function parsePositiveInt(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const parsed = Number(value.trim());
    if (parsed > 0) {
      return parsed;
    }
  }
  throw new Error(`${field} must be a positive integer id`);
}

export function tenantRoom(tenantId: number | string): string {
  return `tenant:${tenantId}`;
}

export function echoesRoom(tenantId: number | string): string {
  return `tenant:${tenantId}:echoes`;
}

export function pulseRoom(tenantId: number | string): string {
  return `tenant:${tenantId}:pulse`;
}

export function userRoom(userId: number | string): string {
  return `user:${userId}`;
}

export function parseRealtimeHandshake(auth: unknown): RealtimeHandshake {
  if (!auth || typeof auth !== 'object') {
    throw new Error('Handshake auth is required');
  }

  const record = auth as Record<string, unknown>;
  const clientType = record.clientType;
  const tenantId = parsePositiveInt(record.tenantId, 'Handshake tenantId');

  if (clientType !== 'worker' && clientType !== 'backoffice') {
    throw new Error('Handshake clientType must be worker or backoffice');
  }

  if (tenantId === undefined) {
    throw new Error('Handshake tenantId is required');
  }

  const handshake: RealtimeHandshake = {
    clientType,
    tenantId,
  };

  const userId = parsePositiveInt(record.userId, 'Handshake userId');
  if (userId !== undefined) {
    handshake.userId = userId;
  }

  if (Array.isArray(record.siteIds)) {
    handshake.siteIds = record.siteIds.map((id, index) => {
      const parsed = parsePositiveInt(id, `Handshake siteIds[${index}]`);
      if (parsed === undefined) {
        throw new Error(`Handshake siteIds[${index}] must be a positive integer id`);
      }
      return parsed;
    });
  }

  if (typeof record.token === 'string' && record.token.length > 0) {
    handshake.token = record.token;
  }

  return handshake;
}

export function roomsForHandshake(handshake: RealtimeHandshake): string[] {
  const rooms = [tenantRoom(handshake.tenantId), pulseRoom(handshake.tenantId)];

  if (handshake.clientType === 'backoffice') {
    rooms.push(echoesRoom(handshake.tenantId));
  }

  if (handshake.userId) {
    rooms.push(userRoom(handshake.userId));
  }

  return rooms;
}
