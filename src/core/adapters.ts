/**
 * Framework webhook adapters (ADR-005, §6.7).
 *
 * These live in core because they bridge the pure `(Request) => Promise<Response>`
 * webhook callback onto the shapes popular frameworks expose - without dragging in
 * a single `node:*` import. The `(req, res)` Node-style handler types its arguments
 * STRUCTURALLY (a minimal duck-typed shape), so `node:http`, Express, Connect and
 * Next.js are never dependencies and core stays runtime-agnostic.
 *
 * - `nextAppWebhook`     - Next.js App Router (`export const POST = nextAppWebhook(bot)`);
 *                          the core callback verbatim, since the App Router speaks Web `Request`/`Response`.
 * - `nodeFrameworkWebhook` - an `(req, res)` handler for Express / Connect / Next.js Pages API.
 * - `registerExpressWebhook` - registers the `(req, res)` handler on an existing Express app.
 * - `nextPagesWebhook`   - alias of `nodeFrameworkWebhook` (Next.js Pages API).
 */

import type { Bot } from "./bot.js";
import { type WebhookOptions, webhookCallback } from "./webhook.js";

/**
 * Minimal structural shape of a Node-style request (Express / Connect / Node http).
 * Typed here so core never imports `node:http`.
 */
export interface NodeLikeRequest {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  [Symbol.asyncIterator](): AsyncIterableIterator<string | Uint8Array>;
}

/** Minimal structural shape of a Node-style response. */
export interface NodeLikeResponse {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(chunk?: string): void;
}

/**
 * Next.js App Router handler. The App Router speaks Web `Request`/`Response`
 * natively, so this is the core `webhookCallback` verbatim:
 *
 * ```ts
 * export const POST = nextAppWebhook(bot);
 * ```
 */
export function nextAppWebhook(bot: Bot, options?: WebhookOptions): (request: Request) => Promise<Response> {
  return webhookCallback(bot, options);
}

/**
 * An `(req, res) => Promise<void>` handler for Express / Connect / Next.js Pages
 * API. Reads the raw request body off the stream, builds a Web `Request`, runs
 * the core callback, and writes the Web `Response` back onto `res`.
 *
 * We always read the raw stream (ignoring any body parser that may have already
 * populated `req.body`): it is the simplest correct path and keeps this adapter
 * independent of body-parsing middleware.
 */
export function nodeFrameworkWebhook(
  bot: Bot,
  options?: WebhookOptions,
): (req: NodeLikeRequest, res: NodeLikeResponse) => Promise<void> {
  const handle = webhookCallback(bot, options);

  return async function nodeHandler(req: NodeLikeRequest, res: NodeLikeResponse): Promise<void> {
    // Accumulate the raw body. Decode Uint8Array chunks; append strings as-is.
    // No node `Buffer` - `TextDecoder` is a Web standard available everywhere.
    const decoder = new TextDecoder();
    let body = "";
    for await (const chunk of req) {
      body += typeof chunk === "string" ? chunk : decoder.decode(chunk, { stream: true });
    }
    body += decoder.decode(); // flush any trailing multi-byte sequence

    // Copy single-value headers into a Web `Headers`. Array-valued headers
    // (rare for webhook requests) are joined per the HTTP convention.
    const headers = new Headers();
    for (const [name, value] of Object.entries(req.headers)) {
      if (value === undefined) continue;
      headers.set(name, Array.isArray(value) ? value.join(", ") : value);
    }

    const request = new Request("http://localhost" + (req.url ?? "/"), {
      method: req.method ?? "POST",
      headers,
      body,
    });

    const response = await handle(request);
    res.statusCode = response.status;
    res.end(await response.text());
  };
}

/**
 * Register the webhook route on an already-instantiated Express app. `app` is
 * typed structurally so Express is never a dependency:
 *
 * ```ts
 * registerExpressWebhook(bot, app, { path: "/telegram", secretToken });
 * ```
 */
export function registerExpressWebhook(
  bot: Bot,
  app: { post(path: string, handler: (req: any, res: any) => unknown): unknown },
  options: WebhookOptions & { path: string },
): void {
  app.post(options.path, nodeFrameworkWebhook(bot, options));
}

/** Next.js Pages API uses the same `(req, res)` handler. */
export const nextPagesWebhook = nodeFrameworkWebhook;
