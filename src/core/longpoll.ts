/**
 * Async-generator update source (ADR-004).
 *
 * Replaces the bespoke polling class with the shape it always was:
 * `while (running) yield* updates`. Offset tracking and cancellation are just a
 * loop plus an `AbortSignal`. Because it is a plain async iterable, callers can
 * `for await` it, `take(n)`, filter, or fan out. The loop's error policy is the
 * caller's concern: an abort returns cleanly, anything else rethrows.
 */

import type { Update } from "../types/index.js";
import type { Api } from "./api.js";
import { debug } from "./debug.js";
import { delay } from "./delay.js";
import { isTransientError } from "./errors.js";

export interface LongPollOptions {
  offset?: number;
  limit?: number;
  /** Long-poll seconds passed to Telegram. Default 30. */
  timeout?: number;
  allowedUpdates?: string[];
  /** Resume the loop on transient (network/timeout/5xx) errors. Default true. */
  retry?: boolean;
  /** Cap for the exponential backoff between failed polls, in ms. Default 60000. */
  maxBackoffMs?: number;
  /** Observe each transient error before the loop backs off and resumes. */
  onError?: (err: unknown) => void;
}

const BASE_BACKOFF = 1000;
const DEFAULT_MAX_BACKOFF = 60_000;

const log = debug("polling");

export async function* longPoll(api: Api, options: LongPollOptions = {}, signal?: AbortSignal): AsyncGenerator<Update> {
  let offset = options.offset;
  const timeout = options.timeout ?? 30;
  const limit = options.limit;
  const allowed = options.allowedUpdates;
  const retry = options.retry ?? true;
  const maxBackoffMs = options.maxBackoffMs ?? DEFAULT_MAX_BACKOFF;
  const onError = options.onError;

  let failures = 0;

  log("started (timeout=%ds)", timeout);
  while (!signal?.aborted) {
    let updates: Update[];
    try {
      updates = await api.getUpdates(
        {
          offset,
          limit,
          timeout,
          allowed_updates: allowed,
        },
        signal,
      );
    } catch (err) {
      if (signal?.aborted) return; // cancelled - swallow the abort error
      if (!retry || !isTransientError(err)) throw err; // fatal - surface it
      onError?.(err);
      failures += 1;
      const exp = Math.min(BASE_BACKOFF * 2 ** (failures - 1), maxBackoffMs);
      const wait = exp * (0.5 + Math.random() * 0.5);
      log("getUpdates failed; backoff %dms (failure %d)", Math.round(wait), failures);
      try {
        await delay(wait, signal);
      } catch {
        return; // aborted during backoff
      }
      continue; // retry WITHOUT advancing offset
    }

    failures = 0; // reset backoff after any successful poll
    if (updates.length > 0) log("%d update(s)", updates.length);
    for (const update of updates) {
      yield update;
      offset = update.update_id + 1;
    }
  }
}
