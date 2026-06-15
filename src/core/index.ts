/**
 * `node-telegram-bot-api` — runtime-agnostic core entry (subpath ".").
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
// The single generated client class (ADR-001)
export * from "./api.js";
// Builders + json() (ADR-002, ADR-011, §6.3)
export * from "./json.js";
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
