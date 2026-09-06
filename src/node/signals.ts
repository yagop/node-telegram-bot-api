/**
 * Shared graceful-shutdown plumbing for the managed Node runners (`run` and
 * `startWebhook`). Both install the same `SIGINT`/`SIGTERM` -> `stop` handlers
 * around a long-lived body and must remove them on the way out; this is the one
 * place that knows which signals mean "shut down".
 */

import process from "node:process";

const SHUTDOWN_SIGNALS = ["SIGINT", "SIGTERM"] as const;

/**
 * Run `body` with `stop` registered on the shutdown signals, guaranteeing the
 * handlers are removed afterwards (so repeated runs don't leak listeners),
 * whether `body` resolves or throws.
 */
export async function withShutdownSignals<T>(stop: () => void, body: () => Promise<T>): Promise<T> {
  for (const sig of SHUTDOWN_SIGNALS) process.on(sig, stop);
  try {
    return await body();
  } finally {
    for (const sig of SHUTDOWN_SIGNALS) process.off(sig, stop);
  }
}
