/**
 * `node-telegram-bot-api` - runtime-agnostic core entry (subpath ".").
 *
 * Imports only Web-standard APIs; a CI lint guarantees nothing here reaches for
 * `node:*`, so this bundle runs unchanged on Node 18+, Bun, Deno, Cloudflare
 * Workers, Vercel Edge and Deno Deploy. Node-only sugar (fs uploads, a
 * self-hosted webhook server, a managed polling runner) lives in the `./node`
 * subpath.
 */

// Errors (ADR-008)
export * from "./errors.js";
// Files & the form-part contract (ADR-006, ADR-011)
export * from "./files.js";
// Request encoding (ADR-002, ADR-010)
export * from "./encode.js";
// Transport (ADR-005, ADR-008)
export * from "./transport.js";
// Opt-in rate limiting (ADR-004 §10, M3)
export * from "./ratelimiter.js";
// The single generated client class (ADR-001)
export * from "./api.js";
// Builders (§6.2-6.4) - optional fluent sugar over plain param shapes
export * from "./keyboard.js";
export * from "./entities.js";
export * from "./media.js";
// Dispatch (ADR-003, ADR-004)
export * from "./compose.js";
export * from "./context.js";
export * from "./longpoll.js";
export * from "./bot.js";
// Webhooks (ADR-005, §6.7)
export * from "./webhook.js";
// Framework webhook adapters (ADR-005, §6.7)
export * from "./adapters.js";

// The generated schema is re-exported by core (§5).
export * from "../types/index.js";
