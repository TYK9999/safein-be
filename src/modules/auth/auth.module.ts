import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtService } from './jwt.service';
import { MailerService } from './mailer.service';
import { OptionalJwtGuard } from './optional-jwt.guard';

/**
 * Auth: passwordless signup + login (email OTP + magic link).
 * Registers the global JWT auth guard (routes opt out with @Public()).
 * OptionalJwtGuard is exported for routes that accept an optional token.
 */
@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtService,
    MailerService,
    OptionalJwtGuard,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [JwtService, OptionalJwtGuard],
})
export class AuthModule {}
