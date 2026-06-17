/**
 * Abortable timer helpers shared across core (transport backoff, long-poll
 * backoff, rate-limit waits). Edge-safe: only the Web-standard `setTimeout`.
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
