import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { OptionalUser, Public } from '../auth/decorators';
import type { VerifiedAccess } from '../auth/jwt.service';
import { OptionalJwtGuard } from '../auth/optional-jwt.guard';
import { AudioConfirmDto, AudioPresignDto } from './audio.schema';
import {
  AudioActor,
  AudioClipView,
  AudioPresignResult,
  AudioService,
} from './audio.service';

/**
 * Audio-clip capture: presign -> direct PUT to S3 -> confirm (marks the clip
 * uploaded). GET lists the caller's own clips (history). See
 * BACKEND_AUDIO_UPLOAD_SPEC.md. Auth is OPTIONAL (guest-capable, deviating from
 * the spec's mandatory Bearer — consistent with the video-upload flow).
 */
@Public()
@UseGuards(OptionalJwtGuard)
@Controller({ version: '1' })
export class AudioController {
  constructor(private readonly audio: AudioService) {}

  @Post('audio-clips/presign')
  @HttpCode(HttpStatus.OK) // spec returns 200
  presign(
    @OptionalUser() user: VerifiedAccess | undefined,
    @Body() dto: AudioPresignDto,
  ): Promise<AudioPresignResult> {
    return this.audio.presign(actor(user), dto);
  }

  @Post('audio-clips/confirm')
  @HttpCode(HttpStatus.OK)
  confirm(
    @OptionalUser() user: VerifiedAccess | undefined,
    @Body() dto: AudioConfirmDto,
  ): Promise<AudioClipView> {
    return this.audio.confirm(actor(user), dto.s3Key);
  }

  @Get('audio-clips')
  list(
    @OptionalUser() user: VerifiedAccess | undefined,
    @Query('limit') limit?: string,
  ): Promise<AudioClipView[]> {
    return this.audio.list(actor(user), toLimit(limit));
  }
}

function actor(user?: VerifiedAccess): AudioActor | null {
  return user ? { userId: user.sub, tenantId: user.tid } : null;
}

function toLimit(raw?: string): number | undefined {
  if (raw === undefined) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}
