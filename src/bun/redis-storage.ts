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

import { redis, type RedisClient } from "bun";
import type { SessionStore, SessionWriteOptions } from "../core/session.js";

export type RedisSessionStorageOptions = {
  /** Bun `RedisClient` to use. Defaults to Bun's shared `redis` (REDIS_URL / VALKEY_URL). */
  client?: RedisClient;
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
  private readonly prefix: string;
  private readonly ttlSeconds?: number;

  constructor(options: RedisSessionStorageOptions = {}) {
    this.client = options.client ?? redis;
    this.prefix = options.prefix ?? "session:";
    this.ttlSeconds = options.ttlSeconds;
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

  async delete(key: string): Promise<void> {
    await this.client.del(this.prefix + key);
  }
}
