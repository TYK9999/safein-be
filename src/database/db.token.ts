/**
 * The DI token for the application's Kysely handle, kept in its own tiny module
 * with NO kysely/pg import. Consumers that only need the token — and use
 * Kysely<DB> merely as a *type* — can inject it via `import type` without pulling
 * the ESM-only kysely runtime into their module graph, which would otherwise
 * break ts-jest's CommonJS test loader. The provider lives in db.provider.ts.
 */
export const APP_DB = Symbol('APP_DB');
