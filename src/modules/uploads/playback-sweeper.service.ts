import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';

import { AppLoggerService } from '../../logging/app-logger.service';
import { PlaybackService } from './playback.service';

const INTERVAL_NAME = 'playback-sweep';

/**
 * Drives PlaybackService.transcodePending() on a fixed interval so transcoding
 * happens off the request path. Non-overlapping (a slow tick can't stack), never
 * throws out of a tick, and self-healing — a crash mid-transcode just gets
 * retried next tick. The interval is registered with Nest's SchedulerRegistry so
 * it is cleared automatically on shutdown.
 */
@Injectable()
export class PlaybackSweeper implements OnModuleInit {
  private running = false;

  constructor(
    private readonly playback: PlaybackService,
    private readonly registry: SchedulerRegistry,
    private readonly config: ConfigService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(PlaybackSweeper.name);
  }

  onModuleInit(): void {
    if (!this.config.getOrThrow<boolean>('playback.sweepEnabled')) {
      this.logger.log(
        'Playback sweep disabled (PLAYBACK_SWEEP_ENABLED=false).',
        `PlaybackSweeper.onModuleInit`,
      );
      return;
    }
    const ms = this.config.getOrThrow<number>('playback.sweepIntervalMs');
    const interval = setInterval(() => void this.tick(), ms);
    this.registry.addInterval(INTERVAL_NAME, interval);
    this.logger.log(
      `Playback sweep every ${ms}ms.`,
      `PlaybackSweeper.onModuleInit`,
    );
  }

  async tick(): Promise<void> {
    if (this.running) {
      this.logger.warn(
        'Playback sweep still running; skipping this tick.',
        `PlaybackSweeper.tick`,
      );
      return;
    }
    this.running = true;
    try {
      const r = await this.playback.transcodePending();
      if (r.processed > 0) {
        this.logger.log(
          `Playback: ${r.ready} ready, ${r.failed} failed (${r.processed} processed).`,
          `PlaybackSweeper.tick`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Playback sweep failed: ${err instanceof Error ? err.message : String(err)}`,
        { err },
        `PlaybackSweeper.tick`,
      );
    } finally {
      this.running = false;
    }
  }
}
