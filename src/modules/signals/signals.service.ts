import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Kysely } from 'kysely';

import { APP_DB } from '../../database/db.provider';
import type { Classification, DB, SignalStatus } from '../../database/schema';
import { CreateSignalDto } from './signal.schema';
import { transition } from './signal.workflow';
import { Author, presentAuthor } from './signal.present';

export interface SignalView {
  id: number;
  classification: Classification;
  bodyText: string;
  status: SignalStatus;
  isAnonymous: boolean;
  createdAt: Date;
  acknowledgedAt: Date | null;
  closedAt: Date | null;
  closeNote: string | null;
  author: Author | null; // null when the signal is anonymous
}

export interface Actor {
  id: number;
  role: string;
  tenantId: number;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * Behaviour signals: capture, read, and the supervisor loop (acknowledge /
 * close). Every signal is attributed and every logged-in user sees the feed.
 * Anonymity and tenant/site scoping arrive in later phases.
 */
@Injectable()
export class SignalsService {
  constructor(@Inject(APP_DB) private readonly db: Kysely<DB>) {}

  async create(
    authorUserId: number,
    tenantId: number,
    dto: CreateSignalDto,
  ): Promise<SignalView> {
    const row = await this.db
      .insertInto('signal')
      .values({
        tenant_id: tenantId,
        author_user_id: authorUserId,
        classification: dto.classification,
        body_text: dto.bodyText,
        is_anonymous: dto.anonymous,
        created_by: authorUserId,
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    return this.getById(tenantId, row.id);
  }

  async feed(
    tenantId: number,
    limit?: number,
    status?: SignalStatus,
  ): Promise<SignalView[]> {
    let q = this.baseQuery()
      .where('signal.tenant_id', '=', tenantId)
      .orderBy('signal.created_at', 'desc')
      .limit(clampLimit(limit));
    if (status) q = q.where('signal.status', '=', status);
    const rows = await q.execute();
    return rows.map(toView);
  }

  async listMine(
    authorUserId: number,
    tenantId: number,
    limit?: number,
  ): Promise<SignalView[]> {
    const rows = await this.baseQuery()
      .where('signal.tenant_id', '=', tenantId)
      .where('signal.author_user_id', '=', authorUserId)
      .orderBy('signal.created_at', 'desc')
      .limit(clampLimit(limit))
      .execute();
    return rows.map(toView);
  }

  async getById(tenantId: number, id: number): Promise<SignalView> {
    const row = await this.baseQuery()
      .where('signal.tenant_id', '=', tenantId)
      .where('signal.id', '=', id)
      .executeTakeFirst();
    if (!row) throw new NotFoundException('Signal not found.');
    return toView(row);
  }

  // ─── Supervisor loop ──────────────────────────────────────────────────────────
  async acknowledge(actor: Actor, signalId: number): Promise<SignalView> {
    this.requireSupervisor(actor);
    const current = await this.currentStatus(actor.tenantId, signalId);
    const result = transition(current, 'acknowledge');
    if (result === 'conflict') {
      throw new ConflictException(`Cannot acknowledge a ${current} signal.`);
    }
    if (result === 'apply') {
      await this.db
        .updateTable('signal')
        .set({
          status: 'acknowledged',
          acknowledged_at: new Date(),
          acknowledged_by: actor.id,
          updated_by: actor.id,
        })
        .where('id', '=', signalId)
        .where('tenant_id', '=', actor.tenantId)
        .where('status', '=', 'open')
        .execute();
    }
    return this.getById(actor.tenantId, signalId);
  }

  async close(
    actor: Actor,
    signalId: number,
    closeNote: string,
  ): Promise<SignalView> {
    this.requireSupervisor(actor);
    const current = await this.currentStatus(actor.tenantId, signalId);
    const result = transition(current, 'close');
    if (result === 'conflict') {
      throw new ConflictException('Signal is already closed.');
    }
    await this.db
      .updateTable('signal')
      .set({
        status: 'closed',
        closed_at: new Date(),
        closed_by: actor.id,
        close_note: closeNote,
        updated_by: actor.id,
      })
      .where('id', '=', signalId)
      .where('tenant_id', '=', actor.tenantId)
      .where('status', 'in', ['open', 'acknowledged'])
      .execute();
    return this.getById(actor.tenantId, signalId);
  }

  // ─── internals ──────────────────────────────────────────────────────────────
  private async currentStatus(
    tenantId: number,
    signalId: number,
  ): Promise<SignalStatus> {
    const row = await this.db
      .selectFrom('signal')
      .select('status')
      .where('id', '=', signalId)
      .where('tenant_id', '=', tenantId)
      .executeTakeFirst();
    if (!row) throw new NotFoundException('Signal not found.');
    return row.status;
  }

  private requireSupervisor(actor: Actor): void {
    if (actor.role !== 'supervisor') {
      throw new ForbiddenException('Supervisor role required.');
    }
  }

  private baseQuery() {
    return this.db
      .selectFrom('signal')
      .innerJoin('app_user', 'app_user.id', 'signal.author_user_id')
      .select([
        'signal.id as id',
        'signal.classification as classification',
        'signal.body_text as body_text',
        'signal.status as status',
        'signal.is_anonymous as is_anonymous',
        'signal.created_at as created_at',
        'signal.acknowledged_at as acknowledged_at',
        'signal.closed_at as closed_at',
        'signal.close_note as close_note',
        'app_user.id as author_id',
        'app_user.first_name as author_first_name',
        'app_user.last_name as author_last_name',
      ]);
  }
}

interface Row {
  id: number;
  classification: Classification;
  body_text: string;
  status: SignalStatus;
  is_anonymous: boolean;
  created_at: Date;
  acknowledged_at: Date | null;
  closed_at: Date | null;
  close_note: string | null;
  author_id: number;
  author_first_name: string | null;
  author_last_name: string | null;
}

function toView(r: Row): SignalView {
  return {
    id: r.id,
    classification: r.classification,
    bodyText: r.body_text,
    status: r.status,
    isAnonymous: r.is_anonymous,
    createdAt: r.created_at,
    acknowledgedAt: r.acknowledged_at,
    closedAt: r.closed_at,
    closeNote: r.close_note,
    author: presentAuthor(
      r.is_anonymous,
      r.author_id,
      r.author_first_name,
      r.author_last_name,
    ),
  };
}

function clampLimit(limit?: number): number {
  if (!limit || Number.isNaN(limit) || limit < 1) return DEFAULT_LIMIT;
  return Math.min(limit, MAX_LIMIT);
}
