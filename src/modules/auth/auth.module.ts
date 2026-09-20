import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AccessResolver } from './access-resolver';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtService } from './jwt.service';
import { MailerService } from './mailer.service';
import { OptionalJwtGuard } from './optional-jwt.guard';
import { PermissionsService } from './permissions.service';

/**
 * Auth: passwordless signup + login (email OTP only). First OTP activates.
 * Registers the global JWT auth guard (routes opt out with @Public()).
 * OptionalJwtGuard is exported for routes that accept an optional token.
 */
@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    AccessResolver,
    JwtService,
    MailerService,
    PermissionsService,
    OptionalJwtGuard,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [JwtService, OptionalJwtGuard, AccessResolver],
})
export class AuthModule {}
