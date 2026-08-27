/**
 * `SqliteSessionStorage` - a durable `SessionStore` backed by `bun:sqlite`
 * (`./bun`, the Bun-only subpath). Zero-config and synchronous: one row per key
 * in a single table, upserted on write. Ideal for a single-process Bun bot that
 * wants restart-durable sessions without a separate service.
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
  private readonly getStmt: Statement;
  private readonly setStmt: Statement;
  private readonly delStmt: Statement;

  constructor(options: SqliteSessionStorageOptions = {}) {
    const table = options.table ?? "sessions";
    // The table name is interpolated (identifiers can't be bound), so restrict
    // it to a safe charset - values still go through bound parameters.
    if (!/^[A-Za-z0-9_]+$/.test(table)) {
      throw new Error(`SqliteSessionStorage: invalid table name ${JSON.stringify(table)}`);
    }
    this.db = typeof options.database === "object" ? options.database : new Database(options.database ?? ":memory:");
    this.db.run(`CREATE TABLE IF NOT EXISTS "${table}" (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
    this.getStmt = this.db.query(`SELECT value FROM "${table}" WHERE key = ?`);
    this.setStmt = this.db.query(
      `INSERT INTO "${table}" (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    );
    this.delStmt = this.db.query(`DELETE FROM "${table}" WHERE key = ?`);
  }

  read<V>(key: string): V | undefined {
    const row = this.getStmt.get(key) as { value: string } | null;
    return row ? (JSON.parse(row.value) as V) : undefined;
  }

  write(key: string, value: unknown): void {
    this.setStmt.run(key, JSON.stringify(value));
  }

  delete(key: string): void {
    this.delStmt.run(key);
  }
}
