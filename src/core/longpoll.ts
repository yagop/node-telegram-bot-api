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
const STOP_CONFIRM_TIMEOUT_MS = 5000; // bounds shutdown; Transport alone would retry 429s/timeouts for minutes

const log = debug("polling");

/** A transient error's `retry_after` in ms (only `TelegramApiError` carries one), or undefined. */
function retryAfterMs(err: unknown): number | undefined {
  const seconds = err instanceof TelegramApiError ? err.retryAfter : undefined;
  return seconds === undefined ? undefined : seconds * 1000;
}

/** How the loop should react to a getUpdates error: `wait` ms before re-polling, plus the updated conflict count. */
type RetryPlan = { wait: number; conflicts: number };

/** Arguments to `planRetry` / `recover`: the error, the current conflict streak, the resolved retry options, and the signal. */
type RetryContext = {
  err: unknown;
  conflicts: number;
  retry: boolean;
  retryDelayMs: number;
  conflictRetryDelayMs: number;
  maxConflictRetries: number;
  onError?: (err: unknown) => void;
  signal?: AbortSignal;
};

/** Decide how to handle a getUpdates failure. Throws the error to stop the loop
 *  (non-retryable, or the conflict budget is exhausted); otherwise returns the
 *  wait before re-polling and the new consecutive-conflict count. */
function planRetry({
  err,
  conflicts,
  retry,
  retryDelayMs,
  conflictRetryDelayMs,
  maxConflictRetries,
  onError,
}: RetryContext): RetryPlan {
  const pollConflict = isPollConflict(err);
  if (!retry || !(isTransientError(err) || pollConflict)) {
    throw err;
  }
  // A conflict advances its own bounded counter; any other transient breaks the streak.
  const next = pollConflict ? conflicts + 1 : 0;
  if (pollConflict && next > maxConflictRetries) {
    throw err;
  }
  onError?.(err);
  // A conflict waits its own longer delay; otherwise honor `retry_after`
  // (e.g. a 429 flood-wait) when present, else the default delay.
  const wait = pollConflict ? conflictRetryDelayMs : (retryAfterMs(err) ?? retryDelayMs);
  log(
    "getUpdates %s; retry in %dms",
    pollConflict ? `conflict ${next}/${maxConflictRetries}` : "failed",
    Math.round(wait)
  );
  return { wait, conflicts: next };
}

/** Recover from a getUpdates failure: wait `plan.wait` ms then resume with the new
 *  conflict count, or `"stop"` the loop (the signal aborted, before or during the
 *  wait). `planRetry` may throw here to stop the loop on a non-retryable error. */
async function recover(ctx: RetryContext): Promise<{ conflicts: number } | "stop"> {
  const { signal } = ctx;
  if (signal?.aborted) {
    return "stop"; // cancelled - swallow the abort error
  }
  const plan = planRetry(ctx);
  try {
    await delay(plan.wait, signal);
  } catch {
    return "stop"; // aborted during the wait
  }
  return { conflicts: plan.conflicts };
}

/** `LongPollOptions` with defaults applied, plus the loop's signal - fixed for the loop's lifetime. */
type PollConfig = Omit<RetryContext, "err" | "conflicts"> & {
  timeout: number;
  limit?: number;
  allowedUpdates?: string[];
};

function resolveConfig(options: LongPollOptions, signal: AbortSignal | undefined): PollConfig {
  return {
    timeout: options.timeout ?? DEFAULT_POLL_TIMEOUT,
    limit: options.limit,
    allowedUpdates: options.allowedUpdates,
    retry: options.retry ?? true,
    retryDelayMs: options.retryDelayMs ?? DEFAULT_RETRY_DELAY,
    conflictRetryDelayMs: options.conflictRetryDelayMs ?? DEFAULT_CONFLICT_RETRY_DELAY,
    maxConflictRetries: options.maxConflictRetries ?? DEFAULT_MAX_CONFLICT_RETRIES,
    onError: options.onError,
    signal,
  };
}

/**
 * Long-poll until a batch arrives, retrying transient failures at the same
 * offset. Owns the consecutive-409 streak, which only spans failed polls (any
 * answered poll returns, resetting it). `undefined` once the signal aborts;
 * throws when the error is fatal.
 */
async function fetchBatch(
  api: Api,
  offset: number | undefined,
  config: PollConfig
): Promise<Update[] | undefined> {
  let conflicts = 0;
  while (!config.signal?.aborted) {
    try {
      return await api.getUpdates(
        {
          offset,
          limit: config.limit,
          timeout: config.timeout,
          allowed_updates: config.allowedUpdates,
        },
        config.signal
      );
    } catch (err) {
      // A 409 (another instance polling the same token) is transient for polling
      // but bounded, so an overlapping redeploy heals while a real two-instance
      // deployment still surfaces. `recover` throws for anything non-retryable.
      const outcome = await recover({ ...config, err, conflicts });
      if (outcome === "stop") {
        return undefined;
      }
      conflicts = outcome.conflicts;
    }
  }
  return undefined;
}

/**
 * Best-effort final `getUpdates` on stop, so Telegram confirms the handled
 * updates below `offset` (it confirms only via a later poll's offset). Skipped
 * unless the loop was aborted - an error exit keeps fail-loud redelivery - and
 * when the last answered poll already carried `offset`. Never throws.
 */
async function confirmOnStop(
  api: Api,
  signal: AbortSignal | undefined,
  offset: number | undefined,
  confirmed: number | undefined
): Promise<void> {
  if (!signal?.aborted || offset === undefined || offset === confirmed) {
    return;
  }
  try {
    await api.getUpdates(
      { offset, limit: 1, timeout: 0 },
      AbortSignal.timeout(STOP_CONFIRM_TIMEOUT_MS)
    );
    log("confirmed updates below %d on stop", offset);
  } catch (err) {
    log("failed to confirm updates below %d on stop: %s", offset, String(err));
  }
}

/**
 * Async-generator update source: long-polls `getUpdates` and yields each update
 * until the signal aborts. An update counts as handled once the consumer asks
 * for the next one; on abort, handled-but-unconfirmed updates are confirmed with
 * one final poll (not on error exits, so fail-loud keeps redelivery).
 */
export async function* longPoll(
  api: Api,
  options: LongPollOptions = {},
  signal?: AbortSignal
): AsyncGenerator<Update> {
  const config = resolveConfig(options, signal);
  let offset = options.offset;
  let confirmed = offset; // offset of the last poll Telegram answered

  log("started (timeout=%ds)", config.timeout);
  try {
    while (!signal?.aborted) {
      const updates = await fetchBatch(api, offset, config);
      if (updates === undefined) {
        return;
      }
      confirmed = offset;
      if (updates.length > 0) {
        log("%d update(s)", updates.length);
      }
      for (const update of updates) {
        yield update;
        offset = update.update_id + 1;
      }
    }
  } finally {
    await confirmOnStop(api, signal, offset, confirmed);
  }
}
