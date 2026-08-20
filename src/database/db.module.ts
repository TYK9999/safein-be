import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { Kysely } from 'kysely';

import type { DB } from './schema';
import { APP_DB, appDbProvider } from './db.provider';

@Global()
@Module({
  providers: [appDbProvider],
  exports: [appDbProvider],
})
export class DbModule implements OnModuleDestroy {
  constructor(@Inject(APP_DB) private readonly db: Kysely<DB>) {}

  async onModuleDestroy(): Promise<void> {
    await this.db.destroy();
  }
}
