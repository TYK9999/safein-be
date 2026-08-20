import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import configuration from './configuration';
import { EnvSchema } from './env.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],

      validate: (config) => {
        return EnvSchema.parse(config);
      },
    }),
  ],
})
export class AppConfigModule {}
