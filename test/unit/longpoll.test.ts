import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Api } from "../../src/core/api.js";
import { NetworkError, TelegramApiError } from "../../src/core/errors.js";
import { longPoll } from "../../src/core/longpoll.js";
import type { GetUpdatesParams, Update } from "../../src/types/index.js";

/** A minimal `Update` carrying just `update_id` for assertions. */
function upd(id: number): Update {
  return { update_id: id, message: {} } as unknown as Update;
}

type Step = (params: GetUpdatesParams, signal?: AbortSignal) => Update[] | Promise<Update[]>;

/** Build a fake `Api` whose `getUpdates` runs the given step functions in order. */
function fakeApi(steps: Step[]): {
  api: Api;
  offsets: Array<number | undefined>;
} {
  const offsets: Array<number | undefined> = [];
  let i = 0;
  const api = {
    getUpdates: async (params: GetUpdatesParams, signal?: AbortSignal) => {
      offsets.push(params.offset);
      const step = steps[Math.min(i, steps.length - 1)]!;
      i += 1;
      return step(params, signal);
    },
  } as unknown as Api;
  return { api, offsets };
}

describe("longPoll", () => {
  test("yields one update then returns cleanly on abort", async () => {
    const controller = new AbortController();
    const { api, offsets } = fakeApi([
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
    // The second poll already carried offset 101, so nothing is left to confirm on stop.
    assert.deepStrictEqual(offsets, [undefined, 101]);
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
    // Offsets per call: 1st undefined, 2nd 6 (after yielding 5), 3rd 6 (no advance across failure),
    // 4th 7 - the stop-time confirm of update 6, handled after the abort.
    assert.deepStrictEqual(offsets, [undefined, 6, 6, 7]);
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
    // Offset is NOT advanced across the 429 (same as a transient error); the
    // trailing 7 is the stop-time confirm of update 6.
    assert.deepStrictEqual(offsets, [undefined, 6, 6, 7]);
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

  describe("confirm on stop (issue #1385)", () => {
    test("stop() during a handler confirms the handled update with a final poll", async () => {
      const controller = new AbortController();
      let confirm: { params: GetUpdatesParams; signal?: AbortSignal } | undefined;
      const { api } = fakeApi([
        () => [upd(100)],
        (params, signal) => {
          confirm = { params, signal };
          return [];
        },
      ]);

      const seen: number[] = [];
      for await (const update of longPoll(api, {}, controller.signal)) {
        seen.push(update.update_id);
        controller.abort(); // stop() lands while the handler runs
      }

      assert.deepStrictEqual(seen, [100]);
      assert.deepStrictEqual(confirm?.params, { offset: 101, limit: 1, timeout: 0 });
      // Sent on its own live deadline: not the aborted loop signal (which would
      // cancel it), and not unbounded (which could stall shutdown for minutes).
      assert.ok(confirm?.signal instanceof AbortSignal);
      assert.notStrictEqual(confirm.signal, controller.signal);
      assert.strictEqual(confirm.signal.aborted, false);
    });

    test("an update returned by the confirm poll is dropped, not yielded", async () => {
      const controller = new AbortController();
      // Update 101 arrived while 100 was handled: the confirm poll returns it,
      // but it stays unconfirmed (offset 101 confirms only < 101) for the next start.
      const { api, offsets } = fakeApi([() => [upd(100)], () => [upd(101)]]);

      const seen: number[] = [];
      for await (const update of longPoll(api, {}, controller.signal)) {
        seen.push(update.update_id);
        controller.abort();
      }

      assert.deepStrictEqual(seen, [100]);
      assert.deepStrictEqual(offsets, [undefined, 101]); // no poll after the confirm
    });

    test("a caller-supplied offset counts as already confirmed", async () => {
      // Stopped before the first poll: nothing new was handled, so no request at all.
      const aborted = new AbortController();
      aborted.abort();
      const idle = fakeApi([() => []]);
      for await (const _ of longPoll(idle.api, { offset: 50 }, aborted.signal)) {
        // no updates
      }
      assert.deepStrictEqual(idle.offsets, []);

      // Handled update 50, then stopped: polls from 50, confirms 51.
      const controller = new AbortController();
      const run = fakeApi([() => [upd(50)], () => []]);
      for await (const _ of longPoll(run.api, { offset: 50 }, controller.signal)) {
        controller.abort();
      }
      assert.deepStrictEqual(run.offsets, [50, 51]);
    });

    test("a mid-batch stop confirms only the updates handled, not the rest", async () => {
      const controller = new AbortController();
      const { api, offsets } = fakeApi([() => [upd(1), upd(2), upd(3)], () => []]);

      // The shape of Bot.startPolling: check the signal before handling each update.
      const handled: number[] = [];
      for await (const update of longPoll(api, {}, controller.signal)) {
        if (controller.signal.aborted) {
          break;
        }
        handled.push(update.update_id);
        controller.abort(); // stop() while update 1 is being handled
      }

      assert.deepStrictEqual(handled, [1]);
      // offset 2 confirms update 1 only; 2 and 3 stay pending for the next start.
      assert.deepStrictEqual(offsets, [undefined, 2]);
    });

    test("nothing is confirmed when the consumer throws without an abort", async () => {
      const { api, offsets } = fakeApi([() => [upd(1), upd(2)], () => []]);

      await assert.rejects(async () => {
        for await (const update of longPoll(api, {}, new AbortController().signal)) {
          if (update.update_id === 2) {
            throw new Error("catch boundary rethrew"); // fail-loud: keep redelivery
          }
        }
      }, /catch boundary rethrew/);

      // Offset 2 was pending (update 1 handled) but is not confirmed on an error exit.
      assert.deepStrictEqual(offsets, [undefined]);
    });

    test("a failing confirm is swallowed so it cannot mask the stop", async () => {
      const controller = new AbortController();
      const { api, offsets } = fakeApi([
        () => [upd(100)],
        () => {
          throw new NetworkError("connection reset");
        },
      ]);

      for await (const _ of longPoll(api, {}, controller.signal)) {
        controller.abort();
      }
      assert.deepStrictEqual(offsets, [undefined, 101]);
    });
  });
});
