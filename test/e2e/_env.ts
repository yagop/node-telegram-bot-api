/**
 * Shared setup for the live e2e suites.
 *
 * These tests hit the real Telegram Bot API. They are gated behind
 * `NODE_TELEGRAM_TOKEN`; the behavioral suite additionally needs `TEST_GROUP_ID`.
 * Nothing here touches the network at import time — `makeApi()` is a lazy factory
 * so the no-token skip path never even constructs an `Api`.
 */
import { Api } from "../../src/core/api.js";

/** Bot token from the environment; `undefined` when running without live creds. */
export const TOKEN: string | undefined = process.env.NODE_TELEGRAM_TOKEN;

/** A group/supergroup the bot is a member of, for real round-trip tests. */
export const GROUP_ID: string | undefined = process.env.TEST_GROUP_ID;

/** A user id the bot can address, for the few user-scoped behaviors. */
export const USER_ID: string | undefined = process.env.TEST_USER_ID;

/** True when a token is present — used to skip whole suites. */
export const hasToken: boolean = typeof TOKEN === "string" && TOKEN.length > 0;

/**
 * Construct a rate-limited `Api`. The global cap keeps the attempt-all matrix
 * (~180 calls) from tripping Telegram's flood limits; `maxRetries: 1` and a
 * 15s timeout keep a stuck call from hanging the suite.
 */
export function makeApi(): Api {
  return new Api(TOKEN!, {
    rateLimit: { global: 8 },
    maxRetries: 1,
    timeoutMs: 15000,
  });
}

/**
 * The ~180 generated request methods on `Api.prototype`, excluding the
 * machinery (`constructor`, `request`). These are the names the matrix iterates.
 */
export function enumerateMethods(): string[] {
  const proto = Api.prototype as unknown as Record<string, unknown>;
  return Object.getOwnPropertyNames(Api.prototype).filter((name) => {
    if (name === "constructor" || name === "request") return false;
    return typeof proto[name] === "function";
  });
}

/**
 * Methods that MUTATE bot/global state or disrupt operation when called with no
 * arguments. The matrix must SKIP these so a wiring check never bricks the bot.
 */
export const DANGEROUS_ARGLESS: Set<string> = new Set([
  "logOut", // lockout: logs the bot out of the cloud API; can't log back in for 10 min
  "close", // lockout: closes the bot instance before migrating to a local server
  "deleteWebhook", // removes webhook: would silently drop any configured webhook delivery
  "getUpdates", // consumes-or-disrupts updates: long-polls and acks pending updates
  "deleteMyCommands", // clears commands: wipes the bot's registered command list
  "setMyName", // clears profile field: with no args resets the bot's display name
  "setMyDescription", // clears profile field: with no args resets the bot's description
  "setMyShortDescription", // clears profile field: with no args resets the short description
  "setMyDefaultAdministratorRights", // sets global default: with no args clears default admin rights
  "setChatMenuButton", // sets global default: with no args resets the default chat menu button
]);
