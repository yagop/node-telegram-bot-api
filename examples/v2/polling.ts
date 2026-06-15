/**
 * Long-polling bot (v2). `bot.start()` pumps the `longPoll` async generator.
 * Shows the Json<T> builders: `fmt()` for entities, `InlineKeyboard` for markup.
 */
import { Bot, InlineKeyboard, fmt } from "node-telegram-bot-api";

const bot = new Bot(process.env.BOT_TOKEN ?? "");

bot.command("start", (ctx) => ctx.reply("Welcome 👋"));

bot.command("menu", (ctx) => {
  const { text, entities } = fmt().plain("Pick ").bold("one").build();
  return ctx.reply(text, {
    entities,
    reply_markup: new InlineKeyboard()
      .text("Option A", "pick:a")
      .row()
      .url("Docs", "https://core.telegram.org/bots/api")
      .build(),
  });
});

bot.on("callback_query", (ctx) => ctx.answerCallbackQuery(`You picked ${ctx.callbackQuery?.data}`));
bot.on("message", (ctx) => ctx.reply(`echo: ${ctx.message?.text ?? "<non-text>"}`));

await bot.start();
