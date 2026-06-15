import { describe, expect, test } from "bun:test";
import { longPoll } from "../../src/core/longpoll.js";
import type { Api } from "../../src/core/api.js";
import { NetworkError, TelegramApiError } from "../../src/core/errors.js";
import type { Update } from "../../src/types/index.js";

/** A minimal `Update` carrying just `update_id` for assertions. */
function upd(id: number): Update {
  return { update_id: id, message: {} } as unknown as Update;
}

/** Build a fake `Api` whose `getUpdates` runs the given step functions in order. */
function fakeApi(
  steps: Array<(params: { offset?: number }) => Update[] | Promise<Update[]>>,
): { api: Api; offsets: Array<number | undefined> } {
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
    expect(seen).toEqual([100]);
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
      { maxBackoffMs: 1 }, // keep backoff ~0 (jittered <=1ms)
      controller.signal,
    )) {
      seen.push(update.update_id);
    }

    expect(seen).toEqual([5, 6]);
    // Offsets per call: 1st undefined, 2nd 6 (after yielding 5), 3rd 6 (no advance across failure).
    expect(offsets).toEqual([undefined, 6, 6]);
  });

  test("rethrows a fatal TelegramApiError(401)", async () => {
    const { api } = fakeApi([
      () => {
        throw new TelegramApiError(401, "Unauthorized");
      },
    ]);

    let caught: unknown;
    try {
      for await (const _ of longPoll(api, { maxBackoffMs: 1 })) {
        // no-op
      }
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(TelegramApiError);
    expect((caught as TelegramApiError).errorCode).toBe(401);
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
    expect(caught).toBeInstanceOf(NetworkError);
  });
});
