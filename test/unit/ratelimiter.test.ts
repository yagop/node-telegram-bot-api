import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { RateLimiter, TokenBucket } from "../../src/core/ratelimiter.js";

/** A controllable clock for deterministic, wall-clock-independent tests. */
function fakeClock(start = 0): { now: () => number; advance: (ms: number) => void } {
  let t = start;
  return { now: () => t, advance: (ms: number) => void (t += ms) };
}

/** Has `p` settled by the next microtask? Proves a take is genuinely waiting. */
async function settledNextTick(p: Promise<unknown>): Promise<boolean> {
  let done = false;
  // Observe both outcomes so a later rejection is never "unhandled".
  void p.then(
    () => {
      done = true;
    },
    () => {
      done = true;
    },
  );
  await Promise.resolve();
  await Promise.resolve();
  return done;
}

describe("TokenBucket", () => {
  test("lets `burst` immediate takes through", async () => {
    const clock = fakeClock();
    const bucket = new TokenBucket(10, { burst: 3, now: clock.now });

    // The clock never advances, yet `burst` takes resolve immediately.
    await bucket.take();
    await bucket.take();
    await bucket.take();
    // All three resolved without any clock movement - assertion is reaching here.
    assert.strictEqual(true, true);
  });

  test("computes a positive wait once the burst is drained, satisfied by refill", async () => {
    const clock = fakeClock();
    // High rate => the computed real-timer wait is tiny (~1ms) and test stays fast.
    const bucket = new TokenBucket(1000, { burst: 1, now: clock.now });
    await bucket.take(); // drains the only token

    // Without advancing the clock the next take must wait (no token yet).
    const pending = bucket.take();
    assert.strictEqual(await settledNextTick(pending), false);

    // Advance so a token has accrued; the (short) timer fires and the take resolves.
    clock.advance(1000);
    await pending;
    assert.strictEqual(true, true);
  });
});

describe("RateLimiter", () => {
  test("awaits the global bucket", async () => {
    const clock = fakeClock();
    // burst defaults to ceil(1) === 1; a single immediate acquire drains it.
    const limiter = new RateLimiter({ global: 1, now: clock.now });
    await limiter.acquire(undefined); // drains the single global token

    // The next acquire is genuinely blocked on the global bucket. Abort its wait
    // to prove it was blocked (fast + deterministic; no real 1s timer).
    const controller = new AbortController();
    const pending = limiter.acquire(undefined, controller.signal);
    assert.strictEqual(await settledNextTick(pending), false);
    controller.abort(new Error("stop waiting"));
    let caught: unknown;
    try {
      await pending;
    } catch (err) {
      caught = err;
    }
    assert.strictEqual((caught as Error).message, "stop waiting");
  });

  test("awaits a per-chat bucket independently per chat", async () => {
    const clock = fakeClock();
    const limiter = new RateLimiter({ perChat: 1, now: clock.now });

    await limiter.acquire("A"); // chat A drains its single token (burst 1)
    await limiter.acquire("B"); // chat B has its own fresh bucket - immediate

    // Chat A again must wait, but B is unaffected: abort A's wait to prove it
    // was blocked (keeps the test fast and deterministic without a 1s timer).
    const controller = new AbortController();
    const pending = limiter.acquire("A", controller.signal);
    assert.strictEqual(await settledNextTick(pending), false);
    controller.abort(new Error("stop waiting"));
    let caught: unknown;
    try {
      await pending;
    } catch (err) {
      caught = err;
    }
    assert.strictEqual((caught as Error).message, "stop waiting");
  });
});
