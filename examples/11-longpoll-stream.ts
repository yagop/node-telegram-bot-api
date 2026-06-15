/**
 * 11 — Consuming the long-poll stream directly.
 *
 * `longPoll(api, options, signal)` is a plain `AsyncGenerator<Update>`, so you can
 * `for await` it, filter it, or fan it out — no `Bot` required. This is handy when
 * you want full control over the loop. Cancellation is just an `AbortController`:
 * abort the signal and the generator returns cleanly.
 *
 * Here we consume updates for a few seconds, filter to text messages, print them,
 * and stop via the controller (also stops after N messages, as a second exit).
 *
 * Run: BOT_TOKEN=123:abc bun examples/11-longpoll-stream.ts
 */
import { Api, longPoll } from "node-telegram-bot-api";

const api = new Api(process.env.BOT_TOKEN!);

const controller = new AbortController();

// Stop after 15 seconds no matter what.
const timer = setTimeout(() => controller.abort(), 15_000);

let seen = 0;
const MAX = 10;

console.log("Listening for up to 15s (or 10 messages)…");

for await (const update of longPoll(
  api,
  { timeout: 30, allowedUpdates: ["message"] },
  controller.signal,
)) {
  // Only react to text messages; ignore everything else.
  if (!("message" in update) || update.message.text === undefined) continue;

  const { text, from } = update.message;
  console.log(`[${from?.username ?? from?.first_name ?? "?"}] ${text}`);

  seen += 1;
  if (seen >= MAX) {
    controller.abort(); // second exit condition — the loop returns cleanly
    break;
  }
}

clearTimeout(timer);
console.log(`Done — processed ${seen} message(s).`);
