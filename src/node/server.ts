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
import { type NodeLikeRequest, type NodeLikeResponse, nodeFrameworkWebhook } from "../core/adapters.js";
import type { Bot } from "../core/bot.js";
import { debug } from "../core/debug.js";
import type { WebhookOptions } from "../core/webhook.js";
import { withShutdownSignals } from "./signals.js";

const log = debug("webhook");

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
    handler(req as unknown as NodeLikeRequest, res as unknown as NodeLikeResponse).catch((err: unknown) => {
      // Expected during a forced shutdown: `closeAllConnections()` destroys a
      // socket whose request body was still arriving, so `readBody` rejects
      // (ECONNRESET). Swallow it - an unhandled rejection here could crash the
      // process mid-shutdown - and try a 500 while the socket is still writable.
      log("handler error: %s", String(err));
      if (!res.headersSent && res.writable) {
        try {
          res.statusCode = 500;
          res.end();
        } catch {
          // socket already gone - nothing to send
        }
      }
    });
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
 * Begin a non-hanging shutdown of `server`: stop accepting, drop idle keep-alive
 * sockets at once (else `close` waits for them forever), and force-close anything
 * still busy past `timeoutMs`. Returns the force-close timer so the caller can
 * cancel it once `close` completes on its own. The connection helpers need Node
 * 18.2+ and are optional-chained so a non-Node runtime is a safe no-op.
 */
export function gracefulClose(server: http.Server, timeoutMs: number): ReturnType<typeof setTimeout> {
  server.close(); // stop accepting; resolves once existing connections end
  server.closeIdleConnections?.(); // drop idle keep-alive sockets now
  const forceTimer = setTimeout(() => server.closeAllConnections?.(), timeoutMs);
  forceTimer.unref?.(); // don't let the timer itself hold the loop open
  return forceTimer;
}

/**
 * Managed webhook runner: create a `node:http` webhook server, start listening,
 * and resolve when it shuts down. Once listening, installs `SIGINT`/`SIGTERM`
 * handlers that close the server for a graceful exit (cleaned up in a `finally`),
 * mirroring `run()` for long polling. Rejects if the server fails to start (e.g.
 * the port is in use).
 *
 * Shutdown cannot hang: `server.close()` waits for existing connections to end,
 * so we also drop idle keep-alive sockets at once and force-close anything still
 * busy past `shutdownTimeoutMs`.
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

  // 1) Listen first; reject on an early error (e.g. the port is in use). No
  //    shutdown handlers yet - a signal during startup keeps Node's default
  //    (exit), which is right: there is nothing listening to gracefully close.
  //    This also means `stop` can never run `server.close()` on a server that
  //    has not started (which would throw ERR_SERVER_NOT_RUNNING).
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.once("listening", () => resolve());
    server.listen(options.port, options.hostname);
  });

  // 2) Now that it is listening, wire graceful shutdown and wait for `close`.
  let forceTimer: ReturnType<typeof setTimeout> | undefined;
  let shuttingDown = false;
  const stop = (): void => {
    if (shuttingDown) return; // idempotent: a repeat signal must not schedule a second timer
    shuttingDown = true;
    forceTimer = gracefulClose(server, shutdownTimeoutMs);
  };
  try {
    await withShutdownSignals(
      stop,
      () =>
        new Promise<void>((resolve, reject) => {
          server.once("error", reject);
          server.once("close", () => resolve());
        }),
    );
  } finally {
    if (forceTimer) clearTimeout(forceTimer);
  }
}
