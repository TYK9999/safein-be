import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PlaybackService } from './playback.service';
import { PlaybackSweeper } from './playback-sweeper.service';
import { ThumbnailService } from './thumbnail.service';
import { ThumbnailSweeper } from './thumbnail-sweeper.service';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

/**
 * Direct-to-S3 chunked video upload (docs/md/BACKEND_UPLOAD_SPEC.md). Optional
 * auth via OptionalJwtGuard (from AuthModule). Cleanup of abandoned uploads
 * is handled entirely by the S3 lifecycle rule (AbortIncompleteMultipartUpload)
 * — there is no server-side reaper and no abort endpoint.
 *
 * Two background sweepers run each completed video off the request path (both need
 * ScheduleModule.forRoot(), registered in AppModule): ThumbnailSweeper generates a
 * poster-frame thumbnail, and PlaybackSweeper transcodes a streamable H.264/AAC MP4.
 */
@Module({
  imports: [AuthModule],
  controllers: [UploadsController],
  providers: [
    UploadsService,
    ThumbnailService,
    ThumbnailSweeper,
    PlaybackService,
    PlaybackSweeper,
  ],
})
export class UploadsModule {}
