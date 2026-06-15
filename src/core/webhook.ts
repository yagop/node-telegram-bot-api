/**
 * Web-standard webhook callback (ADR-005, §6.7).
 *
 * A pure `(Request) => Promise<Response>`: verify the secret-token header, parse
 * one `Update`, run `bot.handleUpdate`, return a `Response`. The same function
 * runs on Cloudflare Workers, Deno Deploy, Vercel Edge, Bun.serve, and the
 * Next.js App Router (which speaks `Request`/`Response` natively) — so this file
 * imports nothing Node-specific. Framework adapters that bridge `(req, res)`
 * servers live under `src/node` and delegate to this callback.
 *
 * Update dedup: Telegram **redelivers** an update if the webhook does not reply
 * with a 2xx in time (its delivery is at-least-once, not exactly-once). The same
 * `update.update_id` can therefore arrive more than once — especially with
 * `fastAck`/`waitUntil`, where the handler runs *after* the 200 and so cannot
 * influence whether Telegram considers the delivery acknowledged. Make handlers
 * idempotent, or dedupe on `update.update_id` (e.g. a short-TTL seen-set) before
 * acting on side effects. This callback does **not** dedupe for you.
 */

import type { Bot } from "./bot.js";
import type { Update } from "../types/index.js";

export interface WebhookOptions {
  /**
   * If set, the `X-Telegram-Bot-Api-Secret-Token` request header must match it,
   * else the callback responds 401. Mirrors `setWebhook`'s `secret_token`.
   * Compared in constant time (see {@link safeEqual}).
   */
  secretToken?: string;

  /**
   * Early-ACK mode. When `true`, the handler returns `200` **immediately** after
   * secret/parse validation and runs `bot.handleUpdate(update)` in the background
   * instead of awaiting it. This prevents a slow handler from tripping Telegram's
   * webhook timeout (which would otherwise cause a redelivery). See the file-level
   * dedup note: handlers should be idempotent when this is enabled.
   *
   * Implied when {@link WebhookOptions.waitUntil} is provided.
   */
  fastAck?: boolean;

  /**
   * Serverless keep-alive hook (e.g. Cloudflare/Vercel `ctx.waitUntil`). When
   * provided, the background `bot.handleUpdate(update)` promise is handed to it so
   * the runtime keeps the worker alive until the handler settles. Providing this
   * implies fast-ACK behavior (200 returned immediately) even if `fastAck` is unset.
   */
  waitUntil?: (promise: Promise<unknown>) => void;
}

/**
 * Constant-time string comparison. Does not early-out on content: a length
 * difference may be revealed (via the loop bound), but for a given length the
 * comparison always inspects every position, so it leaks no information about
 * *where* two equal-length strings differ. Pure JS — no `node:crypto` — to keep
 * `src/core` edge-safe.
 */
export function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export function webhookCallback(
  bot: Bot,
  options: WebhookOptions = {},
): (request: Request) => Promise<Response> {
  const { secretToken, fastAck, waitUntil } = options;
  // Providing a waitUntil hook implies fast-ACK behavior.
  const earlyAck = fastAck === true || waitUntil !== undefined;

  return async function handle(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    if (secretToken !== undefined) {
      // Always run the constant-time compare, even when the header is missing
      // (compare against ""), to avoid an early-out path that leaks header presence.
      const got = request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
      if (!safeEqual(got, secretToken)) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    let update: Update;
    try {
      update = (await request.json()) as Update;
    } catch {
      return new Response("Bad Request", { status: 400 });
    }

    if (earlyAck) {
      // Validate, kick off the handler, and ACK now. The bot's own catch boundary
      // handles errors inside handleUpdate; we still attach a defensive `.catch`
      // so a rejection escaping it can't surface as an unhandled rejection.
      const work = Promise.resolve(bot.handleUpdate(update)).catch(() => {
        /* swallowed: handleUpdate has its own error boundary */
      });
      if (waitUntil !== undefined) waitUntil(work);
      return new Response(null, { status: 200 });
    }

    await bot.handleUpdate(update);
    return new Response(null, { status: 200 });
  };
}
