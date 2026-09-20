import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool, types } from 'pg';
import { AppLoggerService } from '../logging/app-logger.service';
import type { Database } from './schema';

// int8 (OID 20) → JS number so Kysely callers don't deal with bigint strings.
types.setTypeParser(20, (value) => (value === null ? null : Number(value)));

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool;
  readonly db: Kysely<Database>;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(DatabaseService.name);
    const connectionString = this.config.getOrThrow<string>('databaseUrl');
    this.pool = new Pool({ connectionString });
    // Idle client errors must not crash the process; health/ping report unavailability.
    this.pool.on('error', (error) => {
      this.logger.error(
        `Unexpected Postgres pool error: ${error.message}`,
        { err: error },
        `DatabaseService.constructor`,
      );
    });
    this.db = new Kysely<Database>({
      dialect: new PostgresDialect({ pool: this.pool }),
    });
  }

  async onModuleInit(): Promise<void> {
    await sql`select 1`.execute(this.db);
  }

  async onModuleDestroy(): Promise<void> {
    await this.db.destroy();
  }

  async ping(): Promise<boolean> {
    try {
      await sql`select 1`.execute(this.db);
      return true;
    } catch {
      return false;
    }
  }
}
