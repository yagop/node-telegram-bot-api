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
  /** Resume the loop on transient errors (network / timeout / 5xx / 429) and 409 poll conflicts. Default true. */
  retry?: boolean;
  /** Delay before re-polling after a transient error that carries no `retry_after`, in ms. Default 1000. */
  retryDelayMs?: number;
  /** Delay before re-polling after a 409 conflict, in ms - longer, since the competing poller needs time to exit. Default 5000. */
  conflictRetryDelayMs?: number;
  /** Give up after this many consecutive 409 conflicts (a genuine two-instance deploy), then throw. Default 10. */
  maxConflictRetries?: number;
  /** Observe each transient error before the loop waits and resumes. */
  onError?: (err: unknown) => void;
}

const DEFAULT_POLL_TIMEOUT = 30; // 30 seconds
const DEFAULT_RETRY_DELAY = 1000; // 1 second, when the error carries no retry_after
const DEFAULT_CONFLICT_RETRY_DELAY = 5000; // 5 seconds; the other poller needs time to exit
const DEFAULT_MAX_CONFLICT_RETRIES = 10;
const HTTP_STATUS_CONFLICT = 409;

const log = debug("polling");

/** A 409 from `getUpdates` - another instance is polling the same token. Recoverable for polling, not for a plain request. */
function isPollConflict(err: unknown): boolean {
  return err instanceof TelegramApiError && err.errorCode === HTTP_STATUS_CONFLICT;
}

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
  const conflictRetryDelayMs = options.conflictRetryDelayMs ?? DEFAULT_CONFLICT_RETRY_DELAY;
  const maxConflictRetries = options.maxConflictRetries ?? DEFAULT_MAX_CONFLICT_RETRIES;
  const onError = options.onError;
  let conflicts = 0; // consecutive 409s; reset on any successful poll

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
      // A 409 means another instance is polling the same token: usually temporary
      // (an overlapping redeploy), so back off and resume - but bound it, so a real
      // two-instance deployment eventually surfaces instead of looping forever.
      const pollConflict = isPollConflict(err);
      // fatal - surface it
      if (!retry || !(isTransientError(err) || pollConflict)) throw err;
      if (pollConflict && ++conflicts > maxConflictRetries) throw err;
      onError?.(err);
      // A conflict waits its own longer delay; otherwise honor the error's
      // retry_after (e.g. a 429 flood-wait) when present, else the default delay.
      const wait = pollConflict ? conflictRetryDelayMs : (retryAfterMs(err) ?? retryDelayMs);
      if (pollConflict) log("getUpdates conflict (%d/%d); retry in %dms", conflicts, maxConflictRetries, Math.round(wait));
      else log("getUpdates failed; retry in %dms", Math.round(wait));
      try {
        await delay(wait, signal);
      } catch {
        // aborted during the wait
        return;
      }
      // retry WITHOUT advancing offset
      continue;
    }

    conflicts = 0; // a successful poll clears the conflict streak
    if (updates.length > 0) log("%d update(s)", updates.length);
    for (const update of updates) {
      yield update;
      offset = update.update_id + 1;
    }
  }
}
