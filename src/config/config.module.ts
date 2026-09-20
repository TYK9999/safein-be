import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import loadConfiguration from './configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [loadConfiguration],
    }),
  ],
})
export class AppConfigModule {}
