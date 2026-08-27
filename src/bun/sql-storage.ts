/**
 * `SqlSessionStorage` - a durable, cross-instance `SessionStore` backed by Bun's
 * built-in SQL client (`./bun`, the Bun-only subpath). One row per key in a
 * single table, upserted on write; values are JSON strings. Suited to a
 * horizontally-scaled Bun deployment already using Postgres.
 *
 * Targets Postgres semantics (the `ON CONFLICT ... DO UPDATE` upsert and `$1`
 * positional binds), which is Bun SQL's primary adapter. The table is created
 * lazily on first use.
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

  /** Create the table once, lazily (the constructor can't await). Memoized. */
  private ready(): Promise<void> {
    return (this.ensured ??= (async () => {
      await this.sql.unsafe(`CREATE TABLE IF NOT EXISTS ${this.table} (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
    })());
  }

  async read<V>(key: string): Promise<V | undefined> {
    await this.ready();
    const rows = await this.sql.unsafe<Array<{ value: string }>>(
      `SELECT value FROM ${this.table} WHERE key = $1`,
      [key],
    );
    const row = rows[0];
    return row ? (JSON.parse(row.value) as V) : undefined;
  }

  async write(key: string, value: unknown): Promise<void> {
    await this.ready();
    await this.sql.unsafe(
      `INSERT INTO ${this.table} (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
      [key, JSON.stringify(value)],
    );
  }

  async delete(key: string): Promise<void> {
    await this.ready();
    await this.sql.unsafe(`DELETE FROM ${this.table} WHERE key = $1`, [key]);
  }
}
