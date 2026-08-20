import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { OptionalUser, Public } from '../auth/decorators';
import type { VerifiedAccess } from '../auth/jwt.service';
import { OptionalJwtGuard } from '../auth/optional-jwt.guard';
import { SttPresignDto, StartJobDto } from './stt.schema';
import {
  JobStartResult,
  JobStatusResult,
  PresignResult,
  SttActor,
  SttService,
  TranscriptionJobView,
} from './stt.service';

/**
 * Speech-to-text (AWS Transcribe), under /stt (the front-end's VITE_STT_ENDPOINT_URL
 * points at /api/v1/stt). presign -> jobs -> poll, plus GET /stt/jobs for the
 * caller's history. Auth OPTIONAL (guest-capable). See BACKEND_SPEECH_TO_TEXT_SPEC.md.
 */
@Public()
@UseGuards(OptionalJwtGuard)
@Controller({ version: '1' })
export class SttController {
  constructor(private readonly stt: SttService) {}

  @Post('stt/presign')
  @HttpCode(HttpStatus.OK) // spec returns 200
  presign(
    @OptionalUser() user: VerifiedAccess | undefined,
    @Body() dto: SttPresignDto,
  ): Promise<PresignResult> {
    return this.stt.presign(actor(user), dto);
  }

  @Post('stt/jobs')
  @HttpCode(HttpStatus.OK) // spec returns 200 with { jobId, status:"queued" }
  startJob(
    @OptionalUser() user: VerifiedAccess | undefined,
    @Body() dto: StartJobDto,
  ): Promise<JobStartResult> {
    return this.stt.startJob(actor(user), dto);
  }

  @Get('stt/jobs')
  list(
    @OptionalUser() user: VerifiedAccess | undefined,
    @Query('limit') limit?: string,
  ): Promise<TranscriptionJobView[]> {
    return this.stt.list(actor(user), toLimit(limit));
  }

  @Get('stt/jobs/:jobId')
  getJob(@Param('jobId') jobId: string): Promise<JobStatusResult> {
    return this.stt.getJob(jobId);
  }
}

function actor(user?: VerifiedAccess): SttActor | null {
  return user ? { userId: user.sub, tenantId: user.tid } : null;
}

function toLimit(raw?: string): number | undefined {
  if (raw === undefined) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}
