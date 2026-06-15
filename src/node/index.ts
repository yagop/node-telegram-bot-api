/**
 * `node-telegram-bot-api/node` subpath barrel — Node-only helpers.
 *
 * Imports here may use `node:*`; the rest of the library stays runtime-agnostic.
 */

export { fromPath } from "./files.js";
export { createWebhookServer, type NodeWebhookServerOptions } from "./webhook-server.js";
