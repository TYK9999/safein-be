import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SESv2Client,
  SendEmailCommand,
  type SendEmailCommandInput,
} from '@aws-sdk/client-sesv2';
import type { AppConfig } from '../../config/configuration';
import { AppLoggerService } from '../../logging/app-logger.service';
import { MessagingProviderError, MessagingValidationError } from './messaging.errors';
import { SES_CLIENT } from './messaging.tokens';
import {
  sendEmailInputSchema,
  type SendEmailInput,
  type SendEmailResult,
} from './email.types';

@Injectable()
export class EmailService {
  constructor(
    @Inject(SES_CLIENT) private readonly ses: SESv2Client,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(EmailService.name);
  }

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const parsed = sendEmailInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new MessagingValidationError(
        parsed.error.issues.map((i) => i.message).join('; '),
      );
    }

    const { to, subject, text, html, replyTo } = parsed.data;
    const toAddresses = Array.isArray(to) ? to : [to];
    const from = this.config.get('sesFromEmail', { infer: true });
    const defaultReplyTo = this.config.get('sesReplyTo', { infer: true });
    const effectiveReplyTo = replyTo ?? defaultReplyTo;

    const commandInput: SendEmailCommandInput = {
      FromEmailAddress: from,
      Destination: { ToAddresses: toAddresses },
      Content: {
        Simple: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: {
            ...(text ? { Text: { Data: text, Charset: 'UTF-8' } } : {}),
            ...(html ? { Html: { Data: html, Charset: 'UTF-8' } } : {}),
          },
        },
      },
      ...(effectiveReplyTo
        ? { ReplyToAddresses: [effectiveReplyTo] }
        : {}),
    };

    try {
      const response = await this.ses.send(new SendEmailCommand(commandInput));
      const messageId = response.MessageId;
      if (!messageId) {
        throw new MessagingProviderError('SES returned no MessageId');
      }
      this.logger.info(
        `Email sent messageId=${messageId} toCount=${toAddresses.length}`,
        `EmailService.send`,
      );
      return { messageId };
    } catch (error) {
      if (error instanceof MessagingProviderError) {
        throw error;
      }
      this.logger.error(
        `Email send failed: ${error instanceof Error ? error.message : String(error)}`,
        { err: error },
        `EmailService.send`,
      );
      throw new MessagingProviderError('Failed to send email via SES', error);
    }
  }
}
