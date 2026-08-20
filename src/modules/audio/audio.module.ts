import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { AudioController } from './audio.controller';
import { AudioService } from './audio.service';

/**
 * Audio-clip upload (direct-to-S3, single presigned PUT). Optional auth via
 * OptionalJwtGuard (from AuthModule).
 */
@Module({
  imports: [AuthModule],
  controllers: [AudioController],
  providers: [AudioService],
})
export class AudioModule {}
