/**
 * Abortable timer + backoff helpers shared across core (transport retry,
 * long-poll loop, rate-limit waits). Edge-safe: only the Web-standard
 * `setTimeout` and `Math.random`.
 */

/**
 * Resolve after `ms`, or reject with the signal's reason if it aborts.
 * A non-positive `ms` resolves immediately without scheduling a timer.
 */
export function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    if (ms <= 0) return resolve();
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Exponential backoff with full-range jitter: `baseMs * 2^(attempt-1)`, capped
 * at `capMs`, then scaled to a random 50-100% of that. `attempt` is 1-based (the
 * first retry is 1). Used by the transport's per-request retry.
 */
export function backoff(attempt: number, baseMs: number, capMs: number): number {
  const exp = Math.min(baseMs * 2 ** (attempt - 1), capMs);
  return exp * (0.5 + Math.random() * 0.5);
}
