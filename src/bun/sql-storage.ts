/**
 * `SqlSessionStorage` - a durable, cross-instance `SessionStore` backed by Bun's
 * built-in SQL client (`./bun`, the Bun-only subpath). One row per key in a
 * single table (`key`, `value`, `created_at`, `updated_at`), upserted on
 * write; the value is the encoded envelope string the middleware hands over.
 * Suited to a horizontally-scaled Bun deployment already using Postgres.
 *
 * The timestamp columns are ISO-8601 UTC text (lexicographically ordered, and
 * portable across Bun SQL's Postgres and SQLite adapters - a real `TIMESTAMPTZ`
 * is not): `created_at` set on insert and never touched again, `updated_at` on
 * every write. They exist for operational queries the session API cannot answer
 * ("delete sessions idle for 90 days"), alongside the same two fields inside the
 * envelope, which is what handlers read.
 *
 * Writes from two instances for the same key are last-writer-wins (within one
 * process the middleware's per-key lock serializes them).
 *
 * Targets Postgres semantics (the `ON CONFLICT ... DO UPDATE` upsert), which is
 * Bun SQL's primary adapter; its SQLite adapter supports it too.
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
  /** True when this store opened the client itself, so `close()` may close it. */
  private readonly owned: boolean;
  /** Set once `close()` closed a client this store owned - the store is then spent. */
  private closed = false;
  private ensured?: Promise<void>;

  constructor(options: SqlSessionStorageOptions = {}) {
    const table = options.table ?? "sessions";
    // The table name is interpolated (identifiers can't be bound), so restrict
    // it to a safe charset - keys and values still go through bound parameters.
    if (!/^[A-Za-z0-9_]+$/.test(table)) {
      throw new Error(`SqlSessionStorage: invalid table name ${JSON.stringify(table)}`);
    }
    this.table = table;
    this.owned = options.sql === undefined && options.url !== undefined;
    this.sql = options.sql ?? (options.url !== undefined ? new SQL(options.url) : bunSql);
  }

  /** The validated table name as a raw SQL fragment (identifiers can't be bound). */
  private get ref() {
    return this.sql.unsafe(this.table);
  }

  /**
   * Create the table once, lazily (the constructor can't await). Idempotent and
   * memoized; on failure the cache is cleared so a later call retries instead of
   * re-throwing a stale (possibly transient) rejection. `bot.init()` runs it at
   * startup, so an unreachable database fails at boot.
   */
  init(): Promise<void> {
    if (this.closed) {
      return Promise.reject(new Error("SqlSessionStorage: this store was closed; construct a new one"));
    }
    if (this.ensured === undefined) {
      this.ensured = (async () => {
        await this.sql`CREATE TABLE IF NOT EXISTS ${this.ref} (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )`;
      })().catch((err: unknown) => {
        this.ensured = undefined;
        throw err;
      });
    }
    return this.ensured;
  }

  /**
   * Close the client, but only if this store opened it (a passed-in `sql` is the
   * caller's). Closing ends this store's life - the client cannot be reopened,
   * so a later use throws and you construct a new store instead. With a
   * caller-supplied client the store stays usable: only the table-setup memo is
   * dropped, so a later `init()` re-checks the schema.
   */
  async close(): Promise<void> {
    this.ensured = undefined;
    if (this.owned) {
      this.closed = true;
      await this.sql.close();
    }
  }

  async read(key: string): Promise<string | undefined> {
    await this.init();
    const [row] = (await this.sql`SELECT value FROM ${this.ref} WHERE key = ${key}`) as Array<{ value: unknown }>;
    if (row === undefined) return undefined;
    // `CREATE TABLE IF NOT EXISTS` adopts a pre-existing table of that name, so
    // the column may not be the TEXT we assume - a JSON/JSONB one comes back
    // already parsed. Say so here rather than letting a non-string reach the
    // codec and fail as a baffling JSON.parse error.
    if (typeof row.value !== "string") {
      throw new TypeError(`SqlSessionStorage: ${this.table}.value must be TEXT, got ${typeof row.value}`);
    }
    return row.value;
  }

  async write(key: string, value: string): Promise<void> {
    await this.init();
    const at = new Date().toISOString();
    await this.sql`INSERT INTO ${this.ref} (key, value, created_at, updated_at)
      VALUES (${key}, ${value}, ${at}, ${at})
      ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`;
  }

  async delete(key: string): Promise<void> {
    await this.init();
    await this.sql`DELETE FROM ${this.ref} WHERE key = ${key}`;
  }
}
