/**
 * `createWebhookServer` / `startWebhook` - a self-hosted `node:http` webhook
 * server (ADR-005, §6.7).
 *
 * `createWebhookServer` adapts incoming `node:http` requests and delegates to the
 * core `nodeFrameworkWebhook` handler - no request-handling logic is duplicated -
 * and is returned WITHOUT `.listen()`, so the caller picks the port. `startWebhook`
 * is the managed one-liner on top: it listens and installs graceful-shutdown
 * handlers, the webhook counterpart of `run()` for long polling.
 */

import http from "node:http";
import process from "node:process";
import { type NodeLikeRequest, type NodeLikeResponse, nodeFrameworkWebhook } from "../core/adapters.js";
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
export function createWebhookServer(bot: Bot, options: WebhookServerOptions = {}): http.Server {
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

export interface StartWebhookOptions extends WebhookServerOptions {
  /** Port to listen on. */
  port: number;
  /** Hostname / interface to bind. Default: all interfaces. */
  hostname?: string;
  /** Grace period before in-flight connections are force-closed on shutdown, in ms. Default 10000. */
  shutdownTimeoutMs?: number;
}

const DEFAULT_SHUTDOWN_TIMEOUT = 10_000; // 10s, then force-close whatever is left

/**
 * Managed webhook runner: create a `node:http` webhook server, start listening,
 * and resolve when it shuts down. Installs `SIGINT`/`SIGTERM` handlers that close
 * the server for a graceful exit (cleaned up in a `finally`), mirroring `run()` for
 * long polling. Rejects if the server fails (e.g. the port is in use).
 *
 * Shutdown cannot hang: `server.close()` alone waits for every existing
 * connection to end, so a single idle keep-alive socket would keep the `"close"`
 * event (and this promise) pending forever - a stopped-but-never-exiting process.
 * So we also drop idle connections immediately and force-close any still busy
 * past `shutdownTimeoutMs`.
 *
 * You still register the webhook with Telegram yourself, pointing at this server's
 * public URL (terminate TLS at a proxy/tunnel in front of it):
 *   api.setWebhook({ url, secret_token })
 *
 * ```ts
 * await startWebhook(bot, { port: 8443, path: "/telegram", secretToken });
 * ```
 */
export async function startWebhook(bot: Bot, options: StartWebhookOptions): Promise<void> {
  const server = createWebhookServer(bot, options);
  const shutdownTimeoutMs = options.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT;
  let forceTimer: ReturnType<typeof setTimeout> | undefined;
  const stop = (): void => {
    server.close(); // stop accepting; resolves once existing connections end
    server.closeIdleConnections?.(); // drop idle keep-alive sockets now
    // A connection still busy past the grace period is force-closed, so a stuck
    // client cannot leave the process hanging. `unref` so the timer itself does
    // not hold the loop open.
    forceTimer = setTimeout(() => server.closeAllConnections?.(), shutdownTimeoutMs);
    forceTimer.unref?.();
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  try {
    await new Promise<void>((resolve, reject) => {
      server.on("error", reject);
      server.on("close", () => resolve());
      server.listen(options.port, options.hostname);
    });
  } finally {
    if (forceTimer) clearTimeout(forceTimer);
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
  }
}
