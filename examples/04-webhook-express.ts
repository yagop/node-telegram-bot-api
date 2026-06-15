/**
 * 04 - Webhook on Express (or any Connect-style app).
 *
 * `registerExpressWebhook(bot, app, { path, secretToken })` mounts the webhook
 * route on an existing app. The `app` argument is typed STRUCTURALLY in the
 * library, so `express` is never a dependency of this package. Here we keep the
 * example dependency-free by declaring the minimal `app.post(path, handler)`
 * shape - in your own project you'd pass a real `express()` instance instead.
 *
 * Register the webhook with Telegram once at startup:
 *   api.setWebhook({ url: "https://you.example/telegram", secret_token: SECRET })
 *
 * This file is illustrative (needs a running server); it only needs to typecheck.
 */
import { Bot, registerExpressWebhook } from "node-telegram-bot-api";

const token = process.env.BOT_TOKEN!;
const secret = process.env.WEBHOOK_SECRET!;

const bot = new Bot(token);
bot.command("start", (ctx) => ctx.reply("Hello from Express 🚂"));

// Minimal structural stand-in for an Express app. Replace with `express()`:
//   import express from "express";
//   const app = express();
const app: { post(path: string, handler: (req: unknown, res: unknown) => unknown): void } = {
  post(path) {
    console.log(`(stub) registered POST ${path}`);
  },
};

registerExpressWebhook(bot, app, {
  path: "/telegram",
  secretToken: secret,
});

// In a real app: app.listen(3000)
console.log("Webhook route registered at /telegram");
