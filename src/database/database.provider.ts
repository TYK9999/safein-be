import { ConfigService } from '@nestjs/config';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

export const DATABASE = Symbol('DATABASE');

export const databaseProvider = {
  provide: DATABASE,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    return new Kysely({
      dialect: new PostgresDialect({
        pool: new Pool({
          connectionString: config.get<string>('database.url'),
        }),
      }),
    });
  },
};
