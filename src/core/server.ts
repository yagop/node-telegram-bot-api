/**
 * Framework webhook adapters — web-standard, no `node:*` imports.
 *
 * These bridge a handful of popular Node web frameworks (Express, Next.js
 * pages/app router, and anything with a compatible `(req, res)` shape) onto the
 * single web-standard {@link webhookCallback} in `./webhook.js`. The library
 * itself only ever speaks `Request`/`Response`; the per-framework glue lives
 * here so the core stays runtime-agnostic (ADR-012).
 */

import { webhookCallback } from "./webhook.js";
import type { WebhookCallbackOptions } from "./webhook.js";
import type { Bot } from "./bot.js";

/** The subset of a Node-framework request object we need to build a `Request`. */
export interface ReqLike {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

/** The subset of a Node-framework response object we need to reply. */
export interface ResLike {
  status(code: number): ResLike;
  send(body?: string): unknown;
}

/** Anything Express-shaped enough to register a POST handler on. */
export interface ExpressLike {
  post(path: string, handler: (req: ReqLike, res: ResLike) => void | Promise<void>): unknown;
}

/** Adapt a Node-framework request object into a web-standard `Request`. */
export function toRequest(req: ReqLike): Request {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
    } else {
      headers.set(name, value);
    }
  }

  const method = req.method ?? "POST";
  let body: string | undefined;
  if (req.body !== undefined && req.body !== null) {
    body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
  }

  return new Request(req.url ?? "http://localhost/", { method, headers, body });
}

/**
 * A generic Node-framework webhook handler: adapts `(req, res)` onto the
 * web-standard callback and writes the resulting status/body back.
 */
export function nodeFrameworkWebhook(
  bot: Bot,
  options?: WebhookCallbackOptions,
): (req: ReqLike, res: ResLike) => Promise<void> {
  const callback = webhookCallback(bot, options);
  return async (req, res) => {
    const response = await callback(toRequest(req));
    res.status(response.status).send(await response.text());
  };
}

/** Register the webhook handler as a POST route on an Express-like app. */
export function registerExpressWebhook<A extends ExpressLike>(
  bot: Bot,
  app: A,
  options: WebhookCallbackOptions & { path: string },
): A {
  app.post(options.path, nodeFrameworkWebhook(bot, options));
  return app;
}

/** Next.js pages router (`pages/api/...`) handler — same shape as Express. */
export const nextPagesWebhook = nodeFrameworkWebhook;

/** Next.js app router (`app/.../route.ts`) handler — a web-standard `Request` → `Response`. */
export function nextAppWebhook(
  bot: Bot,
  options?: WebhookCallbackOptions,
): (request: Request) => Promise<Response> {
  return webhookCallback(bot, options);
}
