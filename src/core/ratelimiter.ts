/**
 * Opt-in rate limiting (ADR-004 §10, M3) - proactive flood control.
 *
 * A classic token bucket plus a thin `RateLimiter` that combines a global
 * bucket with lazily-created per-chat buckets. Edge-safe: no `node:` imports,
 * no Node globals. Time comes from an injectable `now()` so the refill math is
 * deterministically testable; the wait itself is a single abortable timer whose
 * duration is computed from the token math.
 */

import { delay } from "./delay.js";

/**
 * A continuous-refill token bucket. Tokens regenerate at `ratePerSec`, capped at
 * `burst`. `take()` resolves immediately when a token is available, otherwise
 * waits exactly long enough for one to refill (abortable).
 */
export class TokenBucket {
  private readonly ratePerSec: number;
  private readonly burst: number;
  private readonly now: () => number;
  private tokens: number;
  private last: number;

  constructor(ratePerSec: number, opts: { burst?: number; now?: () => number } = {}) {
    this.ratePerSec = ratePerSec;
    this.burst = opts.burst ?? Math.max(1, Math.ceil(ratePerSec));
    this.now = opts.now ?? Date.now;
    this.tokens = this.burst;
    this.last = this.now();
  }

  /** Add the tokens accrued since the last refill, capped at `burst`. */
  private refill(): void {
    const t = this.now();
    const elapsedSec = (t - this.last) / 1000;
    if (elapsedSec > 0) {
      this.tokens = Math.min(this.burst, this.tokens + elapsedSec * this.ratePerSec);
      this.last = t;
    }
  }

  /** Milliseconds until at least one token is available. */
  private waitMs(): number {
    if (this.tokens >= 1) return 0;
    const missing = 1 - this.tokens;
    return Math.ceil((missing / this.ratePerSec) * 1000);
  }

  /**
   * Wait until a token is available, then consume one. The post-wait recheck
   * closes the concurrent-oversell race: two `take()`s that both see an empty
   * bucket compute the same wait, but on wake the first refills+decrements and
   * the second's recheck sees the empty bucket again and waits another cycle -
   * so the configured rate is never exceeded even under burst contention. The
   * decrement happens only once the wait is in the past, so an aborted take
   * consumes no token.
   */
  async take(signal?: AbortSignal): Promise<void> {
    for (;;) {
      this.refill();
      const wait = this.waitMs();
      if (wait <= 0) {
        this.tokens -= 1;
        return;
      }
      await delay(wait, signal); // throws on abort -> propagates without consuming a token
      // loop: refill and recheck (another take may have consumed the token first)
    }
  }
}

/** Requests-per-second limits. Either field may be omitted to disable that tier. */
export interface RateLimitOptions {
  /** Global cap across all chats, in requests/second. */
  global?: number;
  /** Per-chat cap, in requests/second. */
  perChat?: number;
  /**
   * Maximum number of per-chat buckets to keep. When exceeded, the
   * least-recently-used chat's bucket is evicted - bounds memory for long-lived
   * bots that talk to many distinct chats. Default 10 000.
   */
  maxChatBuckets?: number;
}

/**
 * Combines a global token bucket with per-chat buckets. `acquire()` awaits the
 * global bucket (when configured) and, when a `chatId` is present and `perChat`
 * is set, the bucket for that chat (created on first use, keyed by string id).
 * Per-chat buckets are cached as a bounded LRU: a chat that is accessed is moved
 * to most-recently-used, and once `maxChatBuckets` is reached the
 * least-recently-used chat's bucket is evicted, so the map cannot grow without
 * bound for long-lived bots that talk to many distinct chats.
 */
export class RateLimiter {
  private readonly global?: TokenBucket;
  private readonly perChatRate?: number;
  private readonly maxChatBuckets: number;
  private readonly now?: () => number;
  private readonly chats = new Map<string, TokenBucket>();

  constructor(opts: RateLimitOptions & { now?: () => number }) {
    this.now = opts.now;
    this.maxChatBuckets = opts.maxChatBuckets ?? 10_000;
    if (opts.global && opts.global > 0) {
      this.global = new TokenBucket(opts.global, opts.now ? { now: opts.now } : {});
    }
    if (opts.perChat && opts.perChat > 0) {
      this.perChatRate = opts.perChat;
    }
  }

  async acquire(chatId: string | number | undefined, signal?: AbortSignal): Promise<void> {
    if (this.global) await this.global.take(signal);
    if (this.perChatRate !== undefined && chatId !== undefined) {
      const key = String(chatId);
      let bucket = this.chats.get(key);
      if (bucket) {
        // LRU touch: Map preserves insertion order, so delete + re-set moves this
        // chat to the most-recently-used end. Without this a hot chat could be
        // evicted while cold chats lingered.
        this.chats.delete(key);
        this.chats.set(key, bucket);
      } else {
        if (this.chats.size >= this.maxChatBuckets) {
          // Evict the oldest (least-recently-used) bucket to bound memory.
          const oldest = this.chats.keys().next().value;
          if (oldest !== undefined) this.chats.delete(oldest);
        }
        bucket = new TokenBucket(this.perChatRate, this.now ? { now: this.now } : {});
        this.chats.set(key, bucket);
      }
      await bucket.take(signal);
    }
  }
}
