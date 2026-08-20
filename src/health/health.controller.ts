import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
  VERSION_NEUTRAL,
  Version,
} from '@nestjs/common';
import { Kysely, sql } from 'kysely';

import type { DB } from '../database/schema';
import { APP_DB } from '../database/db.provider';
import { Public } from '../modules/auth/decorators';

@Controller()
export class HealthController {
  constructor(@Inject(APP_DB) private readonly db: Kysely<DB>) {}

  @Public()
  @Version(VERSION_NEUTRAL)
  @Get('healthz')
  liveness(): { status: string } {
    return { status: 'ok' };
  }

  @Public()
  @Version(VERSION_NEUTRAL)
  @Get('readyz')
  async readiness(): Promise<{ status: string; db: string }> {
    try {
      await sql`select 1`.execute(this.db);
      return { status: 'ok', db: 'up' };
    } catch {
      throw new ServiceUnavailableException({ status: 'error', db: 'down' });
    }
  }
}
