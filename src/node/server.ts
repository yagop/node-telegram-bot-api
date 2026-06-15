/**
 * `createWebhookServer` - a self-hosted `node:http` webhook server (ADR-005, §6.7).
 *
 * Adapts incoming `node:http` requests and delegates to the core
 * `nodeFrameworkWebhook` handler - no request-handling logic is duplicated. The
 * server is returned WITHOUT calling `.listen()`, so the caller picks the port.
 */

import http from "node:http";
import { nodeFrameworkWebhook, type NodeLikeRequest, type NodeLikeResponse } from "../core/adapters.js";
import type { Bot } from "../core/bot.js";
import type { WebhookOptions } from "../core/webhook.js";

export interface WebhookServerOptions extends WebhookOptions {
  /** Only requests to this path are handled; others get 404. Default `/`. */
  path?: string;
}

/**
 * Create (but do not start) a `node:http` server that handles Telegram webhook
 * requests. Requests whose path differs from `options.path` (default `/`) get a
 * 404; matching requests are delegated to the core `(req, res)` handler.
 *
 * ```ts
 * const server = createWebhookServer(bot, { path: "/telegram", secretToken });
 * server.listen(8443);
 * ```
 */
export function createWebhookServer(
  bot: Bot,
  options: WebhookServerOptions = {},
): http.Server {
  const path = options.path ?? "/";
  const handler = nodeFrameworkWebhook(bot, options);

  return http.createServer((req, res) => {
    // `req.url` includes the query string; compare the path component only.
    const reqPath = (req.url ?? "/").split("?", 1)[0];
    if (reqPath !== path) {
      res.statusCode = 404;
      res.end("Not Found");
      return;
    }
    // node:http's IncomingMessage / ServerResponse structurally satisfy the
    // core's NodeLike shapes.
    void handler(req as unknown as NodeLikeRequest, res as unknown as NodeLikeResponse);
  });
}
