/**
 * Cloudflare Worker (v2) — also Deno Deploy / Vercel Edge / Bun.serve.
 * No node:http, no fs, no polling loop: just the web-standard core + the
 * `(Request) => Response` webhook callback.
 */
import { Bot, webhookCallback } from "node-telegram-bot-api";

interface Env {
  BOT_TOKEN: string;
  WEBHOOK_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const bot = new Bot(env.BOT_TOKEN);
    bot.command("start", (ctx) => ctx.reply("Hello from the edge ⚡"));
    bot.on("message", (ctx) => ctx.reply(`edge echo: ${ctx.message?.text ?? ""}`));
    return webhookCallback(bot, { secretToken: env.WEBHOOK_SECRET })(request);
  },
};
