/**
 * Public entrypoint for `node-telegram-bot-api`.
 *
 * Provides:
 *   - The {@link TelegramBot} class (default export, for legacy compatibility).
 *   - Polling and Webhook helper classes (advanced use).
 *   - The full set of generated request/reply types (from scripts/api-parser.ts).
 *   - The error hierarchy.
 */

export {
  TelegramBot,
  type TelegramBotOptions,
  type BotOptionsBase,
  type TelegramBotEvents,
  type EventMetadata,
} from "./telegram.js";
export { TelegramBotPolling, type PollingOptions, type PollingStartOptions, type PollingStopOptions } from "./polling.js";
export { TelegramBotWebHook, type WebHookOptions } from "./webhook.js";
export { HttpClient, type HttpClientOptions, type RequestOptions } from "./http.js";

export * from "./errors.js";
export * from "./types/index.js";

import { TelegramBot } from "./telegram.js";
export default TelegramBot;
