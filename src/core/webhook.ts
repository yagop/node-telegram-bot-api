/**
 * Web-standard webhook callback (ADR-005, §6.7).
 *
 * A pure `(Request) => Promise<Response>`: verify the secret-token header, parse
 * one `Update`, run `bot.handleUpdate`, return a `Response`. The same function
 * runs on Cloudflare Workers, Deno Deploy, Vercel Edge, Bun.serve, and the
 * Next.js App Router (which speaks `Request`/`Response` natively) — so this file
 * imports nothing Node-specific. Framework adapters that bridge `(req, res)`
 * servers live under `src/node` and delegate to this callback.
 */

import type { Bot } from "./bot.js";
import type { Update } from "../types/index.js";

export interface WebhookOptions {
  /**
   * If set, the `X-Telegram-Bot-Api-Secret-Token` request header must match it,
   * else the callback responds 401. Mirrors `setWebhook`'s `secret_token`.
   */
  secretToken?: string;
}

export function webhookCallback(
  bot: Bot,
  options: WebhookOptions = {},
): (request: Request) => Promise<Response> {
  const { secretToken } = options;

  return async function handle(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    if (secretToken !== undefined) {
      const got = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
      if (got !== secretToken) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    let update: Update;
    try {
      update = (await request.json()) as Update;
    } catch {
      return new Response("Bad Request", { status: 400 });
    }

    await bot.handleUpdate(update);
    return new Response(null, { status: 200 });
  };
}
