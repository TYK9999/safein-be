import { Injectable } from '@nestjs/common';

import { AppLoggerService } from '../../logging/app-logger.service';
import { EmailService } from '../messaging/email.service';

/**
 * Delivers email OTP codes for sign-up, invite activation, and sign-in via SES.
 */
@Injectable()
export class MailerService {
  constructor(
    private readonly email: EmailService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(MailerService.name);
  }

  async sendOtp(email: string, code: string): Promise<void> {
    const result = await this.email.send({
      to: email,
      subject: 'Your SafeIn5 sign-in code',
      text: `Your one-time sign-in code is: ${code}\n\nThis code expires shortly. If you did not request it, you can ignore this email.`,
    });
    this.logger.log(
      `OTP email sent messageId=${result.messageId}`,
      `MailerService.sendOtp`,
    );
  }

  async sendInviteOtp(email: string, code: string): Promise<void> {
    const result = await this.email.send({
      to: email,
      subject: 'You are invited to SafeIn5',
      text: `You have been invited to SafeIn5.\n\nYour one-time code is: ${code}\n\nEnter this code to activate your account and sign in. The code expires shortly. If you did not expect this invite, you can ignore this email.`,
    });
    this.logger.log(
      `Invite OTP email sent messageId=${result.messageId}`,
      `MailerService.sendInviteOtp`,
    );
  }
}
