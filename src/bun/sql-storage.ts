/**
 * `SqlSessionStorage` - a durable, cross-instance `SessionStore` backed by Bun's
 * built-in SQL client (`./bun`, the Bun-only subpath). One row per key in a
 * single table, upserted on write; values are JSON strings. Suited to a
 * horizontally-scaled Bun deployment already using Postgres.
 *
 * Targets Postgres semantics (the `ON CONFLICT ... DO UPDATE` upsert), which is
 * Bun SQL's primary adapter. The table is created lazily on first use.
 *
 * `key` and `value` are bound parameters via safe `sql`...`` templates - never
 * string-interpolated. Only the table name is interpolated, because Bun (like
 * Postgres) can't bind an identifier and offers no identifier-escaping helper;
 * it goes through a narrowly-scoped `sql.unsafe` fragment and is validated to a
 * safe charset in the constructor, so it can't carry an injection.
 *
 * Bun-only: `SQL` / `sql` come from the `bun` module, absent on Node, so this
 * module lives behind the `./bun` export and is never reached from `.` /
 * `./node` (a CI guard enforces it).
 */

import { SQL, sql as bunSql } from "bun";
import type { SessionStore } from "../core/session.js";

export type SqlSessionStorageOptions = {
  /** A Bun `SQL` client to use. Defaults to Bun's shared `sql` (env-configured), unless `url` is given. */
  sql?: SQL;
  /** Connection string to open a new `SQL` client when `sql` is not supplied. */
  url?: string;
  /** Table name (identifier-validated). Default `"sessions"`. */
  table?: string;
};

export class SqlSessionStorage implements SessionStore {
  private readonly sql: SQL;
  private readonly table: string;
  private ensured?: Promise<void>;

  constructor(options: SqlSessionStorageOptions = {}) {
    const table = options.table ?? "sessions";
    // The table name is interpolated (identifiers can't be bound), so restrict
    // it to a safe charset - keys and values still go through bound parameters.
    if (!/^[A-Za-z0-9_]+$/.test(table)) {
      throw new Error(`SqlSessionStorage: invalid table name ${JSON.stringify(table)}`);
    }
    this.table = table;
    this.sql = options.sql ?? (options.url !== undefined ? new SQL(options.url) : bunSql);
  }

  /** The validated table name as a raw SQL fragment (identifiers can't be bound). */
  private get ref() {
    return this.sql.unsafe(this.table);
  }

  /**
   * Create the table once, lazily (the constructor can't await). Idempotent and
   * memoized; on failure the cache is cleared so a later call retries instead of
   * re-throwing a stale (possibly transient) rejection. `session()` calls this
   * before the first query; `await store.init()` at boot to fail fast if the
   * database is unreachable.
   */
  init(): Promise<void> {
    if (this.ensured === undefined) {
      this.ensured = (async () => {
        await this.sql`CREATE TABLE IF NOT EXISTS ${this.ref} (key TEXT PRIMARY KEY, value TEXT NOT NULL)`;
      })().catch((err: unknown) => {
        this.ensured = undefined;
        throw err;
      });
    }
    return this.ensured;
  }

  async read<V>(key: string): Promise<V | undefined> {
    await this.init();
    const rows = (await this.sql`SELECT value FROM ${this.ref} WHERE key = ${key}`) as Array<{ value: string }>;
    const row = rows[0];
    return row ? (JSON.parse(row.value) as V) : undefined;
  }

  async write(key: string, value: unknown): Promise<void> {
    await this.init();
    await this.sql`INSERT INTO ${this.ref} (key, value) VALUES (${key}, ${JSON.stringify(value)})
      ON CONFLICT (key) DO UPDATE SET value = excluded.value`;
  }

  async delete(key: string): Promise<void> {
    await this.init();
    await this.sql`DELETE FROM ${this.ref} WHERE key = ${key}`;
  }
}
