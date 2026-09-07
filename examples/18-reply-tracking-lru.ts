/**
 * 18 - Bounding reply/press tracking with a per-chat LRU.
 *
 * `expectReply` / `expectCallback` stash one marker per message you send, in the
 * session envelope. `ttlSeconds` bounds a marker's *age*, but not the table's
 * *size*: a bot that sends many keyboards a chat never finishes with can still
 * grow the envelope between prunes (see issue #1357 - a real session row reached
 * 38 KB). `replyTracking` on `createSession` puts a hard per-chat cap on it.
 *
 * This bot re-sends a "sticky" inline keyboard on every `/menu`, tracking each
 * one with a marker `callback_data` could not hold (a private, oversized payload).
 * Nobody presses most of them, so without a bound the markers pile up. With it:
 *
 * - `maxEntries` / `maxBytes` cap the tables; over budget, the
 *   **least-recently-used** markers are evicted - recency, not age, so a keyboard
 *   the user is still pressing outlives an older idle one. Pressing a keyboard is
 *   a "use" too (it refreshes recency), not only sending it.
 * - `defaultTtlSeconds` gives every marker a TTL without repeating it per call;
 *   `slidingTtl` re-arms that TTL each time the marker is used, so an actively
 *   used keyboard does not expire mid-conversation.
 *
 * All four fields are optional; drop `replyTracking` entirely and the tables are
 * unbounded, exactly as before. Send `/menu` a dozen times, then `/pending` to
 * watch the count stay pinned at the cap while the newest markers survive.
 *
 * Run: BOT_TOKEN=123:abc bun examples/18-reply-tracking-lru.ts
 */
import { Bot, createSession, expectCallback, matchCallback, MemorySessionStorage } from "node-telegram-bot-api";
import { run } from "node-telegram-bot-api/node";

/** The oversized, private marker each sticky keyboard carries - too big for callback_data. */
type MenuMarker = {
  kind: "sticky-menu";
  openedBy: number;
  openedAt: string;
  note: string; // stand-in for a chunk of state that must not live in callback_data
};

const bot = new Bot(process.env.BOT_TOKEN!);

bot.use(
  createSession({
    store: new MemorySessionStorage(),
    // The whole point of this example: a hard per-chat bound on the press table.
    replyTracking: {
      maxEntries: 5, // at most 5 live markers per chat...
      maxBytes: 4096, // ...and never more than 4 KB serialized, whichever bites first
      defaultTtlSeconds: 3600, // every marker expires after an idle hour...
      slidingTtl: true, // ...but each press pushes that hour out again
    },
  }),
);

const stickyKeyboard = { inline_keyboard: [[{ text: "Ping this menu", callback_data: "ping" }]] };

// Each `/menu` sends a fresh tracked keyboard. Fire it many times: older, un-pressed
// menus are evicted once the chat is over budget, so the envelope cannot balloon.
bot.command("menu", async (ctx) => {
  const sent = await ctx.reply("Sticky menu - press it to keep it alive.", { reply_markup: stickyKeyboard });
  const marker: MenuMarker = {
    kind: "sticky-menu",
    openedBy: ctx.from?.id ?? 0,
    openedAt: new Date().toISOString(),
    note: "x".repeat(256), // pretend this is real per-menu state
  };
  expectCallback(ctx, sent.message_id, marker); // no ttl here -> defaultTtlSeconds applies
});

// A press is a non-consuming match: the keyboard stays live, and matching refreshes
// its recency (and, with slidingTtl, its deadline) - so a busy menu is never the one
// evicted to make room for a new one.
bot.on("callback_query", async (ctx, next) => {
  if (ctx.callbackQuery?.data !== "ping") return next();
  const marker = matchCallback<MenuMarker>(ctx);
  if (!marker) {
    await ctx.answerCallbackQuery({ text: "This menu was evicted or expired - send /menu again.", show_alert: true });
    return;
  }
  await ctx.answerCallbackQuery({ text: `Still alive - opened ${marker.openedAt}` });
});

// Peek at how many markers are currently held for this chat - watch it plateau at 5.
bot.command("pending", (ctx) => {
  const slot = ctx.getSession().ext<{ presses: Record<string, unknown> }>(
    "reply",
    () => ({ replies: {}, presses: {} }),
    (s) => typeof s.presses === "object" && s.presses !== null,
  );
  return ctx.reply(`Tracked menus for this chat: ${Object.keys(slot.presses).length}`);
});

await run(bot, { exitOnError: true });
