/**
 * `run` - a managed long-poll runner for Node processes (§6.5).
 *
 * Wraps `bot.startPolling()` with `SIGINT`/`SIGTERM` handlers that call
 * `bot.stop()` for graceful shutdown, removes those listeners when the runner
 * resolves, and calls `bot.close()` so middleware-held resources (a session
 * store's connection pool / database handle) are released. Lives under `./node`
 * because it touches `node:process`. The webhook counterpart is `startWebhook`
 * (see `./server`).
 */

import process from "node:process";
import type { Bot } from "../core/bot.js";
import type { LongPollOptions } from "../core/longpoll.js";
import { withShutdownSignals } from "./signals.js";

/**
 * Start the bot's long-poll loop and resolve when it stops. Installs
 * `SIGINT`/`SIGTERM` handlers that trigger `bot.stop()` for a clean shutdown,
 * cleaned up in a `finally` so repeated runs don't leak listeners. Middleware
 * setup runs first (via `bot.startPolling` -> `bot.init()`), so a bad session
 * store fails before the first poll; teardown (`bot.close()`) runs on the way
 * out, whether the loop stopped or threw.
 *
 * A fatal poll-stop is also written to stderr before being re-thrown: a bare
 * rejection can be dropped (fire-and-forget, or a swallowing `.catch`), which
 * would leave the process alive but no longer polling - the silent hang #1350
 * describes.
 */
export async function run(bot: Bot, options?: LongPollOptions): Promise<void> {
  // Only a call that actually owns the pump may close. `startPolling` refuses
  // when another run is already active (as a rejection - it is async - so the
  // loser cannot be told apart after the fact); checking first is what keeps this
  // call from closing stores under the run that is still using them.
  const owned = !bot.isRunning();
  try {
    return await withShutdownSignals(
      () => bot.stop(),
      () => bot.startPolling(undefined, options),
    );
  } catch (err) {
    // Never let a fatal poll-stop be silent (see the doc comment above).
    process.stderr.write(`node-telegram-bot-api: polling stopped on a fatal error: ${String(err)}\n`);
    throw err;
  } finally {
    if (owned) await bot.close();
  }
}
