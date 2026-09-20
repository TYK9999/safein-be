import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { SESv2Client } from '@aws-sdk/client-sesv2';
import { AppLoggerService } from '../../logging/app-logger.service';
import { EmailService } from './email.service';
import { MessagingProviderError, MessagingValidationError } from './messaging.errors';
import { SES_CLIENT } from './messaging.tokens';

const mockLogger = {
  setContext: jest.fn(),
  log: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

describe('EmailService', () => {
  const send = jest.fn();
  const ses = { send } as unknown as SESv2Client;
  let service: EmailService;

  beforeEach(async () => {
    send.mockReset();
    const moduleRef = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: SES_CLIENT, useValue: ses },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'sesFromEmail') return 'noreply@example.com';
              if (key === 'sesReplyTo') return 'support@example.com';
              return undefined;
            },
          },
        },
        { provide: AppLoggerService, useValue: mockLogger },
      ],
    }).compile();
    service = moduleRef.get(EmailService);
  });

  it('sends email and returns messageId', async () => {
    send.mockResolvedValue({ MessageId: 'ses-1' });
    const result = await service.send({
      to: 'user@example.com',
      subject: 'Hello',
      text: 'Body',
    });
    expect(result).toEqual({ messageId: 'ses-1' });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid input', async () => {
    await expect(
      service.send({
        to: 'not-an-email',
        subject: 'Hello',
        text: 'Body',
      }),
    ).rejects.toBeInstanceOf(MessagingValidationError);
    expect(send).not.toHaveBeenCalled();
  });

  it('rejects when neither text nor html is provided', async () => {
    await expect(
      service.send({
        to: 'user@example.com',
        subject: 'Hello',
      }),
    ).rejects.toBeInstanceOf(MessagingValidationError);
  });

  it('wraps SES failures', async () => {
    send.mockRejectedValue(new Error('throttled'));
    await expect(
      service.send({
        to: 'user@example.com',
        subject: 'Hello',
        text: 'Body',
      }),
    ).rejects.toBeInstanceOf(MessagingProviderError);
  });
});
