/**
 * 20 - Ephemeral replies: answer a button press so only the presser sees it.
 *
 * `/stats` posts one message with a "Show my stats" button. Each person who
 * presses it gets a reply marked "Only visible to you" - in a group, every
 * member sees their own stats and nobody else's.
 *
 * Since Bot API 10.4, `ephemeral_message_parameters.callback_query_id` alone is
 * enough: no `chat_id`, Telegram sends the reply to the chat the button is in.
 * The types enforce the rule - a send without `chat_id` only compiles when it is
 * an ephemeral reply to a callback query:
 *
 *   ctx.api.sendMessage({ text: "hi" }); // type error: chat_id is required
 *
 * The bot must still answer the callback query (`answerCallbackQuery`), or the
 * button keeps spinning until it times out.
 *
 * Run: BOT_TOKEN=123:abc bun examples/20-ephemeral-replies.ts
 */
import { Bot } from "node-telegram-bot-api";
import { run } from "node-telegram-bot-api/node";

const bot = new Bot(process.env.BOT_TOKEN!);

/** Messages seen per user. In memory for brevity; a real bot would persist them. */
const messagesSeen = new Map<number, number>();

bot.on("message", async (ctx, next) => {
  const userId = ctx.from?.id;
  if (userId !== undefined) messagesSeen.set(userId, (messagesSeen.get(userId) ?? 0) + 1);
  await next();
});

bot.command("stats", (ctx) =>
  ctx.reply("Press to see your stats (only you will see them).", {
    reply_markup: { inline_keyboard: [[{ text: "Show my stats", callback_data: "stats" }]] },
  })
);

bot.on("callback_query", async (ctx, next) => {
  const query = ctx.callbackQuery;
  if (query?.data !== "stats") return next();

  await ctx.api.sendMessage({
    text: `${query.from.first_name}, I have seen ${messagesSeen.get(query.from.id) ?? 0} messages from you.`,
    ephemeral_message_parameters: { callback_query_id: query.id },
  });
  await ctx.answerCallbackQuery();
});

await run(bot, { exitOnError: true });
