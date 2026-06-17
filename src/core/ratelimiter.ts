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

  async take(signal?: AbortSignal): Promise<void> {
    this.refill();
    const wait = this.waitMs();
    if (wait > 0) {
      await delay(wait, signal);
      this.refill();
    }
    this.tokens -= 1;
  }
}

/** Requests-per-second limits. Either field may be omitted to disable that tier. */
export interface RateLimitOptions {
  /** Global cap across all chats, in requests/second. */
  global?: number;
  /** Per-chat cap, in requests/second. */
  perChat?: number;
}

/**
 * Combines a global token bucket with per-chat buckets. `acquire()` awaits the
 * global bucket (when configured) and, when a `chatId` is present and `perChat`
 * is set, the bucket for that chat (created on first use, keyed by string id).
 */
export class RateLimiter {
  private readonly global?: TokenBucket;
  private readonly perChatRate?: number;
  private readonly now?: () => number;
  private readonly chats = new Map<string, TokenBucket>();

  constructor(opts: RateLimitOptions & { now?: () => number }) {
    this.now = opts.now;
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
      if (!bucket) {
        bucket = new TokenBucket(this.perChatRate, this.now ? { now: this.now } : {});
        this.chats.set(key, bucket);
      }
      await bucket.take(signal);
    }
  }
}
