/**
 * `RedisSessionStorage` - a durable, cross-instance `SessionStore` backed by
 * Bun's built-in Redis client (`./bun`, the Bun-only subpath). Values are stored
 * as JSON strings under a key prefix; an optional TTL expires idle sessions.
 * Suitable for horizontally-scaled Bun deployments (webhooks behind a load
 * balancer) where the session must be shared across processes.
 *
 * Bun-only: `redis` / `RedisClient` come from the `bun` module, absent on Node,
 * so this module lives behind the `./bun` export and is never reached from `.` /
 * `./node` (a CI guard enforces it).
 */

import { redis, type RedisClient } from "bun";
import type { SessionStore } from "../core/session.js";

export type RedisSessionStorageOptions = {
  /** Bun `RedisClient` to use. Defaults to Bun's shared `redis` (REDIS_URL / VALKEY_URL). */
  client?: RedisClient;
  /** Prefix prepended to every key. Default `"session:"`. */
  prefix?: string;
  /** If set, each write (re)sets this expiry in seconds; omit to persist indefinitely. */
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

  async read<V>(key: string): Promise<V | undefined> {
    const raw = await this.client.get(this.prefix + key);
    return raw == null ? undefined : (JSON.parse(raw) as V);
  }

  async write(key: string, value: unknown): Promise<void> {
    const k = this.prefix + key;
    await this.client.set(k, JSON.stringify(value));
    if (this.ttlSeconds !== undefined) {
      await this.client.expire(k, this.ttlSeconds);
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.del(this.prefix + key);
  }
}
