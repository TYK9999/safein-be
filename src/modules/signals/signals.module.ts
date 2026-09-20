import { Module } from '@nestjs/common';

import { RealtimeModule } from '../realtime/realtime.module';
import { SignalsController } from './signals.controller';
import { SignalsService } from './signals.service';

@Module({
  imports: [RealtimeModule],
  controllers: [SignalsController],
  providers: [SignalsService],
})
export class SignalsModule {}
