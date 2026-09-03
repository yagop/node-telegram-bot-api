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
 *    must fire at most once.
 *
 * Three things the "one-shot button" needs beyond `{ once: true }`, all of them
 * easy to get wrong:
 *
 * - `{ once: true }` only consumes the marker of *that* message. Run `/delete`
 *   twice and the older confirmation is still armed, so this example forgets the
 *   previous one first - one outstanding confirmation per chat.
 * - The default session key is per **chat**, so in a group any member can press
 *   your button. The marker carries the requester's id and the handler checks it.
 * - The marker is consumed *before* the work runs, and the session flush persists
 *   that even if the handler throws - so this is "at most once", not "exactly
 *   once". A failure loses the confirmation; the user runs `/delete` again.
 *
 * Run: BOT_TOKEN=123:abc bun examples/17-callback-tracking.ts
 */
import {
  Bot,
  createSession,
  expectCallback,
  forgetCallback,
  type InlineKeyboardMarkup,
  matchCallback,
  MemorySessionStorage,
  TelegramApiError,
} from "node-telegram-bot-api";
import { run } from "node-telegram-bot-api/node";

const FRUITS = ["apple", "banana", "cherry", "date", "elderberry", "fig"];
const PAGE_SIZE = 2;

/** What `/delete` stashes in the session - far past 64 bytes, and none of it public. */
type PendingDelete = {
  op: "purge";
  reason: string;
  targets: string[];
  requestedBy: number; // only this user may confirm
  requestedAt: string;
};

/** The session bag: which confirmation (if any) is currently armed for this chat. */
type Session = { pendingConfirmationId?: number };

const bot = new Bot(process.env.BOT_TOKEN!);

// Memory is fine here: this example is a single long-polling process. Swap in
// FileSessionStorage (/node) or a Bun store to survive a restart.
bot.use(createSession<Session>({ store: new MemorySessionStorage(), initial: () => ({}) }));

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

  // Answer first: two quick taps send the same page, so the second edit below is
  // a no-op that Telegram rejects with 400 "message is not modified". Answering
  // afterwards would leave the button spinning until the query expires.
  await ctx.answerCallbackQuery();

  const page = Number(match[1]);
  const message = ctx.callbackQuery?.message;
  if (!message) return; // inline-mode message: nothing to edit

  try {
    await ctx.api.editMessageText({
      chat_id: message.chat.id,
      message_id: message.message_id,
      text: pageText(page),
      reply_markup: pageKeyboard(page),
    });
  } catch (err) {
    // The identical-edit race above; any other API error is a real problem.
    if (!(err instanceof TelegramApiError && err.description.includes("message is not modified"))) throw err;
  }
  // The keyboard stays live: press again and this handler runs again.
});

// 2) A one-shot, private, oversized marker - what callback_data cannot carry.
bot.command("delete", async (ctx) => {
  const session = ctx.getSession<Session>();

  // Disarm the previous confirmation, so only the newest one can act. Without
  // this, `/delete` twice would leave two armed buttons and each would purge.
  const previous = session.data.pendingConfirmationId;
  if (previous !== undefined) forgetCallback(ctx, previous);

  const sent = await ctx.reply("Delete all your data? This cannot be undone.", {
    reply_markup: { inline_keyboard: [[{ text: "Yes, delete", callback_data: "confirm" }]] },
  });

  const pending: PendingDelete = {
    op: "purge",
    reason: "user asked via /delete",
    targets: ["profile", "messages", "attachments", "audit-log"],
    requestedBy: ctx.from?.id ?? 0,
    requestedAt: new Date().toISOString(),
  };
  // A confirmation that sits unanswered for an hour is stale; the TTL keeps the
  // session from carrying it (and every other abandoned one) forever.
  expectCallback(ctx, sent.message_id, pending, { ttlSeconds: 3600 });
  session.data.pendingConfirmationId = sent.message_id;
});

bot.on("callback_query", async (ctx, next) => {
  // Peek without consuming: the requester check comes first, so a bystander's
  // press in a group cannot burn the marker.
  const pending = matchCallback<PendingDelete>(ctx);
  if (!pending) {
    if (ctx.callbackQuery?.data === "confirm") {
      await ctx.answerCallbackQuery({ text: "That confirmation has expired.", show_alert: true });
      return;
    }
    return next();
  }

  if (ctx.from?.id !== pending.requestedBy) {
    await ctx.answerCallbackQuery({ text: "Only the person who ran /delete can confirm.", show_alert: true });
    return;
  }

  // Now consume it: a second tap on this message finds nothing.
  matchCallback(ctx, { once: true });
  ctx.getSession<Session>().data.pendingConfirmationId = undefined;

  await ctx.answerCallbackQuery({ text: "Deleting..." });
  await ctx.reply(`Ran ${pending.op} on ${pending.targets.join(", ")} (asked at ${pending.requestedAt}).`);
});

await run(bot);
