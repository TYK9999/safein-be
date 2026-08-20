import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UsePipes,
} from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { UploadsService } from './uploads.video.service';
import {
  InitiateUploadSchema,
  ResignPartsSchema,
  CompleteUploadSchema,
  AbortUploadSchema,
} from './uploads.dto';
import type {
  InitiateUploadDto,
  ResignPartsDto,
  CompleteUploadDto,
  AbortUploadDto,
} from './uploads.dto';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  /**
   * POST /uploads/initiate
   *
   * Creates an S3 multipart upload and returns a presigned PUT URL for every part.
   */
  @Post('initiate')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(InitiateUploadSchema))
  initiateUpload(@Body() dto: InitiateUploadDto) {
    return this.uploadsService.initiateUpload(dto);
  }

  /**
   * POST /uploads/parts
   *
   * Re-presigns expired part URLs for an in-progress upload (resume support).
   * Verifies the uploadId/key belong to an 'initiated' upload in the DB.
   * Returns 410 Gone if the S3 multipart upload has expired or been aborted.
   */
  @Post('parts')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(ResignPartsSchema))
  resignParts(@Body() dto: ResignPartsDto) {
    return this.uploadsService.resignParts(dto);
  }

  /**
   * GET /uploads/:uploadId/parts?key=<s3-key>
   *
   * Lists the parts S3 already has for the given multipart upload so the client
   * can reconcile its local ETag state after losing IndexedDB data.
   * Returns 410 Gone if the upload no longer exists on S3.
   */
  @Get(':uploadId/parts')
  listUploadedParts(
    @Param('uploadId') uploadId: string,
    @Query('key') key: string,
  ) {
    return this.uploadsService.listUploadedParts(uploadId, key);
  }

  /**
   * POST /uploads/complete
   *
   * Finalizes the S3 multipart upload by calling CompleteMultipartUpload.
   * Idempotent: returns the same 200 response if the upload is already completed.
   * Returns 409 { code: "PART_MISMATCH" } if S3 rejects the part list.
   * Returns 410 Gone if the upload has been aborted.
   */
  @Post('complete')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(CompleteUploadSchema))
  completeUpload(@Body() dto: CompleteUploadDto) {
    return this.uploadsService.completeUpload(dto);
  }

  /**
   * POST /uploads/abort
   *
   * Aborts an in-progress S3 multipart upload, freeing all uploaded parts.
   * Fully idempotent: unknown or already-aborted uploadId returns 200.
   */
  @Post('abort')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(AbortUploadSchema))
  abortUpload(@Body() dto: AbortUploadDto) {
    return this.uploadsService.abortUpload(dto);
  }
}
