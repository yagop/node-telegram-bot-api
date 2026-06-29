/**
 * 02 - Raw API client.
 *
 * Demonstrates the low-level `Api` with no dispatch layer: construct it with a
 * token, call generated methods (`getMe`, `sendMessage`) directly, and read the
 * typed results. Useful for one-off scripts, cron jobs, or admin tooling.
 *
 * Run: BOT_TOKEN=123:abc CHAT_ID=12345 bun examples/02-api-client.ts
 */
import { Api } from "node-telegram-bot-api";

const token = process.env.BOT_TOKEN!;
// The chat to send to (your own user id, or a group id). Defaults to a placeholder.
const chatId = Number(process.env.CHAT_ID ?? "0");

const api = new Api(token);

// `getMe()` returns the bot's own User record.
const me = await api.getMe();
console.log(`Authorized as @${me.username} (id ${me.id})`);

if (chatId !== 0) {
  // `sendMessage` returns the sent Message; `message_id` is on the result.
  const sent = await api.sendMessage({
    chat_id: chatId,
    text: `Hello from ${me.first_name} 👋`,
  });
  console.log(`Sent message ${sent.message_id} to chat ${chatId}`);
} else {
  console.log("Set CHAT_ID to also send a test message.");
}
