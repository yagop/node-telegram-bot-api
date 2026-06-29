/**
 * 01 - Polling bot.
 *
 * Demonstrates the high-level `Bot`: `command()`, `hears()`, `on()`, `ctx.reply()`,
 * and the managed `run()` long-poll runner from the `/node` subpath (it installs
 * SIGINT/SIGTERM handlers so Ctrl-C shuts the loop down cleanly).
 *
 * Run: BOT_TOKEN=123:abc bun examples/01-polling-bot.ts
 */
import { Bot } from "node-telegram-bot-api";
import { run } from "node-telegram-bot-api/node";

// Non-null assertion: this example requires the token to be set in the env.
const token = process.env.BOT_TOKEN!;

const bot = new Bot(token);

// `/start` and `/help` share one handler. `ctx.match` is the trimmed args string.
bot.command(["start", "help"], (ctx) => ctx.reply("Hi! Send me anything and I'll echo it."));

// `/echo something` → replies "something". `ctx.match` holds the args after the command.
bot.command("echo", (ctx) => {
  const args = (ctx.match as string) || "(nothing to echo)";
  return ctx.reply(args);
});

// Exact-string trigger.
bot.hears("ping", (ctx) => ctx.reply("pong"));

// RegExp trigger: `ctx.match` becomes the RegExpMatchArray, so capture groups are available.
bot.hears(/^roll (\d+)$/, (ctx) => {
  const m = ctx.match as RegExpMatchArray;
  const sides = Number(m[1]);
  const value = 1 + Math.floor(Math.random() * sides);
  return ctx.reply(`🎲 ${value}`);
});

// Fallback: any other text message gets echoed.
bot.on("message", (ctx) => {
  const text = ctx.message?.text;
  if (text) return ctx.reply(text);
});

// Error boundary: anything thrown by the chain lands here instead of crashing the loop.
bot.catch((err, ctx) => {
  console.error(`update for chat ${ctx.chatId} failed:`, err);
});

// `run()` resolves when the process receives SIGINT/SIGTERM and the loop drains.
await run(bot);
