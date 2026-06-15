/**
 * 10 - Resilience: retries, rate limiting, and error branching.
 *
 * The transport retries transient failures (network, timeout, 5xx, and 429 with
 * `retry_after`) automatically - tune with `maxRetries` / `retryBackoffMs`.
 * Opt-in proactive rate limiting (`rateLimit: { global, perChat }`) paces sends
 * so you stay under Telegram's flood limits before a 429 ever happens.
 *
 * When something still fails, errors are structured: branch on
 * `TelegramApiError.errorCode` (e.g. 429) or `instanceof NetworkError`, never on
 * substring-matching a message.
 *
 * Run: BOT_TOKEN=123:abc CHAT_ID=12345 bun examples/10-resilience-ratelimit.ts
 */
import { Api, TelegramApiError, NetworkError } from "node-telegram-bot-api";

const api = new Api(process.env.BOT_TOKEN!, {
  maxRetries: 5, // up to 5 retries on transient failures (default 2)
  retryBackoffMs: 500, // base delay for exponential backoff (default 300)
  rateLimit: {
    global: 25, // ≤ 25 requests/second across all chats
    perChat: 1, // ≤ 1 request/second to any single chat
  },
});

const chatId = Number(process.env.CHAT_ID ?? "0");

async function notify(text: string): Promise<void> {
  try {
    await api.sendMessage({ chat_id: chatId, text });
  } catch (err) {
    if (err instanceof TelegramApiError && err.errorCode === 429) {
      // Flood control: Telegram told us how long to wait.
      console.warn(`Rate limited; retry after ${err.retryAfter ?? "?"}s`);
    } else if (err instanceof TelegramApiError && err.errorCode === 403) {
      // The user blocked the bot, or it was kicked from the chat.
      console.warn("Forbidden - the bot can't message this chat.");
    } else if (err instanceof NetworkError) {
      // DNS, connection reset, fetch threw - already retried up to maxRetries.
      console.error("Network failure after retries:", err.message);
    } else {
      throw err; // anything else is unexpected - let it surface
    }
  }
}

if (chatId !== 0) {
  // Fire several sends; the rate limiter paces them automatically.
  for (let i = 1; i <= 5; i++) {
    await notify(`Message ${i}/5`);
  }
  console.log("Done.");
} else {
  console.log("Set CHAT_ID to exercise the sender.");
}
