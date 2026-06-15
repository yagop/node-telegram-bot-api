/**
 * Webhook adapter — a web-standard `(Request) => Promise<Response>` callback.
 *
 * Works anywhere the Fetch API is available (Deno, Bun, Cloudflare Workers,
 * Node via an adapter). Validates method + secret token, parses the JSON body,
 * hands the update to the bot, and answers `200 OK`.
 */

import type { Update } from "../types/v2.js";
import type { Bot } from "./bot.js";

export interface WebhookCallbackOptions {
  secretToken?: string;
}

/** Build a fetch-style handler that feeds incoming updates into `bot`. */
export function webhookCallback(
  bot: Bot,
  options: WebhookCallbackOptions = {},
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    if (options.secretToken !== undefined) {
      const provided = request.headers.get("x-telegram-bot-api-secret-token");
      if (provided !== options.secretToken) {
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
    return new Response("OK");
  };
}
