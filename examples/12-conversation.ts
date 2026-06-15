/**
 * 12 — A minimal multi-step conversation.
 *
 * Walks a user through "ask name → ask age → done" by tracking a per-chat step in
 * a `Map`. There's no built-in conversation engine — just middleware + your own
 * state — which keeps the model transparent. `ctx.state` is used to stash the
 * current step for the handler within a single update; the `Map` persists it
 * across updates.
 *
 * Run: BOT_TOKEN=123:abc bun examples/12-conversation.ts
 */
import { Bot } from "node-telegram-bot-api";
import { run } from "node-telegram-bot-api/node";

const bot = new Bot(process.env.BOT_TOKEN!);

type Step = "idle" | "awaiting_name" | "awaiting_age";

interface Convo {
  step: Step;
  name?: string;
}

// Per-chat conversation state, persisted across updates.
const convos = new Map<number, Convo>();

// Load the conversation for this chat onto `ctx.state` before handlers run.
bot.use((ctx, next) => {
  const id = ctx.chatId;
  if (id === undefined) return next();
  const convo = convos.get(id) ?? { step: "idle" };
  convos.set(id, convo);
  ctx.state.convo = convo;
  return next();
});

// `/start` kicks off the flow.
bot.command("start", (ctx) => {
  const convo = ctx.state.convo as Convo;
  convo.step = "awaiting_name";
  return ctx.reply("👋 What's your name?");
});

// `/cancel` resets at any point.
bot.command("cancel", (ctx) => {
  const convo = ctx.state.convo as Convo;
  convo.step = "idle";
  convo.name = undefined;
  return ctx.reply("Cancelled.");
});

// Drive the steps from plain text messages (skip slash-commands, handled above).
bot.on("message", (ctx) => {
  const convo = ctx.state.convo as Convo;
  const text = ctx.message?.text;
  if (text === undefined || text.startsWith("/")) return;

  switch (convo.step) {
    case "awaiting_name": {
      convo.name = text.trim();
      convo.step = "awaiting_age";
      return ctx.reply(`Nice to meet you, ${convo.name}! How old are you?`);
    }
    case "awaiting_age": {
      const age = Number(text.trim());
      if (!Number.isInteger(age) || age <= 0) {
        return ctx.reply("That doesn't look like an age — try a whole number.");
      }
      convo.step = "idle";
      return ctx.reply(`Got it: ${convo.name}, ${age}. Thanks! Send /start to go again.`);
    }
    default:
      return ctx.reply("Send /start to begin.");
  }
});

await run(bot);
