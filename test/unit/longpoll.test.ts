import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Api } from "../../src/core/api.js";
import { NetworkError, TelegramApiError } from "../../src/core/errors.js";
import { longPoll } from "../../src/core/longpoll.js";
import type { Update } from "../../src/types/index.js";

/** A minimal `Update` carrying just `update_id` for assertions. */
function upd(id: number): Update {
  return { update_id: id, message: {} } as unknown as Update;
}

/** Build a fake `Api` whose `getUpdates` runs the given step functions in order. */
function fakeApi(steps: Array<(params: { offset?: number }) => Update[] | Promise<Update[]>>): {
  api: Api;
  offsets: Array<number | undefined>;
} {
  const offsets: Array<number | undefined> = [];
  let i = 0;
  const api = {
    getUpdates: async (params: { offset?: number }) => {
      offsets.push(params.offset);
      const step = steps[Math.min(i, steps.length - 1)]!;
      i += 1;
      return step(params);
    },
  } as unknown as Api;
  return { api, offsets };
}

describe("longPoll", () => {
  test("yields one update then returns cleanly on abort", async () => {
    const controller = new AbortController();
    const { api } = fakeApi([
      () => [upd(100)],
      () => {
        controller.abort();
        return [];
      },
    ]);

    const seen: number[] = [];
    for await (const update of longPoll(api, {}, controller.signal)) {
      seen.push(update.update_id);
    }
    assert.deepStrictEqual(seen, [100]);
  });

  test("resumes after a transient NetworkError without advancing offset", async () => {
    const controller = new AbortController();
    const { api, offsets } = fakeApi([
      () => [upd(5)], // success: yields 5, offset advances to 6
      () => {
        throw new NetworkError("connection reset"); // transient: retry, no advance
      },
      () => {
        controller.abort();
        return [upd(6)]; // resume at the same offset, yields 6
      },
    ]);

    const seen: number[] = [];
    for await (const update of longPoll(
      api,
      { retryDelayMs: 1 }, // short retry so the test doesn't wait the 1s default
      controller.signal,
    )) {
      seen.push(update.update_id);
    }

    assert.deepStrictEqual(seen, [5, 6]);
    // Offsets per call: 1st undefined, 2nd 6 (after yielding 5), 3rd 6 (no advance across failure).
    assert.deepStrictEqual(offsets, [undefined, 6, 6]);
  });

  test("resumes after a 429 without advancing offset (a flood never kills the loop)", async () => {
    const controller = new AbortController();
    const { api, offsets } = fakeApi([
      () => [upd(5)], // success: yields 5, offset advances to 6
      () => {
        // 429 with retry_after 0 -> honored (waits ~0ms) and retried, not fatal.
        throw new TelegramApiError(429, "Too Many Requests", { retry_after: 0 });
      },
      () => {
        controller.abort();
        return [upd(6)]; // resume at the same offset, yields 6
      },
    ]);

    const seen: number[] = [];
    for await (const update of longPoll(api, {}, controller.signal)) {
      seen.push(update.update_id);
    }

    assert.deepStrictEqual(seen, [5, 6]);
    // Offset is NOT advanced across the 429 (same as a transient error).
    assert.deepStrictEqual(offsets, [undefined, 6, 6]);
  });

  test("rethrows a fatal TelegramApiError(401)", async () => {
    const { api } = fakeApi([
      () => {
        throw new TelegramApiError(401, "Unauthorized");
      },
    ]);

    let caught: unknown;
    try {
      for await (const _ of longPoll(api, { retryDelayMs: 1 })) {
        // no-op
      }
    } catch (err) {
      caught = err;
    }
    assert.ok(caught instanceof TelegramApiError);
    assert.strictEqual((caught as TelegramApiError).errorCode, 401);
  });

  test("rethrows transient error when retry is disabled", async () => {
    const { api } = fakeApi([
      () => {
        throw new NetworkError("connection reset");
      },
    ]);

    let caught: unknown;
    try {
      for await (const _ of longPoll(api, { retry: false })) {
        // no-op
      }
    } catch (err) {
      caught = err;
    }
    assert.ok(caught instanceof NetworkError);
  });

  test("resumes after a 409 conflict without advancing offset, then yields", async () => {
    const controller = new AbortController();
    const { api, offsets } = fakeApi([
      () => {
        throw new TelegramApiError(409, "Conflict: terminated by other getUpdates request");
      },
      () => [upd(100)],
      () => {
        controller.abort();
        return [];
      },
    ]);

    const seen: number[] = [];
    for await (const update of longPoll(api, { conflictRetryDelayMs: 1 }, controller.signal)) {
      seen.push(update.update_id);
    }
    assert.deepStrictEqual(seen, [100]);
    // Poll 1 (409) and poll 2 both use the same (undefined) offset - no advance on conflict.
    assert.deepStrictEqual(offsets.slice(0, 2), [undefined, undefined]);
  });

  test("throws after maxConflictRetries consecutive 409s", async () => {
    const onError: unknown[] = [];
    const { api } = fakeApi([
      () => {
        throw new TelegramApiError(409, "Conflict");
      },
    ]);

    let caught: unknown;
    try {
      for await (const _ of longPoll(api, {
        conflictRetryDelayMs: 1,
        maxConflictRetries: 3,
        onError: (e) => onError.push(e),
      })) {
        // no-op
      }
    } catch (err) {
      caught = err;
    }
    assert.ok(caught instanceof TelegramApiError);
    assert.strictEqual((caught as TelegramApiError).errorCode, 409);
    // 3 conflicts were observed and waited on; the 4th throws without an onError call.
    assert.strictEqual(onError.length, 3);
  });

  test("a 409 conflict is fatal when retry is disabled", async () => {
    const { api } = fakeApi([
      () => {
        throw new TelegramApiError(409, "Conflict");
      },
    ]);

    let caught: unknown;
    try {
      for await (const _ of longPoll(api, { retry: false })) {
        // no-op
      }
    } catch (err) {
      caught = err;
    }
    assert.ok(caught instanceof TelegramApiError);
    assert.strictEqual((caught as TelegramApiError).errorCode, 409);
  });

  test("a successful (empty) poll resets the consecutive-conflict counter", async () => {
    const controller = new AbortController();
    // With maxConflictRetries:2, three conflicts *in a row* would throw. Here an
    // empty successful poll sits between two bursts, so the streak resets and the
    // loop keeps going instead of throwing on the fourth conflict overall.
    const { api } = fakeApi([
      () => {
        throw new TelegramApiError(409, "Conflict"); // burst 1: conflict 1
      },
      () => {
        throw new TelegramApiError(409, "Conflict"); // burst 1: conflict 2
      },
      () => [], // success -> resets the counter
      () => {
        throw new TelegramApiError(409, "Conflict"); // burst 2: conflict 1 (would be #3 without the reset)
      },
      () => {
        controller.abort(); // stop cleanly on the next poll
        return [upd(200)];
      },
    ]);

    const seen: number[] = [];
    let caught: unknown;
    try {
      for await (const update of longPoll(
        api,
        { conflictRetryDelayMs: 1, maxConflictRetries: 2 },
        controller.signal,
      )) {
        seen.push(update.update_id);
      }
    } catch (err) {
      caught = err;
    }
    // Never threw (the reset kept burst 2 under the bound) and reached the yield.
    assert.strictEqual(caught, undefined);
    assert.deepStrictEqual(seen, [200]);
  });

  test("a non-conflict transient error between 409s breaks the consecutive-conflict streak", async () => {
    const controller = new AbortController();
    // maxConflictRetries:1 -> two conflicts in a row would throw. A 5xx transient
    // sits between them, so the streak resets and the second 409 stays in bounds.
    const { api } = fakeApi([
      () => {
        throw new TelegramApiError(409, "Conflict"); // conflict 1
      },
      () => {
        throw new TelegramApiError(500, "Internal Server Error"); // transient -> resets streak
      },
      () => {
        throw new TelegramApiError(409, "Conflict"); // conflict 1 again (would be #2 without the reset)
      },
      () => {
        controller.abort();
        return [upd(300)];
      },
    ]);

    const seen: number[] = [];
    let caught: unknown;
    try {
      for await (const update of longPoll(
        api,
        { conflictRetryDelayMs: 1, retryDelayMs: 1, maxConflictRetries: 1 },
        controller.signal,
      )) {
        seen.push(update.update_id);
      }
    } catch (err) {
      caught = err;
    }
    assert.strictEqual(caught, undefined);
    assert.deepStrictEqual(seen, [300]);
  });
});
