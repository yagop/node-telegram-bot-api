/**
 * 12 - Mission control: name your spaceship, pick a destination, and launch.
 *
 * Each union member defines the data available at that step. Picking a
 * destination requires a ship name; launch requires both. Switching
 * on `step` narrows the type, so handlers need no casts or optional fields.
 * These are compile-time checks, not validation of user input or stored data.
 *
 * Sessions save each transition after the handler. MemorySessionStorage loses
 * state on restart; see 16-sessions.ts for durable storage. The default key is
 * per chat, so group members share one conversation. Try this in a private chat.
 *
 * Run: BOT_TOKEN=123:abc bun examples/12-conversation.ts
 */
import { Bot, createSession, MemorySessionStorage } from "node-telegram-bot-api";
import { run } from "node-telegram-bot-api/node";

const bot = new Bot(process.env.BOT_TOKEN!);

type Mission =
  | { step: "idle" }
  | { step: "ship_name" }
  | { step: "destination"; ship: string }
  | { step: "launched"; ship: string; destination: string };

const session = createSession<Mission>({
  store: new MemorySessionStorage(),
  initial: () => ({ step: "idle" }),
});
bot.use(session);

// `/start` kicks off the flow.
bot.command("start", (ctx) => {
  session.get(ctx).data = { step: "ship_name" };
  return ctx.reply("🧑‍🚀 Welcome to mission control, Captain. Your spaceship needs a name!");
});

// `/cancel` resets at any point.
bot.command("cancel", (ctx) => {
  session.get(ctx).delete();
  return ctx.reply("🍕 Mission cancelled. The crew has gone for pizza. Send /start for a new mission.");
});

// Drive the steps from plain text messages (skip slash-commands, handled above).
bot.on("message", (ctx) => {
  const text = ctx.message?.text?.trim();
  if (!text || text.startsWith("/")) return;

  const handle = session.get(ctx);
  const state = handle.data;

  switch (state.step) {
    case "ship_name":
      handle.data = { step: "destination", ship: text };
      return ctx.reply(`🍿 ${text} is fuelled and stocked with snacks. Where are we going? 🪐 Pick any planet, real or invented.`);
    case "destination":
      // TypeScript knows state.ship exists here.
      handle.data = { step: "launched", ship: state.ship, destination: text };
      return ctx.reply(`🚀 3... 2... 1... Liftoff! ${state.ship} is headed for ${text}. 🐈 The ship's cat has claimed the captain's chair.`);
    case "launched":
      return ctx.reply(`🌌 ${state.ship} is cruising toward ${state.destination}. Send /start for a new mission.`);
    case "idle":
      return ctx.reply("🛰️ The launchpad is empty. Send /start to build your mission.");
  }
});

await bot.api.setMyCommands({
  commands: [
    { command: "start", description: "Start a mission 🚀" },
    { command: "cancel", description: "Cancel the mission 🍕" },
  ],
});

await run(bot, { exitOnError: true });
