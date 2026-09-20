import { HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { DatabaseService } from '../../database/database.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  const res = {
    status: jest.fn().mockReturnThis(),
  } as unknown as Response;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns ok when database ping succeeds', async () => {
    const database = {
      ping: jest.fn().mockResolvedValue(true),
    } as unknown as DatabaseService;
    const controller = new HealthController(database);

    const body = await controller.check(res);

    expect(body).toEqual({
      status: 'ok',
      checks: { process: 'up', database: 'up' },
    });
    expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
  });

  it('returns error when database ping fails', async () => {
    const database = {
      ping: jest.fn().mockResolvedValue(false),
    } as unknown as DatabaseService;
    const controller = new HealthController(database);

    const body = await controller.check(res);

    expect(body).toEqual({
      status: 'error',
      checks: { process: 'up', database: 'down' },
    });
    expect(res.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
  });
});
