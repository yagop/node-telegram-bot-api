import type { Update } from "../types/index.js";
import type { Api } from "./api.js";
import { debug } from "./debug.js";
import { delay } from "./delay.js";
import { isPollConflict, isTransientError, TelegramApiError } from "./errors.js";

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
  /** Retry on up to this many consecutive 409 conflicts; the next one (a genuine two-instance deploy) throws. Default 10. */
  maxConflictRetries?: number;
  /** Observe each transient error before the loop waits and resumes. */
  onError?: (err: unknown) => void;
}

const DEFAULT_POLL_TIMEOUT = 30; // 30 seconds
const DEFAULT_RETRY_DELAY = 1000; // 1 second, when the error carries no retry_after
const DEFAULT_CONFLICT_RETRY_DELAY = 5000; // 5 seconds; the other poller needs time to exit
const DEFAULT_MAX_CONFLICT_RETRIES = 10;

const log = debug("polling");

/** A transient error's `retry_after` in ms (only `TelegramApiError` carries one), or undefined. */
function retryAfterMs(err: unknown): number | undefined {
  const seconds = err instanceof TelegramApiError ? err.retryAfter : undefined;
  return seconds === undefined ? undefined : seconds * 1000;
}

type RetryConfig = {
  retry: boolean;
  retryDelayMs: number;
  conflictRetryDelayMs: number;
  maxConflictRetries: number;
  onError?: (err: unknown) => void;
};

/** How the loop should react to a getUpdates error: `wait` ms before re-polling, plus the updated conflict count. */
type RetryPlan = { wait: number; conflicts: number };

/** Arguments to `planRetry` / `recover`: the error, the current conflict streak, and the resolved config. */
type RetryContext = { err: unknown; conflicts: number; cfg: RetryConfig; signal?: AbortSignal };

/** Decide how to handle a getUpdates failure. Throws the error to stop the loop
 *  (non-retryable, or the conflict budget is exhausted); otherwise returns the
 *  wait before re-polling and the new consecutive-conflict count. */
function planRetry({ err, conflicts, cfg }: RetryContext): RetryPlan {
  const pollConflict = isPollConflict(err);
  if (!cfg.retry || !(isTransientError(err) || pollConflict)) throw err;
  // A conflict advances its own bounded counter; any other transient breaks the streak.
  const next = pollConflict ? conflicts + 1 : 0;
  if (pollConflict && next > cfg.maxConflictRetries) throw err;
  cfg.onError?.(err);
  // A conflict waits its own longer delay; otherwise honor `retry_after`
  // (e.g. a 429 flood-wait) when present, else the default delay.
  const wait = pollConflict ? cfg.conflictRetryDelayMs : (retryAfterMs(err) ?? cfg.retryDelayMs);
  log("getUpdates %s; retry in %dms", pollConflict ? `conflict ${next}/${cfg.maxConflictRetries}` : "failed", Math.round(wait));
  return { wait, conflicts: next };
}

/** Recover from a getUpdates failure: wait `plan.wait` ms then resume with the new
 *  conflict count, or `"stop"` the loop (the signal aborted, before or during the
 *  wait). `planRetry` may throw here to stop the loop on a non-retryable error. */
async function recover(ctx: RetryContext): Promise<{ conflicts: number } | "stop"> {
  const { signal } = ctx;
  if (signal?.aborted) return "stop"; // cancelled - swallow the abort error
  const plan = planRetry(ctx);
  try {
    await delay(plan.wait, signal);
  } catch {
    return "stop"; // aborted during the wait
  }
  return { conflicts: plan.conflicts };
}

/** Async-generator update source (ADR-004): long-polls `getUpdates` and yields each update until the signal aborts. */
export async function* longPoll(api: Api, options: LongPollOptions = {}, signal?: AbortSignal): AsyncGenerator<Update> {
  let offset = options.offset;
  const timeout = options.timeout ?? DEFAULT_POLL_TIMEOUT;
  const limit = options.limit;
  const allowed = options.allowedUpdates;
  const retryConfig: RetryConfig = {
    retry: options.retry ?? true,
    retryDelayMs: options.retryDelayMs ?? DEFAULT_RETRY_DELAY,
    conflictRetryDelayMs: options.conflictRetryDelayMs ?? DEFAULT_CONFLICT_RETRY_DELAY,
    maxConflictRetries: options.maxConflictRetries ?? DEFAULT_MAX_CONFLICT_RETRIES,
    onError: options.onError,
  };
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
      // A 409 (another instance polling the same token) is transient for polling
      // but bounded, so an overlapping redeploy heals while a real two-instance
      // deployment still surfaces. `recover` throws for anything non-retryable.
      const outcome = await recover({ err, conflicts, cfg: retryConfig, signal });
      if (outcome === "stop") return;
      conflicts = outcome.conflicts;
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
