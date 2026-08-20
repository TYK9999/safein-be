import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { OptionalUser, Public } from '../auth/decorators';
import type { VerifiedAccess } from '../auth/jwt.service';
import { OptionalJwtGuard } from '../auth/optional-jwt.guard';
import { PlaybackService } from './playback.service';
import { ThumbnailService } from './thumbnail.service';
import { UploadNextDto } from './uploads.schema';
import { NextResult, Uploader, UploadsService } from './uploads.service';

/**
 * Chunked video upload — direct-to-S3, single endpoint. See
 * docs/md/BACKEND_UPLOAD_SPEC.md. One POST /uploads/next drives a lockstep S3
 * Multipart Upload: the first call (no sessionId) starts it and returns the
 * presigned URL for chunk 1; each later call confirms the previous chunk's S3
 * ETag and returns the next URL; the last confirmation completes the upload and
 * returns a videoId. The client PUTs each chunk STRAIGHT to S3 — the backend
 * never receives the bytes.
 *
 * Auth is OPTIONAL (a deliberate deviation from the spec's mandatory Bearer):
 * with a token the upload is tied to that member and owner-scoped; without one
 * it is anonymous (ownerless, Community tenant) and the returned sessionId is
 * the capability. @Public opts out of the global guard; OptionalJwtGuard reads a
 * token if present (rejecting only a present-but-invalid one).
 */
@Public()
@UseGuards(OptionalJwtGuard)
@Controller({ version: '1' })
export class UploadsController {
  constructor(
    private readonly uploads: UploadsService,
    private readonly thumbnails: ThumbnailService,
    private readonly playback: PlaybackService,
  ) {}

  @Post('uploads/next')
  @HttpCode(HttpStatus.OK) // spec returns 200 on both start and confirm
  next(
    @OptionalUser() user: VerifiedAccess | undefined,
    @Body() dto: UploadNextDto,
  ): Promise<NextResult> {
    return this.uploads.next(this.actor(user), dto);
  }

  /**
   * A short-lived presigned URL for the video's poster-frame thumbnail (owner-
   * scoped). 404 until the background sweep has generated it (or if it failed).
   */
  @Get('uploads/:token/thumbnail')
  thumbnail(
    @OptionalUser() user: VerifiedAccess | undefined,
    @Param('token') token: string,
  ): Promise<{ url: string }> {
    return this.thumbnails.thumbnailUrl(this.actor(user), token);
  }

  /**
   * A short-lived presigned URL for the video's streamable (H.264/AAC +faststart)
   * rendition, owner-scoped. Play it in a native <video> tag — it seeks and plays
   * on all browsers/devices. 404 until the background transcode sweep produces it
   * (or if it failed).
   */
  @Get('uploads/:token/playback')
  playbackUrl(
    @OptionalUser() user: VerifiedAccess | undefined,
    @Param('token') token: string,
  ): Promise<{ url: string }> {
    return this.playback.playbackUrl(this.actor(user), token);
  }

  private actor(user?: VerifiedAccess): Uploader | null {
    return user ? { userId: user.sub, tenantId: user.tid } : null;
  }
}
