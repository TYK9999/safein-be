import { S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';

export const S3_CLIENT = Symbol('S3_CLIENT');

export const s3Provider = {
  provide: S3_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService): S3Client => {
    return new S3Client({
      region: config.get<string>('aws.region'),
      credentials: {
        accessKeyId: config.get<string>('aws.accessKeyId')!,
        secretAccessKey: config.get<string>('aws.secretAccessKey')!,
      },
    });
  },
};
