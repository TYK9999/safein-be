import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { KYSELY } from './database.tokens';

@Global()
@Module({
  providers: [
    DatabaseService,
    {
      provide: KYSELY,
      useFactory: (database: DatabaseService) => database.db,
      inject: [DatabaseService],
    },
  ],
  exports: [DatabaseService, KYSELY],
})
export class DatabaseModule {}
