/**
 * 09 — Middleware: timing, sessions, and an auth gate.
 *
 * `bot.use(mw)` registers middleware that runs on every update; `command/hears/on`
 * are themselves filter middleware, so everything interleaves in registration
 * order (koa-compose semantics). A middleware may `await next()` to wrap the rest
 * of the chain — that's how timing, sessions, and auth compose.
 *
 * Run: BOT_TOKEN=123:abc ALLOWED_USERS=111,222 bun examples/09-middleware.ts
 */
import { Bot } from "node-telegram-bot-api";
import { run } from "node-telegram-bot-api/node";

const bot = new Bot(process.env.BOT_TOKEN!);

// An allowlist of user ids permitted to use the bot.
const allowed = new Set(
  (process.env.ALLOWED_USERS ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n !== 0),
);

// A trivial in-memory session store keyed by chat id.
interface Session {
  count: number;
}
const sessions = new Map<number, Session>();

// 1) Timing — wraps the whole chain by awaiting `next()` then logging the delta.
bot.use(async (ctx, next) => {
  const started = Date.now();
  await next();
  console.log(`update ${ctx.update.update_id} handled in ${Date.now() - started}ms`);
});

// 2) Session — load before, persist after. Attached to `ctx.state` for handlers.
bot.use(async (ctx, next) => {
  const id = ctx.chatId;
  if (id === undefined) return next();
  const session = sessions.get(id) ?? { count: 0 };
  ctx.state.session = session;
  await next();
  sessions.set(id, session);
});

// 3) Auth gate — runs only when an allowlist is configured. Blocks everyone else.
bot.use((ctx, next) => {
  if (allowed.size === 0) return next(); // open mode when no allowlist set
  const userId = ctx.from?.id;
  if (userId !== undefined && allowed.has(userId)) return next();
  return ctx.reply("⛔ You're not on the allowlist.");
});

// Handler — reads/writes the per-chat session placed on `ctx.state`.
bot.on("message", (ctx) => {
  const session = ctx.state.session as Session | undefined;
  if (!session) return;
  session.count += 1;
  return ctx.reply(`You've sent ${session.count} message(s) this session.`);
});

await run(bot);
