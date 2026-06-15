/**
 * 03 — Webhook on Cloudflare Workers (or any Web-standard runtime).
 *
 * `webhookCallback(bot)` is a pure `(Request) => Promise<Response>`, so it drops
 * straight into a Workers `export default { fetch }`. We use `fastAck` + the
 * runtime's `ctx.waitUntil` so the worker returns 200 immediately and finishes
 * `handleUpdate` in the background — Telegram never trips its webhook timeout.
 *
 * Because Telegram redelivers un-acked updates (at-least-once), handlers should
 * be idempotent when fast-ack is on. See the note in src/core/webhook.ts.
 *
 * Deploy with wrangler; set the same secret via:
 *   setWebhook({ url, secret_token: SECRET })
 *
 * This file is illustrative (needs a Workers runtime); it only needs to typecheck.
 */
import { Bot, webhookCallback } from "node-telegram-bot-api";

// Minimal structural shapes for the Workers fetch handler — avoids depending on
// `@cloudflare/workers-types`. The real runtime supplies richer objects.
interface Env {
  BOT_TOKEN: string;
  WEBHOOK_SECRET: string;
}
interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const bot = new Bot(env.BOT_TOKEN);
    bot.command("start", (c) => c.reply("Hello from the edge ⚡"));

    const handle = webhookCallback(bot, {
      secretToken: env.WEBHOOK_SECRET,
      // Providing waitUntil implies fast-ack: 200 returns before the handler runs.
      waitUntil: (promise) => ctx.waitUntil(promise),
      fastAck: true,
    });

    return handle(request);
  },
};
