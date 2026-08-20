import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.video.controller';
import { UploadsService } from './uploads.video.service';
import { s3Provider } from './s3.provider';

@Module({
  controllers: [UploadsController],
  providers: [s3Provider, UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
