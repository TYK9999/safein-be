import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { AppConfigModule } from './config/config.module';
import { LoggerModule } from './logger/logger.module';
import { DbModule } from './database/db.module';
import { AuthModule } from './modules/auth/auth.module';
import { SignalsModule } from './modules/signals/signals.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { AudioModule } from './modules/audio/audio.module';
import { SttModule } from './modules/stt/stt.module';
import { HealthModule } from './health/health.module';

// NOTE: the ad-hoc qrcode/uploads modules and the legacy DatabaseModule are
// intentionally NOT imported here. They target throwaway tables that the
// authoritative schema does not create; they return in their own phases,
// re-pointed at the real schema. See docs/SafeIn5-Backend-Plan.md sec 1.

@Module({
  imports: [
    AppConfigModule,
    LoggerModule,
    ScheduleModule.forRoot(),

    DbModule,
    AuthModule,
    SignalsModule,
    UploadsModule,
    AudioModule,
    SttModule,
    HealthModule,
  ],
})
export class AppModule {}
