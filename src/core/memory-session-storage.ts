/**
 * `MemorySessionStorage` - the process-local `SessionStore` (core, so edge-safe:
 * zero `node:*`, a plain `Map`).
 *
 * Not durable and not shared: state is lost on restart and never leaves the
 * process, so it is for long-polling / single-process bots, never serverless.
 * It holds the same encoded strings a durable store would - encoding lives in
 * the session middleware's codec, not here - so switching to a durable backend
 * changes nothing about what round-trips. Optional per-write TTL: expired rows
 * are dropped on read, and a write also sweeps the whole map, so a key that is
 * written once and never read again cannot pin memory forever.
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
    if (options?.ttlSeconds === undefined) {
      this.map.set(key, { value });
      return;
    }
    const nowMs = Date.now();
    // Reading a key is what normally evicts it, and an abandoned chat is never
    // read again - so sweep here, where the cost is bounded by how often a TTL
    // bot writes at all.
    for (const [k, row] of this.map) {
      if (row.expiresAt !== undefined && row.expiresAt <= nowMs) this.map.delete(k);
    }
    this.map.set(key, { value, expiresAt: nowMs + options.ttlSeconds * 1000 });
  }

  /** Refresh an existing key's expiry without rewriting its value. */
  touch(key: string, ttlSeconds: number): void {
    const row = this.map.get(key);
    if (row === undefined) return;
    row.expiresAt = Date.now() + ttlSeconds * 1000;
  }

  delete(key: string): void {
    this.map.delete(key);
  }
}
