/**
 * Update sources — async generators that yield {@link Update}s.
 *
 * `longPoll` drives a `getUpdates` loop (web-standard, abortable); `fromArray`
 * replays a fixed batch (handy for tests and replay). The Bot composition root
 * consumes whichever source via `for await`.
 */

import type { Update, UpdateKind } from "../types/v2.js";
import { json } from "./json.js";
import type { Api } from "./client.js";

export interface PollOptions {
  offset?: number;
  limit?: number;
  timeout?: number;
  allowedUpdates?: UpdateKind[];
}

/**
 * Long-poll `getUpdates`, yielding each update and advancing the offset.
 * Loops until `signal` aborts; if a call fails after abort it returns quietly,
 * otherwise the error propagates.
 */
export async function* longPoll(
  api: Api,
  opts: PollOptions = {},
  signal?: AbortSignal,
): AsyncGenerator<Update> {
  let offset = opts.offset;

  while (!signal?.aborted) {
    let updates: Update[];
    try {
      updates = await api.call(
        "getUpdates",
        {
          offset,
          limit: opts.limit,
          timeout: opts.timeout ?? 30,
          allowed_updates: opts.allowedUpdates ? json(opts.allowedUpdates) : undefined,
        },
        signal,
      );
    } catch (err) {
      if (signal?.aborted) {
        return;
      }
      throw err;
    }

    for (const update of updates) {
      yield update;
      offset = update.update_id + 1;
    }
  }
}

/** Replay a fixed array of updates (e.g. for tests). */
export async function* fromArray(updates: Update[]): AsyncGenerator<Update> {
  for (const update of updates) {
    yield update;
  }
}
