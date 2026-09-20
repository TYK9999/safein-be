import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimePublisher } from './realtime.publisher';
import { RealtimeStore } from './realtime.store';

@Module({
  providers: [RealtimeGateway, RealtimePublisher, RealtimeStore],
  exports: [RealtimePublisher],
})
export class RealtimeModule {}
