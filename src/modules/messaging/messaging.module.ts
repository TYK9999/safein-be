import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESv2Client } from '@aws-sdk/client-sesv2';
import { SNSClient } from '@aws-sdk/client-sns';
import type { AppConfig } from '../../config/configuration';
import { EmailService } from './email.service';
import { SES_CLIENT, SNS_CLIENT } from './messaging.tokens';
import { SmsService } from './sms.service';

@Global()
@Module({
  providers: [
    {
      provide: SES_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) =>
        new SESv2Client({
          region: config.get('awsRegion', { infer: true }),
        }),
    },
    {
      provide: SNS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) =>
        new SNSClient({
          region: config.get('awsRegion', { infer: true }),
        }),
    },
    EmailService,
    SmsService,
  ],
  exports: [EmailService, SmsService],
})
export class MessagingModule {}
