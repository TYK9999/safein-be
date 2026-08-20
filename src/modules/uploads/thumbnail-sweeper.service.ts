import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';

import { AppLoggerService } from '../../logger/app-logger.service';
import { ThumbnailService } from './thumbnail.service';

const INTERVAL_NAME = 'thumbnail-sweep';

/**
 * Drives ThumbnailService.generatePending() on a fixed interval so thumbnailing
 * happens off the request path. Non-overlapping (a slow tick can't stack), never
 * throws out of a tick, and self-healing — a crash mid-generation just gets
 * retried next tick. The interval is registered with Nest's SchedulerRegistry so
 * it is cleared automatically on shutdown.
 */
@Injectable()
export class ThumbnailSweeper implements OnModuleInit {
  private running = false;

  constructor(
    private readonly thumbnails: ThumbnailService,
    private readonly registry: SchedulerRegistry,
    private readonly config: ConfigService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(ThumbnailSweeper.name);
  }

  onModuleInit(): void {
    if (!this.config.getOrThrow<boolean>('thumbnail.sweepEnabled')) {
      this.logger.log(
        'Thumbnail sweep disabled (THUMBNAIL_SWEEP_ENABLED=false).',
      );
      return;
    }
    const ms = this.config.getOrThrow<number>('thumbnail.sweepIntervalMs');
    const interval = setInterval(() => void this.tick(), ms);
    this.registry.addInterval(INTERVAL_NAME, interval);
    this.logger.log(`Thumbnail sweep every ${ms}ms.`);
  }

  async tick(): Promise<void> {
    if (this.running) {
      this.logger.warn('Thumbnail sweep still running; skipping this tick.');
      return;
    }
    this.running = true;
    try {
      const r = await this.thumbnails.generatePending();
      if (r.processed > 0) {
        this.logger.log(
          `Thumbnails: ${r.ready} ready, ${r.failed} failed (${r.processed} processed).`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Thumbnail sweep failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      this.running = false;
    }
  }
}
