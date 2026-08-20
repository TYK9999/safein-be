import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators';
import type { VerifiedAccess } from '../auth/jwt.service';
import type { SignalStatus } from '../../database/schema';
import { CloseSignalDto, CreateSignalDto } from './signal.schema';
import { SignalsService, SignalView } from './signals.service';

const STATUSES: SignalStatus[] = ['open', 'acknowledged', 'closed'];

/** All routes require a valid access token (global guard; no @Public here). */
@Controller({ version: '1' })
export class SignalsController {
  constructor(private readonly signals: SignalsService) {}

  @Post('signals')
  create(
    @CurrentUser() user: VerifiedAccess,
    @Body() dto: CreateSignalDto,
  ): Promise<SignalView> {
    return this.signals.create(user.sub, user.tid, dto);
  }

  @Get('signals/mine')
  listMine(
    @CurrentUser() user: VerifiedAccess,
    @Query('limit') limit?: string,
  ): Promise<SignalView[]> {
    return this.signals.listMine(user.sub, user.tid, toInt(limit));
  }

  @Get('feed')
  feed(
    @CurrentUser() user: VerifiedAccess,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ): Promise<SignalView[]> {
    return this.signals.feed(user.tid, toInt(limit), toStatus(status));
  }

  @Get('signals/:id')
  getOne(
    @CurrentUser() user: VerifiedAccess,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SignalView> {
    return this.signals.getById(user.tid, id);
  }

  @Post('signals/:id/acknowledge')
  @HttpCode(HttpStatus.OK)
  acknowledge(
    @CurrentUser() user: VerifiedAccess,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SignalView> {
    return this.signals.acknowledge(
      { id: user.sub, role: user.role, tenantId: user.tid },
      id,
    );
  }

  @Post('signals/:id/close')
  @HttpCode(HttpStatus.OK)
  close(
    @CurrentUser() user: VerifiedAccess,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CloseSignalDto,
  ): Promise<SignalView> {
    return this.signals.close(
      { id: user.sub, role: user.role, tenantId: user.tid },
      id,
      dto.closeNote,
    );
  }
}

function toInt(v?: string): number | undefined {
  if (v === undefined) return undefined;
  const n = Number.parseInt(v, 10);
  return Number.isNaN(n) ? undefined : n;
}

function toStatus(v?: string): SignalStatus | undefined {
  return v && (STATUSES as string[]).includes(v)
    ? (v as SignalStatus)
    : undefined;
}
