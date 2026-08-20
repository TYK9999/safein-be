import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Kysely } from 'kysely';

import { DATABASE } from './database.provider';
import { Database } from './database.types';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  constructor(
    @Inject(DATABASE)
    private readonly db: Kysely<Database>,
  ) {}

  async onModuleDestroy() {
    await this.db.destroy();
  }
}
