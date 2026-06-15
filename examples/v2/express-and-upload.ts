/**
 * Mount the bot on an existing Express app, and upload a file from disk.
 * `registerExpressWebhook` is in core (web-standard); `fromPath` is the only
 * Node-only piece and comes from the `/node` subpath.
 */
import express from "express";
import { Bot, registerExpressWebhook } from "node-telegram-bot-api";
import { fromPath } from "node-telegram-bot-api/node";

const bot = new Bot(process.env.BOT_TOKEN ?? "");

bot.command("cat", async (ctx) => {
  await ctx.replyWithPhoto(await fromPath("./cat.jpg"), { caption: "🐈" });
});
bot.on("message", (ctx) => ctx.reply("hello from express"));

const app = express();
app.use(express.json());
registerExpressWebhook(bot, app, { path: "/telegram", secretToken: process.env.WEBHOOK_SECRET ?? "" });
app.listen(3000, () => console.log("listening on :3000/telegram"));
