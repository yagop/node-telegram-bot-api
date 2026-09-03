/**
 * 17 - Button presses: `callback_data` vs. a session-backed marker.
 *
 * Two ways to route an inline-keyboard press, side by side, so the trade-off is
 * concrete:
 *
 * 1. `/page` pages through a list using **`callback_data` alone** - the 64 bytes
 *    Telegram round-trips for you. No session, no store, and the state (which
 *    page) lives in the button itself, so it survives anything. This is the
 *    idiomatic default; reach for it first.
 *
 * 2. `/delete` asks for confirmation using a **session marker**, which
 *    `callback_data` cannot do here: the payload is bigger than 64 bytes, it
 *    names things the user should not see (callback_data is plain text in the
 *    client, readable by anyone who can inspect the message), and the button
 *    must fire exactly once - a double tap or a press on a stale message must
 *    not run the deletion twice. `matchCallback(ctx, { once: true })` consumes
 *    the marker, so the second press finds nothing.
 *
 * Both handlers answer the callback query: until you do, the client shows a
 * spinner on the button.
 *
 * Run: BOT_TOKEN=123:abc bun examples/17-callback-tracking.ts
 */
import {
  Bot,
  createSession,
  expectCallback,
  MemorySessionStorage,
  matchCallback,
  type InlineKeyboardMarkup,
} from "node-telegram-bot-api";
import { run } from "node-telegram-bot-api/node";

const FRUITS = ["apple", "banana", "cherry", "date", "elderberry", "fig"];
const PAGE_SIZE = 2;

/** What `/delete` stashes in the session - far past 64 bytes, and none of it public. */
type PendingDelete = {
  op: "purge";
  reason: string;
  targets: string[];
  requestedAt: string;
};

const bot = new Bot(process.env.BOT_TOKEN!);

// Memory is fine here: this example is a single long-polling process. Swap in
// FileSessionStorage (/node) or a Bun store to survive a restart.
bot.use(createSession({ store: new MemorySessionStorage() }));

/** Pager keyboard: the page number rides in `callback_data`, nowhere else. */
function pageKeyboard(page: number): InlineKeyboardMarkup {
  const last = Math.ceil(FRUITS.length / PAGE_SIZE) - 1;
  return {
    inline_keyboard: [
      [
        ...(page > 0 ? [{ text: "< Prev", callback_data: `page:${page - 1}` }] : []),
        ...(page < last ? [{ text: "Next >", callback_data: `page:${page + 1}` }] : []),
      ],
    ],
  };
}

function pageText(page: number): string {
  return FRUITS.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).join("\n");
}

// 1) Stateless paging - the button carries everything the handler needs.
bot.command("page", (ctx) => ctx.reply(pageText(0), { reply_markup: pageKeyboard(0) }));

bot.on("callback_query", async (ctx, next) => {
  const match = /^page:(\d+)$/.exec(ctx.callbackQuery?.data ?? "");
  if (!match) return next();

  const page = Number(match[1]);
  const message = ctx.callbackQuery?.message;
  if (message) {
    await ctx.api.editMessageText({
      chat_id: message.chat.id,
      message_id: message.message_id,
      text: pageText(page),
      reply_markup: pageKeyboard(page),
    });
  }
  // The keyboard stays live: press again and this handler runs again.
  await ctx.answerCallbackQuery();
});

// 2) A one-shot, private, oversized marker - what callback_data cannot carry.
bot.command("delete", async (ctx) => {
  const sent = await ctx.reply("Delete all your data? This cannot be undone.", {
    reply_markup: { inline_keyboard: [[{ text: "Yes, delete", callback_data: "confirm" }]] },
  });

  const pending: PendingDelete = {
    op: "purge",
    reason: "user asked via /delete",
    targets: ["profile", "messages", "attachments", "audit-log"],
    requestedAt: new Date().toISOString(),
  };
  expectCallback(ctx, sent.message_id, pending);
});

bot.on("callback_query", async (ctx, next) => {
  // `once` consumes the marker, so a double tap (or a press on an older
  // confirmation message) finds nothing and falls through.
  const hit = matchCallback<PendingDelete>(ctx, { once: true });
  if (!hit) {
    if (ctx.callbackQuery?.data === "confirm") {
      await ctx.answerCallbackQuery({ text: "That confirmation has expired.", show_alert: true });
      return;
    }
    return next();
  }

  await ctx.answerCallbackQuery({ text: "Deleting..." });
  await ctx.reply(`Ran ${hit.op} on ${hit.targets.join(", ")} (asked at ${hit.requestedAt}).`);
});

await run(bot);
