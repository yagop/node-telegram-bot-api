/**
 * `node-telegram-bot-api` - runtime-agnostic core entry (subpath ".").
 *
 * Imports only Web-standard APIs; a CI lint guarantees nothing here reaches for
 * `node:*`, so this bundle runs unchanged on Node 18+, Bun, Deno, Cloudflare
 * Workers, Vercel Edge and Deno Deploy. Node-only sugar (fs uploads, a
 * self-hosted webhook server, a managed polling runner) lives in the `./node`
 * subpath.
 */

// The generated schema is re-exported by core.
export * from "../types/index.js";
// Framework webhook adapters
export * from "./adapters.js";
// The single generated client class
export * from "./api.js";
export * from "./bot.js";
// Dispatch
export * from "./compose.js";
export * from "./context.js";
// Request encoding
export * from "./encode.js";
export * from "./entities.js";
// Errors
export * from "./errors.js";
// Files & the form-part contract
export * from "./files.js";
// Builders - optional fluent sugar over plain param shapes
export * from "./keyboard.js";
export * from "./longpoll.js";
export * from "./media.js";
// Opt-in session middleware + its core store and the reply-tracking layer
export * from "./memory-session-storage.js";
// Opt-in rate limiting
export * from "./ratelimiter.js";
export * from "./reply-tracking.js";
export * from "./richmessage.js";
export * from "./richtext.js";
export * from "./session.js";
// Transport
export * from "./transport.js";
// Webhooks
export * from "./webhook.js";
