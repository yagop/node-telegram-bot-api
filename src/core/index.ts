/**
 * `node-telegram-bot-api` core (the `.` subpath export).
 *
 * Runtime-agnostic: everything here uses only Web-standard APIs and runs on
 * Node 18+, Bun, Deno, and edge/serverless runtimes. Node-only helpers live in
 * `node-telegram-bot-api/node`.
 */

// dispatch + composition root
export { Bot } from "./bot.js";
export type { BotOptions, Handler } from "./bot.js";
export { Context } from "./context.js";
export { compose } from "./compose.js";
export type { Middleware, NextFunction } from "./compose.js";
export { longPoll, fromArray } from "./sources.js";
export type { PollOptions } from "./sources.js";

// client + transport
export { Api } from "./client.js";
export type { TransportOptions } from "./client.js";
export { Transport } from "./transport.js";
export { encodeForm } from "./encode.js";
export type { BuiltBody } from "./encode.js";

// webhooks
export { webhookCallback } from "./webhook.js";
export type { WebhookCallbackOptions } from "./webhook.js";
export { nodeFrameworkWebhook, registerExpressWebhook, nextAppWebhook, nextPagesWebhook } from "./server.js";

// builders (Json<T> producers)
export { json } from "./json.js";
export type { Json } from "./json.js";
export { InlineKeyboard } from "./markup.js";
export { EntityType, EntityBuilder, entity, fmt } from "./entities.js";
export type { EntityTypeName } from "./entities.js";
export { mediaGroup, MediaGroupBuilder } from "./media.js";

// files
export { inputFile, InputFile, isInputFile, isFormPart, toBlob } from "./files.js";
export type { FileData, FileMeta, FormPart, FormSink } from "./files.js";

// errors
export {
  TelegramBotError,
  NetworkError,
  TimeoutError,
  ParseError,
  TelegramApiError,
} from "./errors.js";
export type { ErrorCode } from "./errors.js";

// generated/curated types
export * from "../types/index.js";
