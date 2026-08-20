import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { SttController } from './stt.controller';
import { SttService } from './stt.service';

/**
 * Speech-to-text (AWS Transcribe): presign -> start job -> poll. Optional auth
 * via OptionalJwtGuard (from AuthModule). The transcribe calls require real
 * AWS (Transcribe cannot read from MinIO).
 */
@Module({
  imports: [AuthModule],
  controllers: [SttController],
  providers: [SttService],
})
export class SttModule {}
