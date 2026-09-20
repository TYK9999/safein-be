import {
  parseRealtimeHandshake,
  roomsForHandshake,
  echoesRoom,
  pulseRoom,
  tenantRoom,
  userRoom,
} from './realtime.rooms';

describe('parseRealtimeHandshake', () => {
  it('accepts worker handshake with integer tenant and user', () => {
    expect(
      parseRealtimeHandshake({
        clientType: 'worker',
        tenantId: 1,
        userId: 2,
      }),
    ).toEqual({
      clientType: 'worker',
      tenantId: 1,
      userId: 2,
    });
  });

  it('accepts numeric string ids', () => {
    expect(
      parseRealtimeHandshake({
        clientType: 'backoffice',
        tenantId: '3',
        userId: '4',
        siteIds: ['5', 6],
      }),
    ).toEqual({
      clientType: 'backoffice',
      tenantId: 3,
      userId: 4,
      siteIds: [5, 6],
    });
  });

  it('rejects missing tenantId', () => {
    expect(() =>
      parseRealtimeHandshake({
        clientType: 'backoffice',
      }),
    ).toThrow(/tenantId/);
  });

  it('rejects non-integer tenantId', () => {
    expect(() =>
      parseRealtimeHandshake({
        clientType: 'worker',
        tenantId: 'tenant-1',
      }),
    ).toThrow(/tenantId/);
  });

  it('rejects unknown clientType', () => {
    expect(() =>
      parseRealtimeHandshake({
        clientType: 'admin',
        tenantId: 1,
      }),
    ).toThrow(/clientType/);
  });
});

describe('roomsForHandshake', () => {
  it('joins echoes room for backoffice', () => {
    const rooms = roomsForHandshake({
      clientType: 'backoffice',
      tenantId: 1,
      userId: 9,
    });
    expect(rooms).toEqual([
      tenantRoom(1),
      pulseRoom(1),
      echoesRoom(1),
      userRoom(9),
    ]);
  });

  it('does not join echoes room for worker', () => {
    const rooms = roomsForHandshake({
      clientType: 'worker',
      tenantId: 1,
    });
    expect(rooms).toEqual([tenantRoom(1), pulseRoom(1)]);
    expect(rooms).not.toContain(echoesRoom(1));
  });
});
