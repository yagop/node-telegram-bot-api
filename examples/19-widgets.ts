/**
 * 19 - Widgets: a tiny HTML app inside a message that talks to your bot.
 *
 * `/widget` sends a widget (Bot API 10.4) with a counter and a button. The page
 * runs inside the Telegram client and reaches the bot through the
 * `TelegramWidget` global:
 *
 * - `TelegramWidget.request(data)` sends a `widget_query` update to the bot. The
 *   bot replies with `answerWidgetQuery`, and its `data` comes back to the page as
 *   `answer.result`. Telegram only allows a request from inside a tap handler (or
 *   as a background request while the widget is on screen) and needs an answer
 *   within 15 seconds.
 * - `chat_data` is state the bot owns and the page can only read. The bot changes
 *   it with `editMessageWidgetData`, and the page redraws on `chatDataChanged`.
 *
 * Telegram allows widgets in private chats, so send `/widget` to the bot directly.
 *
 * Run: BOT_TOKEN=123:abc bun examples/19-widgets.ts
 */
import { Bot } from "node-telegram-bot-api";
import { run } from "node-telegram-bot-api/node";

const bot = new Bot(process.env.BOT_TOKEN!);

/** The page: shows the bot-owned tap count and asks the bot to bump it. */
const html = `<div style="font: 16px sans-serif; padding: 12px">
  <p>Taps so far: <b id="count">0</b></p>
  <p id="reply"></p>
  <button id="tap">Tap me</button>
  <script>
    const W = window.TelegramWidget;
    const render = () => { document.getElementById("count").textContent = W.chatData ?? "0"; };
    W.onEvent("chatDataChanged", render);
    render();

    document.getElementById("tap").addEventListener("click", () => {
      // Call request() directly in the tap handler: a later call is refused.
      W.request("tap").then(
        (answer) => { document.getElementById("reply").textContent = answer.result; },
        (err) => { document.getElementById("reply").textContent = "error: " + err.code; },
      );
    });
  </script>
</div>`;

bot.command("widget", async (ctx) => {
  if (!ctx.chat) return;
  await ctx.api.sendWidget({
    chat_id: ctx.chat.id,
    html,
    height: 180,
    chat_data: "0",
    allow_queries: true, // without this, request() is refused
  });
});

bot.on("widget_query", async (ctx) => {
  // `bot.on` does not narrow the update type, so check for the field.
  if (!("widget_query" in ctx.update)) return;
  const query = ctx.update.widget_query;

  // Answer within 15s; `data` (up to 1024 bytes) is what request() resolves with.
  await ctx.api.answerWidgetQuery({
    widget_query_id: query.id,
    data: `Thanks, ${ctx.from?.first_name ?? "friend"}!`,
  });

  // Bump the count. The page cannot write chat_data; only the bot can.
  if (query.data === "tap" && query.chat && query.message_id !== undefined) {
    const key = `${query.chat.id}:${query.message_id}`;
    const taps = (counts.get(key) ?? 0) + 1;
    counts.set(key, taps);
    await ctx.api.editMessageWidgetData({
      chat_id: query.chat.id,
      message_id: query.message_id,
      chat_data: String(taps),
    });
  }
});

/** Tap counts per widget message. In memory for brevity; a real bot would persist them. */
const counts = new Map<string, number>();

await run(bot, { exitOnError: true });
