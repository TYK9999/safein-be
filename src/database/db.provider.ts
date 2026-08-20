import { Signer } from '@aws-sdk/rds-signer';
import { ConfigService } from '@nestjs/config';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool, types } from 'pg';

import { APP_DB } from './db.token';
import type { DB } from './schema';

// Re-exported so existing `import { APP_DB } from './db.provider'` sites keep
// working; the token itself now lives in the kysely-free db.token module.
export { APP_DB } from './db.token';

// node-pg returns bigint (int8, OID 20) as a string to avoid precision loss.
// Our int8 columns are byte counts (well within 2^53), so parse them to JS
// numbers for ergonomic use. Ids are int4 and unaffected.
types.setTypeParser(20, (value) => (value === null ? null : Number(value)));

export const appDbProvider = {
  provide: APP_DB,
  inject: [ConfigService],
  useFactory: (config: ConfigService): Kysely<DB> => {
    const connectionString = config.get<string>('database.url');
    if (!connectionString) throw new Error('DATABASE_URL is not configured.');

    const iamAuth = config.get<boolean>('database.iamAuth') === true;

    // RDS requires TLS. IAM auth mandates it; otherwise it's opt-in via DATABASE_SSL.
    // rejectUnauthorized:false encrypts without CA verification (fine inside a VPC);
    // supply the RDS CA bundle for strict verification.
    const ssl =
      iamAuth || config.get<boolean>('database.ssl')
        ? { rejectUnauthorized: false }
        : undefined;

    // With IAM auth, the password is a short-lived (~15-min) RDS auth token minted
    // PER CONNECTION from the instance's IAM role (rds-db:connect) — nothing is
    // stored, and it overrides any password in DATABASE_URL. Otherwise pg uses the
    // password from the connection string.
    const password = iamAuth
      ? rdsTokenProvider(
          connectionString,
          config.getOrThrow<string>('aws.region'),
        )
      : undefined;

    return new Kysely<DB>({
      dialect: new PostgresDialect({
        pool: new Pool({
          connectionString,
          ...(password ? { password } : {}),
          ssl,
          max: 10,
          idleTimeoutMillis: 30_000,
          connectionTimeoutMillis: 5_000,
        }),
      }),
    });
  },
};

/**
 * Returns a function pg invokes on every new pooled connection to fetch a fresh
 * RDS IAM auth token to use as the password. The token is signed with the default
 * AWS credential chain (the EC2 instance role on the box). Host/port/user are read
 * from DATABASE_URL; the token replaces the (typically absent) URL password.
 */
function rdsTokenProvider(
  connectionString: string,
  region: string,
): () => Promise<string> {
  const url = new URL(connectionString);
  const signer = new Signer({
    hostname: url.hostname,
    port: Number(url.port) || 5432,
    username: decodeURIComponent(url.username),
    region,
  });
  return () => signer.getAuthToken();
}
