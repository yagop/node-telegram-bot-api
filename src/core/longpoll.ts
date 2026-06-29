import type { Update } from "../types/index.js";
import type { Api } from "./api.js";
import { debug } from "./debug.js";
import { delay } from "./delay.js";
import { isTransientError, TelegramApiError } from "./errors.js";

export interface LongPollOptions {
  offset?: number;
  limit?: number;
  /** Long-poll seconds passed to Telegram. Default 30. */
  timeout?: number;
  allowedUpdates?: string[];
  /** Resume the loop on transient errors (network / timeout / 5xx / 429). Default true. */
  retry?: boolean;
  /** Delay before re-polling after a transient error that carries no `retry_after`, in ms. Default 1000. */
  retryDelayMs?: number;
  /** Observe each transient error before the loop waits and resumes. */
  onError?: (err: unknown) => void;
}

const DEFAULT_POLL_TIMEOUT = 30; // 30 seconds
const DEFAULT_RETRY_DELAY = 1000; // 1 second, when the error carries no retry_after

const log = debug("polling");

/** A transient error's `retry_after` in ms (only `TelegramApiError` carries one), or undefined. */
function retryAfterMs(err: unknown): number | undefined {
  const seconds = err instanceof TelegramApiError ? err.retryAfter : undefined;
  return seconds === undefined ? undefined : seconds * 1000;
}

/** Async-generator update source (ADR-004): long-polls `getUpdates` and yields each update until the signal aborts. */
export async function* longPoll(api: Api, options: LongPollOptions = {}, signal?: AbortSignal): AsyncGenerator<Update> {
  let offset = options.offset;
  const timeout = options.timeout ?? DEFAULT_POLL_TIMEOUT;
  const limit = options.limit;
  const allowed = options.allowedUpdates;
  const retry = options.retry ?? true;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY;
  const onError = options.onError;

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
      // cancelled - swallow the abort error
      if (signal?.aborted) return;
      // fatal - surface it
      if (!retry || !isTransientError(err)) throw err;
      onError?.(err);
      // Honor the error's retry_after (e.g. a 429 flood-wait) when present, else
      // the default delay; re-poll WITHOUT advancing the offset.
      const wait = retryAfterMs(err) ?? retryDelayMs;
      log("getUpdates failed; retry in %dms", Math.round(wait));
      try {
        await delay(wait, signal);
      } catch {
        // aborted during the wait
        return;
      }
      // retry WITHOUT advancing offset
      continue;
    }

    if (updates.length > 0) log("%d update(s)", updates.length);
    for (const update of updates) {
      yield update;
      offset = update.update_id + 1;
    }
  }
}
