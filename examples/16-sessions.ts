/**
 * 16 - Sessions: durable per-chat state + reply tracking.
 *
 * Opt-in `session()` middleware gives each chat a persistent bag reached through
 * `ctx.getSession<T>()`; the `store` is required, so durability is an explicit
 * choice. Here `FileSessionStorage` (`/node`) persists to disk, so the profile
 * and the edit count survive a restart - stop the process and run it again, the
 * data is still there.
 *
 * The reply flow uses `taggedReplies`: `/start` sends a `force_reply` prompt and
 * tags the sent message with the step its answer belongs to; a single `message`
 * handler reads the tag back with `.match()` and routes name -> email -> done.
 * Nothing lives in process memory between updates (only the store persists), so
 * the same code works under webhooks / serverless too.
 *
 * For a Bun deployment, swap the store for a Bun-native one - e.g.
 * `import { SqliteSessionStorage } from "node-telegram-bot-api/bun"` and
 * `new SqliteSessionStorage({ database: "./sessions.db" })`.
 *
 * Run: BOT_TOKEN=123:abc bun examples/16-sessions.ts
 */
import { Bot, session, taggedReplies } from "node-telegram-bot-api";
import { FileSessionStorage, run } from "node-telegram-bot-api/node";

type Session = {
  name?: string;
  email?: string;
  edits: number; // how many times this chat completed the flow
};

const bot = new Bot(process.env.BOT_TOKEN!);

// One durable session per chat (default key). Swap the store to change backend.
bot.use(
  session<Session>({
    store: new FileSessionStorage({ path: "./.sessions" }),
    initial: () => ({ edits: 0 }),
  }),
);

// `/start` opens the flow: ask for the name, tag its reply as the "name" step.
bot.command("start", async (ctx) => {
  const sent = await ctx.reply("👋 What's your name?", { reply_markup: { force_reply: true } });
  taggedReplies<"name" | "email">(ctx).expect(sent.message_id, "name");
});

// `/me` reads the persisted profile back - proof it survives restarts.
bot.command("me", (ctx) => {
  const { name, email, edits } = ctx.getSession<Session>().data;
  if (name === undefined) return ctx.reply("No profile yet - send /start.");
  return ctx.reply(`Name: ${name}\nEmail: ${email ?? "-"}\nCompleted ${edits}x`);
});

// One handler routes every awaited reply by its tag.
bot.on("message", async (ctx, next) => {
  const step = taggedReplies<"name" | "email">(ctx).match();
  if (step === undefined) return next(); // not a reply we're waiting on

  const text = ctx.message?.text?.trim() ?? "";

  if (step === "name") {
    ctx.getSession<Session>().data.name = text;
    const sent = await ctx.reply("And your email?", { reply_markup: { force_reply: true } });
    taggedReplies<"name" | "email">(ctx).expect(sent.message_id, "email"); // chain the next prompt
    return;
  }

  // step === "email": finish the flow and bump the counter.
  const data = ctx.getSession<Session>().data;
  data.email = text;
  data.edits += 1;
  await ctx.reply(`Thanks ${data.name}! Saved ${data.email}. Send /me to see it, /start to redo.`);
});

await run(bot);
