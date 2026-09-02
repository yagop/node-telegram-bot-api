/**
 * `MemorySessionStorage` - the process-local `SessionStore` (core, so edge-safe:
 * zero `node:*`, a plain `Map`).
 *
 * Not durable and not shared: state is lost on restart and never leaves the
 * process, so it is for long-polling / single-process bots, never serverless.
 * It holds the same encoded strings a durable store would - encoding lives in
 * the session middleware's codec, not here - so switching to a durable backend
 * changes nothing about what round-trips. Optional per-write TTL, expired
 * lazily on read.
 *
 * The durable stores live outside core, where their runtime is allowed:
 * `FileSessionStorage` (`./node`), `SqliteSessionStorage` / `SqlSessionStorage`
 * / `RedisSessionStorage` (`./bun`).
 */

import type { SessionStore, SessionWriteOptions } from "./session.js";

export class MemorySessionStorage implements SessionStore {
  private readonly map = new Map<string, { value: string; expiresAt?: number }>();

  read(key: string): string | undefined {
    const row = this.map.get(key);
    if (row === undefined) return undefined;
    if (row.expiresAt !== undefined && row.expiresAt <= Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    return row.value;
  }

  write(key: string, value: string, options?: SessionWriteOptions): void {
    this.map.set(key, {
      value,
      expiresAt: options?.ttlSeconds === undefined ? undefined : Date.now() + options.ttlSeconds * 1000,
    });
  }

  delete(key: string): void {
    this.map.delete(key);
  }
}
