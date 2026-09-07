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

/** Write to stderr and resolve once the chunk is flushed - a following `process.exit()` would otherwise truncate it. */
function writeStderr(line: string): Promise<void> {
  return new Promise((resolve) => {
    process.stderr.write(line, () => resolve());
  });
}

export type RunOptions = LongPollOptions & {
  /**
   * On a fatal poll-stop, exit the process with a non-zero code (after teardown
   * and the stderr log) so a supervisor restarts the bot. Default false - `run`
   * re-throws instead, leaving the exit policy to the caller.
   */
  exitOnError?: boolean;
};

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
 * describes. Pass `exitOnError: true` to also exit the process non-zero after
 * teardown, so a supervisor restarts the bot instead of relying on the caller.
 */
export async function run(bot: Bot, options: RunOptions = {}): Promise<void> {
  const { exitOnError = false, ...pollOptions } = options;
  // Only a call that actually owns the pump may close. `startPolling` refuses
  // when another run is already active (as a rejection - it is async - so the
  // loser cannot be told apart after the fact); checking first is what keeps this
  // call from closing stores under the run that is still using them.
  const owned = !bot.isRunning();
  let failed = false;
  try {
    return await withShutdownSignals(
      () => bot.stop(),
      () => bot.startPolling(undefined, pollOptions)
    );
  } catch (err) {
    // Only the call that owns the pump reports and acts on the stop; a call that
    // lost the "already running" race just re-throws to its own caller - it must
    // not log a misleading "polling stopped" line or exit a healthy pump's process.
    if (owned) {
      failed = true;
      // Await the flush so the exit below can't truncate this diagnostic.
      await writeStderr(
        `node-telegram-bot-api: polling stopped on a fatal error: ${String(err)}\n`
      );
    }
    throw err;
  } finally {
    try {
      if (owned) await bot.close();
    } finally {
      // Nested so it runs even when teardown throws: `exitOnError` must not be
      // defeated by the very stuck resource it exists to escape. Gated on
      // `failed` (which implies `owned`), so a losing double-run never exits.
      if (failed && exitOnError) process.exit(1);
    }
  }
}
