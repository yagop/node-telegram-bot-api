/**
 * `SqliteSessionStorage` - a durable `SessionStore` backed by `bun:sqlite`
 * (`./bun`, the Bun-only subpath). Zero-config and synchronous: one row per key
 * (`key`, `value`, `created_at`, `updated_at`) in a single table,
 * upserted on write, holding the encoded envelope string. Ideal for a
 * single-process Bun bot that wants restart-durable sessions without a separate
 * service.
 *
 * The two timestamp columns are ISO-8601 UTC strings (lexicographically
 * ordered, so plain `<`/`>` comparisons work): `created_at` is set on insert and
 * never touched again, `updated_at` on every write. They exist for operational
 * queries the session API cannot answer - "delete sessions idle for 90 days",
 * "how many chats did we see this week" - alongside the same two fields inside
 * the envelope, which is what handlers read.
 *
 * Processes sharing one database file are last-writer-wins per key (within one
 * process the middleware's per-key lock serializes updates).
 *
 * Bun-only: `bun:sqlite` does not exist on Node, so this module lives behind the
 * `./bun` export and is never reached from `.` / `./node` (a CI guard enforces
 * it), leaving Node/edge installs untouched.
 */

import { Database, type Statement } from "bun:sqlite";
import type { SessionStore } from "../core/session.js";

export type SqliteSessionStorageOptions = {
  /** An open `Database`, or a file path / `":memory:"` to open. Default `":memory:"`. */
  database?: Database | string;
  /** Table name (identifier-validated). Default `"sessions"`. */
  table?: string;
};

export class SqliteSessionStorage implements SessionStore {
  private readonly db: Database;
  private readonly table: string;
  /** True when this store opened the database itself, so `close()` may close it. */
  private readonly owned: boolean;
  /** Set once `close()` closed a database this store owned - the store is then spent. */
  private closed = false;
  private readonly getStmt: Statement;
  private readonly insertStmt: Statement;
  private readonly delStmt: Statement;

  constructor(options: SqliteSessionStorageOptions = {}) {
    const table = options.table ?? "sessions";
    // The table name is interpolated (identifiers can't be bound), so restrict
    // it to a safe charset - values still go through bound parameters.
    if (!/^[A-Za-z0-9_]+$/.test(table)) {
      throw new Error(`SqliteSessionStorage: invalid table name ${JSON.stringify(table)}`);
    }
    this.table = table;
    this.owned = typeof options.database !== "object";
    this.db = typeof options.database === "object" ? options.database : new Database(options.database ?? ":memory:");
    this.db.run(
      `CREATE TABLE IF NOT EXISTS "${table}" (
         key TEXT PRIMARY KEY,
         value TEXT NOT NULL,
         created_at TEXT NOT NULL,
         updated_at TEXT NOT NULL
       )`,
    );
    this.getStmt = this.db.query(`SELECT value FROM "${table}" WHERE key = ?`);
    this.insertStmt = this.db.query(
      `INSERT INTO "${table}" (key, value, created_at, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    );
    this.delStmt = this.db.query(`DELETE FROM "${table}" WHERE key = ?`);
  }

  private assertUsable(): void {
    if (this.closed) {
      throw new Error("SqliteSessionStorage: this store was closed; construct a new one");
    }
  }

  read(key: string): string | undefined {
    this.assertUsable();
    const row = this.getStmt.get(key) as { value: unknown } | null;
    if (row === null) return undefined;
    // `CREATE TABLE IF NOT EXISTS` adopts a pre-existing table of that name, so
    // the column may not hold the TEXT we assume (SQLite stores whatever a
    // foreign writer bound). Say so here rather than letting a non-string reach
    // the codec and fail as a baffling JSON.parse error.
    if (typeof row.value !== "string") {
      throw new TypeError(`SqliteSessionStorage: ${this.table}.value must be TEXT, got ${typeof row.value}`);
    }
    return row.value;
  }

  write(key: string, value: string): void {
    this.assertUsable();
    const at = new Date().toISOString();
    this.insertStmt.run(key, value, at, at);
  }

  delete(key: string): void {
    this.assertUsable();
    this.delStmt.run(key);
  }

  /**
   * Close the database, but only if this store opened it (a passed-in handle is
   * the caller's). Closing ends this store's life - its prepared statements go
   * with the handle - so a later use throws and you construct a new store
   * instead. With a caller-supplied handle this is a no-op.
   */
  close(): void {
    if (this.owned) {
      this.closed = true;
      this.db.close();
    }
  }
}
