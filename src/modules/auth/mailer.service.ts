import { Injectable } from '@nestjs/common';

import { AppLoggerService } from '../../logger/app-logger.service';

/**
 * Delivers OTP codes and magic links.
 *
 * Dev implementation: writes to the log so the whole passwordless loop works
 * on localhost with no email provider. Swap for an SES/SendGrid adapter (same
 * interface) when the cloud account exists.
 */
@Injectable()
export class MailerService {
  constructor(private readonly logger: AppLoggerService) {
    this.logger.setContext(MailerService.name);
  }

  // Return Promise<void> (not `async`) so callers keep awaiting; the real
  // SES/SendGrid adapter that replaces this will actually be async.
  sendOtp(email: string, code: string): Promise<void> {
    this.logger.log(`[DEV MAIL] OTP for ${email}: ${code}`);
    return Promise.resolve();
  }

  sendMagicLink(email: string, url: string): Promise<void> {
    this.logger.log(`[DEV MAIL] Magic link for ${email}: ${url}`);
    return Promise.resolve();
  }
}
