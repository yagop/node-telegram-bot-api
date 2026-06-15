/**
 * Async-generator update source (ADR-004).
 *
 * Replaces the bespoke polling class with the shape it always was:
 * `while (running) yield* updates`. Offset tracking and cancellation are just a
 * loop plus an `AbortSignal`. Because it is a plain async iterable, callers can
 * `for await` it, `take(n)`, filter, or fan out. The loop's error policy is the
 * caller's concern: an abort returns cleanly, anything else rethrows.
 */

import type { Api } from "./api.js";
import { json } from "./json.js";
import type { Update } from "../types/index.js";

export interface LongPollOptions {
  offset?: number;
  limit?: number;
  /** Long-poll seconds passed to Telegram. Default 30. */
  timeout?: number;
  allowedUpdates?: string[];
}

export async function* longPoll(
  api: Api,
  options: LongPollOptions = {},
  signal?: AbortSignal,
): AsyncGenerator<Update> {
  let offset = options.offset;
  const timeout = options.timeout ?? 30;
  const limit = options.limit;
  const allowed = options.allowedUpdates;

  while (!signal?.aborted) {
    let updates: Update[];
    try {
      updates = await api.getUpdates(
        {
          offset,
          limit,
          timeout,
          allowed_updates: allowed ? json(allowed) : undefined,
        },
        signal,
      );
    } catch (err) {
      if (signal?.aborted) return; // cancelled — swallow the abort error
      throw err;
    }

    for (const update of updates) {
      yield update;
      offset = update.update_id + 1;
    }
  }
}
