import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { SNSClient } from '@aws-sdk/client-sns';
import { AppLoggerService } from '../../logging/app-logger.service';
import { MessagingProviderError, MessagingValidationError } from './messaging.errors';
import { SNS_CLIENT } from './messaging.tokens';
import { SmsService } from './sms.service';

const mockLogger = {
  setContext: jest.fn(),
  log: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

describe('SmsService', () => {
  const send = jest.fn();
  const sns = { send } as unknown as SNSClient;
  let service: SmsService;

  beforeEach(async () => {
    send.mockReset();
    const moduleRef = await Test.createTestingModule({
      providers: [
        SmsService,
        { provide: SNS_CLIENT, useValue: sns },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'snsSmsType') return 'Transactional';
              if (key === 'snsSmsSenderId') return undefined;
              return undefined;
            },
          },
        },
        { provide: AppLoggerService, useValue: mockLogger },
      ],
    }).compile();
    service = moduleRef.get(SmsService);
  });

  it('publishes SMS and returns messageId', async () => {
    send.mockResolvedValue({ MessageId: 'sns-1' });
    const result = await service.send({
      toE164: '+14155552671',
      body: 'Alert',
    });
    expect(result).toEqual({ messageId: 'sns-1' });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('rejects non-E.164 numbers', async () => {
    await expect(
      service.send({
        toE164: '555-2671',
        body: 'Alert',
      }),
    ).rejects.toBeInstanceOf(MessagingValidationError);
    expect(send).not.toHaveBeenCalled();
  });

  it('wraps SNS failures', async () => {
    send.mockRejectedValue(new Error('denied'));
    await expect(
      service.send({
        toE164: '+14155552671',
        body: 'Alert',
      }),
    ).rejects.toBeInstanceOf(MessagingProviderError);
  });
});
