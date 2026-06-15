/**
 * 05 — Webhook on the Next.js App Router.
 *
 * The App Router speaks Web `Request`/`Response` natively, so `nextAppWebhook(bot)`
 * is the core callback verbatim. In a real project this file would live at
 * `app/api/telegram/route.ts` and you'd just export the handler as `POST`.
 *
 * Register with Telegram once:
 *   api.setWebhook({ url: "https://you.example/api/telegram", secret_token: SECRET })
 *
 * This file is illustrative (needs Next.js); it only needs to typecheck.
 */
import { Bot, nextAppWebhook } from "node-telegram-bot-api";

const token = process.env.BOT_TOKEN!;
const secret = process.env.WEBHOOK_SECRET!;

const bot = new Bot(token);
bot.command("start", (ctx) => ctx.reply("Hello from Next.js ▲"));

// app/api/telegram/route.ts — App Router route handler:
export const POST = nextAppWebhook(bot, { secretToken: secret });
