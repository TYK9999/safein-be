import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { DatabaseService } from '../../database/database.service';
import { Public } from '../auth/decorators';

type HealthBody = {
  status: 'ok' | 'error';
  checks: {
    process: 'up';
    database: 'up' | 'down';
  };
};

@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Public()
  @Get()
  async check(@Res({ passthrough: true }) res: Response): Promise<HealthBody> {
    const dbUp = await this.database.ping();
    const body: HealthBody = {
      status: dbUp ? 'ok' : 'error',
      checks: {
        process: 'up',
        database: dbUp ? 'up' : 'down',
      },
    };

    res.status(dbUp ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return body;
  }
}
