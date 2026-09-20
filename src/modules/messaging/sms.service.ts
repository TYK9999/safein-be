import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import type { AppConfig } from '../../config/configuration';
import { AppLoggerService } from '../../logging/app-logger.service';
import { MessagingProviderError, MessagingValidationError } from './messaging.errors';
import { SNS_CLIENT } from './messaging.tokens';
import {
  sendSmsInputSchema,
  type SendSmsInput,
  type SendSmsResult,
} from './sms.types';

@Injectable()
export class SmsService {
  constructor(
    @Inject(SNS_CLIENT) private readonly sns: SNSClient,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(SmsService.name);
  }

  async send(input: SendSmsInput): Promise<SendSmsResult> {
    const parsed = sendSmsInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new MessagingValidationError(
        parsed.error.issues.map((i) => i.message).join('; '),
      );
    }

    const { toE164, body } = parsed.data;
    const smsType = this.config.get('snsSmsType', { infer: true });
    const senderId = this.config.get('snsSmsSenderId', { infer: true });

    const messageAttributes: Record<
      string,
      { DataType: string; StringValue: string }
    > = {
      'AWS.SNS.SMS.SMSType': {
        DataType: 'String',
        StringValue: smsType,
      },
    };

    if (senderId) {
      messageAttributes['AWS.SNS.SMS.SenderID'] = {
        DataType: 'String',
        StringValue: senderId,
      };
    }

    try {
      const response = await this.sns.send(
        new PublishCommand({
          PhoneNumber: toE164,
          Message: body,
          MessageAttributes: messageAttributes,
        }),
      );
      const messageId = response.MessageId;
      if (!messageId) {
        throw new MessagingProviderError('SNS returned no MessageId');
      }
      this.logger.info(
        `SMS sent messageId=${messageId}`,
        `SmsService.send`,
      );
      return { messageId };
    } catch (error) {
      if (error instanceof MessagingProviderError) {
        throw error;
      }
      this.logger.error(
        `SMS send failed: ${error instanceof Error ? error.message : String(error)}`,
        { err: error },
        `SmsService.send`,
      );
      throw new MessagingProviderError('Failed to send SMS via SNS', error);
    }
  }
}
