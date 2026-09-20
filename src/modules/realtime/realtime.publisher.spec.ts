import type { AppLoggerService } from '../../logging/app-logger.service';
import { RealtimePublisher } from './realtime.publisher';
import { REALTIME_EVENTS } from './realtime.events';
import { echoesRoom, pulseRoom, userRoom } from './realtime.rooms';

const mockLogger = {
  setContext: jest.fn(),
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
} as unknown as AppLoggerService;

describe('RealtimePublisher', () => {
  it('emits echo queue updates to the echoes room', () => {
    const publisher = new RealtimePublisher(mockLogger);
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    publisher.setServer({ to } as never);

    publisher.emitEchoQueueUpdated({
      tenantId: 't1',
      echoId: 'e1',
      updateType: 'created',
    });

    expect(to).toHaveBeenCalledWith(echoesRoom('t1'));
    expect(emit).toHaveBeenCalledWith(REALTIME_EVENTS.echoQueueUpdated, {
      tenantId: 't1',
      echoId: 'e1',
      updateType: 'created',
    });
  });

  it('emits pulse and notification to the correct rooms', () => {
    const publisher = new RealtimePublisher(mockLogger);
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    publisher.setServer({ to } as never);

    publisher.emitPulseStatusUpdated({
      tenantId: 't1',
      sessionId: 's1',
      status: 'in_progress',
      stage: 'SHIFT',
    });
    publisher.emitNotificationCreated({
      tenantId: 't1',
      notificationId: 'n1',
      type: 'echo_assigned',
      userId: 'u1',
    });

    expect(to).toHaveBeenCalledWith(pulseRoom('t1'));
    expect(to).toHaveBeenCalledWith(userRoom('u1'));
    expect(emit).toHaveBeenCalledWith(
      REALTIME_EVENTS.pulseStatusUpdated,
      expect.objectContaining({ sessionId: 's1' }),
    );
    expect(emit).toHaveBeenCalledWith(
      REALTIME_EVENTS.notificationCreated,
      expect.objectContaining({ notificationId: 'n1' }),
    );
  });

  it('emits signal updates to the tenant room', () => {
    const publisher = new RealtimePublisher(mockLogger);
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    publisher.setServer({ to } as never);

    publisher.publishSignalUpdate(1, { signalId: 42, updateType: 'created' });

    expect(to).toHaveBeenCalledWith('tenant:1');
    expect(emit).toHaveBeenCalledWith(REALTIME_EVENTS.signalUpdated, {
      tenantId: '1',
      signalId: '42',
      updateType: 'created',
    });
  });
});
