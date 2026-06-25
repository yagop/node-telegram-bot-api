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
});
