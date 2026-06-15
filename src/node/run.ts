/**
 * `run` - a managed long-poll runner for Node processes (§6.5).
 *
 * Wraps `bot.startPolling()` with `SIGINT`/`SIGTERM` handlers that call
 * `bot.stop()` for graceful shutdown, and removes those listeners when the runner
 * resolves. Lives under `./node` because it touches `node:process`. The webhook
 * counterpart is `startWebhook` (see `./server`).
 */

import process from "node:process";
import type { Bot } from "../core/bot.js";
import type { LongPollOptions } from "../core/longpoll.js";

/**
 * Start the bot's long-poll loop and resolve when it stops. Installs
 * `SIGINT`/`SIGTERM` handlers that trigger `bot.stop()` for a clean shutdown,
 * cleaned up in a `finally` so repeated runs don't leak listeners.
 */
export async function run(bot: Bot, options?: LongPollOptions): Promise<void> {
  const stop = (): void => {
    bot.stop();
  };

  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  try {
    return await bot.startPolling(undefined, options);
  } finally {
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
  }
}
