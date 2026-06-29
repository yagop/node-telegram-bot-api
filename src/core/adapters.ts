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
  /**
   * A body a parser may have already populated (e.g. Express's `express.json()`,
   * which leaves a parsed object and *consumes* the stream). When present it is
   * used directly; otherwise the raw stream below is drained. See {@link readBody}.
   */
  body?: unknown;
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
 * Resolve the request body to a JSON string the core callback can parse.
 *
 * Prefers a pre-parsed `req.body` (an upstream parser both populates it and
 * consumes the stream, so re-draining would yield ""): a string passes through, a
 * `Buffer`/`Uint8Array` is decoded, and anything else (a parsed object) is
 * re-stringified. With no `req.body`, the raw stream is drained - decoding
 * `Uint8Array` chunks via the Web-standard `TextDecoder` (no node `Buffer`).
 */
async function readBody(req: NodeLikeRequest): Promise<string> {
  const pre = req.body;
  if (pre !== undefined && pre !== null) {
    if (typeof pre === "string") return pre;
    if (pre instanceof Uint8Array) return new TextDecoder().decode(pre);
    return JSON.stringify(pre);
  }

  const decoder = new TextDecoder();
  let body = "";
  for await (const chunk of req) {
    body += typeof chunk === "string" ? chunk : decoder.decode(chunk, { stream: true });
  }
  body += decoder.decode(); // flush any trailing multi-byte sequence
  return body;
}

/**
 * An `(req, res) => Promise<void>` handler for Express / Connect / Next.js Pages
 * API. Reads the request body, builds a Web `Request`, runs the core callback, and
 * writes the Web `Response` back onto `res`.
 *
 * Body source: if a parser already populated `req.body` (e.g. `express.json()`,
 * which also *consumes* the stream) it is used directly; otherwise the raw stream
 * is drained. This works whether or not a body parser ran upstream - draining
 * unconditionally would yield an empty body behind a global `express.json()`.
 */
export function nodeFrameworkWebhook(
  bot: Bot,
  options?: WebhookOptions,
): (req: NodeLikeRequest, res: NodeLikeResponse) => Promise<void> {
  const handle = webhookCallback(bot, options);

  return async function nodeHandler(req: NodeLikeRequest, res: NodeLikeResponse): Promise<void> {
    const body = await readBody(req);

    // Copy single-value headers into a Web `Headers`. Array-valued headers
    // (rare for webhook requests) are joined per the HTTP convention.
    const headers = new Headers();
    for (const [name, value] of Object.entries(req.headers)) {
      if (value === undefined) continue;
      headers.set(name, Array.isArray(value) ? value.join(", ") : value);
    }

    const request = new Request(`http://localhost${req.url ?? "/"}`, {
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
  app: { post(path: string, handler: (req: NodeLikeRequest, res: NodeLikeResponse) => unknown): unknown },
  options: WebhookOptions & { path: string },
): void {
  app.post(options.path, nodeFrameworkWebhook(bot, options));
}

/** Next.js Pages API uses the same `(req, res)` handler. */
export const nextPagesWebhook = nodeFrameworkWebhook;
