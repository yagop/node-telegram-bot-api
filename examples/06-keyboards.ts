/**
 * 06 - Keyboards & callback queries.
 *
 * Demonstrates the markup builders - `InlineKeyboard`, `ReplyKeyboard`,
 * `removeKeyboard()`, `forceReply()` - and handling a `callback_query` with
 * `ctx.answerCallbackQuery()`. Each builder's `.build()` returns the plain
 * `*Markup` object that drops straight into `reply_markup`.
 *
 * Run: BOT_TOKEN=123:abc bun examples/06-keyboards.ts
 */
import {
  Bot,
  InlineKeyboard,
  ReplyKeyboard,
  removeKeyboard,
  forceReply,
} from "node-telegram-bot-api";
import { run } from "node-telegram-bot-api/node";

const bot = new Bot(process.env.BOT_TOKEN!);

// Inline keyboard: callback buttons + a URL button, laid out over two rows.
bot.command("menu", (ctx) => {
  const kb = new InlineKeyboard()
    .text("👍 Like", "vote:up")
    .text("👎 Dislike", "vote:down")
    .row()
    .url("Open docs", "https://core.telegram.org/bots/api");
  return ctx.reply("How do you feel about this bot?", { reply_markup: kb.build() });
});

// Reply keyboard: a custom keyboard with quick-reply buttons + a contact request.
bot.command("keyboard", (ctx) => {
  const kb = new ReplyKeyboard()
    .text("🍕 Pizza")
    .text("🍔 Burger")
    .row()
    .requestContact("📞 Share contact");
  return ctx.reply("Pick something:", {
    reply_markup: kb.build({ resize_keyboard: true, one_time_keyboard: true }),
  });
});

// Remove the custom keyboard.
bot.command("hide", (ctx) =>
  ctx.reply("Keyboard hidden.", { reply_markup: removeKeyboard() }),
);

// Force a reply (the client opens the input box pre-focused with a reply target).
bot.command("ask", (ctx) =>
  ctx.reply("What's your favorite color?", {
    reply_markup: forceReply({ input_field_placeholder: "e.g. teal" }),
  }),
);

// Handle taps on the inline buttons. The button's `callback_data` is on the query.
bot.on("callback_query", async (ctx) => {
  const data = ctx.callbackQuery?.data;
  // Always answer the callback query, even if just to dismiss the spinner.
  await ctx.answerCallbackQuery({ text: data === "vote:up" ? "Thanks! 🎉" : "Noted." });
  if (data) await ctx.reply(`You pressed: ${data}`);
});

await run(bot);
