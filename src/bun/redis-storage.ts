/**
 * `RedisSessionStorage` - a durable, cross-instance `SessionStore` backed by
 * Bun's built-in Redis client (`./bun`, the Bun-only subpath). Stores the
 * encoded envelope string under a key prefix; an optional TTL expires idle
 * sessions. Suitable for horizontally-scaled Bun deployments (webhooks behind a
 * load balancer) where the session must be shared across processes.
 *
 * Writes from two instances for the same key are last-writer-wins (within one
 * process the middleware's per-key lock serializes them).
 *
 * Bun-only: `redis` / `RedisClient` come from the `bun` module, absent on Node,
 * so this module lives behind the `./bun` export and is never reached from `.` /
 * `./node` (a CI guard enforces it).
 */

import { RedisClient, redis } from "bun";
import type { SessionStore, SessionWriteOptions } from "../core/session.js";

export type RedisSessionStorageOptions = {
  /** Bun `RedisClient` to use. Defaults to Bun's shared `redis` (REDIS_URL / VALKEY_URL). */
  client?: RedisClient;
  /** Connect a client the store owns (and closes on teardown) to this URL, instead of the shared `redis`. Ignored when `client` is given. */
  url?: string;
  /** Prefix prepended to every key. Default `"session:"`. */
  prefix?: string;
  /**
   * Default expiry in seconds applied on every write; omit to persist
   * indefinitely. The middleware's own `ttlSeconds` option, when set, wins.
   */
  ttlSeconds?: number;
};

export class RedisSessionStorage implements SessionStore {
  private readonly client: RedisClient;
  /** True when this store opened the client itself, so `close()` may close it. */
  private readonly owned: boolean;
  /** Set once `close()` closed a client this store owned - the store is then spent. */
  private closed = false;
  private readonly prefix: string;
  private readonly ttlSeconds?: number;

  constructor(options: RedisSessionStorageOptions = {}) {
    this.owned = options.client === undefined && options.url !== undefined;
    this.client = options.client ?? (options.url !== undefined ? new RedisClient(options.url) : redis);
    this.prefix = options.prefix ?? "session:";
    this.ttlSeconds = options.ttlSeconds;
  }

  /**
   * Close the client, but only if this store opened it (a passed-in `client` and
   * the shared `redis` are the caller's / runtime's). Closing ends this store's
   * life - a later use throws and you construct a new one. With a shared or
   * caller-supplied client this is a no-op.
   */
  close(): void {
    if (this.owned && !this.closed) {
      this.closed = true;
      this.client.close();
    }
  }

  async read(key: string): Promise<string | undefined> {
    return (await this.client.get(this.prefix + key)) ?? undefined;
  }

  async write(key: string, value: string, options?: SessionWriteOptions): Promise<void> {
    const k = this.prefix + key;
    await this.client.set(k, value);
    const ttl = options?.ttlSeconds ?? this.ttlSeconds;
    if (ttl !== undefined) {
      await this.client.expire(k, ttl);
    }
  }

  /**
   * Refresh a key's expiry without rewriting it - what the middleware calls when
   * an update changed nothing, so an active chat is not evicted mid-conversation.
   */
  async touch(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(this.prefix + key, ttlSeconds);
  }

  async delete(key: string): Promise<void> {
    await this.client.del(this.prefix + key);
  }
}
