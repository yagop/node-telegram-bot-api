<h1 align="center">✨ A Modern Telegram Bot API Library ✨</h1>

<div align=center>

[![Bot API](https://img.shields.io/badge/Bot%20API-v.10.1-00aced.svg?style=flat-square&logo=telegram)](https://core.telegram.org/bots/api)
[![npm package](https://img.shields.io/npm/v/node-telegram-bot-api?logo=npm&style=flat-square)](https://www.npmjs.org/package/node-telegram-bot-api)

[![https://telegram.me/node_telegram_bot_api](https://img.shields.io/badge/💬%20Telegram-Channel-blue.svg?style=flat-square)](https://telegram.me/node_telegram_bot_api)
[![https://t.me/+_IC8j_b1wSFlZTVk](https://img.shields.io/badge/💬%20Telegram-Group-blue.svg?style=flat-square)](https://t.me/+_IC8j_b1wSFlZTVk)
[![https://telegram.me/Yago_Perez](https://img.shields.io/badge/💬%20Telegram-Yago_Perez-blue.svg?style=flat-square)](https://telegram.me/Yago_Perez)

</div>

> **v2 is a from-scratch redesign, no v1 compatibility.** Coming from v1? See [`redesign/MIGRATION.md`](./redesign/MIGRATION.md); design rationale in [`redesign/ARCHITECTURE.md`](./redesign/ARCHITECTURE.md).

## 📦 Install

```sh
npm install node-telegram-bot-api
```

> **Runs on **Bun, modern Node.js, Deno, Cloudflare Workers and Vercel Functions λ**

## 🚀 Usage

```ts
import { Bot, InlineKeyboardBuilder } from "node-telegram-bot-api";
import { run } from "node-telegram-bot-api/node"; // managed runner: wires Ctrl-C to bot.stop()

const bot = new Bot(process.env.BOT_TOKEN!);

// commands, regex and update types are all middleware - registration order wins
bot.command("start", (ctx) => ctx.reply("Hi! Send me anything."));
bot.hears(/echo (.+)/, (ctx) => ctx.reply(ctx.match![1]!));

bot.on("message", (ctx) =>
  ctx.reply("Pick one:", {
    reply_markup: new InlineKeyboardBuilder()
      .text("👍", "up")
      .text("👎", "down")
      .build(),
  }),
);

// 🔘 a tapped inline button comes back as a callback_query
bot.on("callback_query", async (ctx) => {
  await ctx.answerCallbackQuery({ text: `You tapped ${ctx.callbackQuery!.data}` });
});

await run(bot); // core-only alternative that runs anywhere: await bot.startPolling()
```

## 📡 Calling the API directly

`Api` mirrors the wire API 1:1 - one method per Bot API method, each taking a single params object.

```ts
import { Api } from "node-telegram-bot-api";

const api = new Api(process.env.BOT_TOKEN!);
const me = await api.getMe();
await api.sendMessage({ chat_id: 12345, text: "hello" });
// the same client is also on bot.api and ctx.api
```

## 🧩 Middleware

koa-style middleware around every update; `on`/`command`/`hears` are filters in the same chain. Wrap downstream work with `await next()`.

```ts
// ⏱️ time every update - and catch anything thrown downstream
bot.use(async (ctx, next) => {
  const start = Date.now();
  try {
    await next();
  } finally {
    console.log(`update took ${Date.now() - start}ms`);
  }
});

// 🧯 last-resort error handler
bot.catch((err, ctx) => console.error("handler failed", err));
```

## ⌨️ Keyboards & formatting

Structured fields are plain typed objects - pass a literal or use a fluent builder; the pipeline serializes either.

```ts
import { InlineKeyboardBuilder, ReplyKeyboardBuilder, EntityBuilder } from "node-telegram-bot-api";

// 🎛️ inline keyboard as reply_markup
await api.sendMessage({
  chat_id,
  text: "Choose:",
  reply_markup: new InlineKeyboardBuilder()
    .text("A", "a")
    .url("Docs", "https://core.telegram.org/bots/api")
    .row()
    .text("B", "b")
    .build(),
});

// ⌨️ reply keyboard as reply_markup
await api.sendMessage({
  chat_id,
  text: "Yes or no?",
  reply_markup: new ReplyKeyboardBuilder()
    .text("Yes")
    .text("No")
    .build({ resize_keyboard: true }),
});

// ✍️ rich text - EntityBuilder computes UTF-16 offsets for you
const { text, entities } = new EntityBuilder()
  .plain("Hello ")
  .bold("world")
  .link("docs", "https://x")
  .build();
await api.sendMessage({ chat_id, text, entities });

// any structured field is just a plain object - no wrapper needed
await api.sendMessage({ chat_id, text: "hi", link_preview_options: { is_disabled: true } });
```

## 📤 Uploads

A bare string is always a `file_id` or URL. Wrap raw bytes to upload them.

```ts
import { InputFile, MediaGroupBuilder } from "node-telegram-bot-api";
import { fromPath } from "node-telegram-bot-api/node";

// upload from disk (Node only)
await api.sendPhoto({ chat_id, photo: await fromPath("./cat.jpg") });
// upload raw bytes (web-standard, runs anywhere)
await api.sendDocument({ chat_id, document: new InputFile(bytes, { filename: "report.pdf" }) });

// a raw InputFile nested in a structure is auto-hoisted to an attach:// part
await api.sendMediaGroup({
  chat_id,
  media: [
    { type: "photo", media: new InputFile(bytesA), caption: "A" },
    { type: "photo", media: "https://example.com/b.jpg" }, // a URL is never uploaded
  ],
});

// MediaGroupBuilder: optional sugar for the same array
await api.sendMediaGroup({
  chat_id,
  media: new MediaGroupBuilder()
    .photo({ media: new InputFile(bytesA), caption: "A" })
    .photo({ media: "https://example.com/b.jpg" })
    .build(),
});
```

Builders cover the other `attach://` methods; each `.build()` returns the plain shape.

```ts
import { StickerSetBuilder, StaticProfilePhotoBuilder, PhotoStoryBuilder } from "node-telegram-bot-api";

// collect a sticker set
await api.createNewStickerSet({
  user_id,
  name,
  title,
  stickers: new StickerSetBuilder()
    .add({ sticker: new InputFile(pngBytes), format: "static", emoji_list: ["🙂"] })
    .build(),
});

// a single sticker is a plain InputSticker - no builder needed
await api.addStickerToSet({ user_id, name, sticker: { sticker: new InputFile(pngBytes), format: "static", emoji_list: ["🙂"] } });

// profile photo: Static / AnimatedProfilePhotoBuilder
await api.setMyProfilePhoto({ photo: new StaticProfilePhotoBuilder({ photo: new InputFile(pngBytes) }).build() });

// story: Photo / VideoStoryBuilder
await api.postStory({ business_connection_id, active_period, content: new PhotoStoryBuilder({ photo: new InputFile(pngBytes) }).build() });
```

## 🪝 Webhooks

The web-standard callback is a pure `(Request) => Promise<Response>` - one function for every serverless runtime.

**Cloudflare Workers / Bun.serve / Deno Deploy / Vercel Edge:**

```ts
import { Bot, webhookCallback } from "node-telegram-bot-api";

const bot = new Bot(TOKEN);
bot.on("message", (ctx) => ctx.reply("hi from the edge"));

export default {
  fetch: webhookCallback(bot, { secretToken: SECRET }),
};
```

By default the callback awaits your handler before `200`. For slow handlers, opt into **early-ACK**:

```ts
export default {
  // ✅ return 200 immediately, then finish the handler in the background
  // waitUntil keeps the platform alive until it settles (fastAck: true = fire-and-forget)
  fetch: (req, env, ctx) =>
    webhookCallback(bot, { secretToken: SECRET, waitUntil: (p) => ctx.waitUntil(p) })(req),
};
```

**Next.js App Router** (`app/api/bot/route.ts`):

```ts
import { Bot, nextAppWebhook } from "node-telegram-bot-api";
const bot = new Bot(process.env.BOT_TOKEN!);
export const POST = nextAppWebhook(bot, { secretToken: process.env.SECRET });
```

**Express** (mount on an app you already have):

```ts
import express from "express";
import { Bot, registerExpressWebhook } from "node-telegram-bot-api";

const app = express();
const bot = new Bot(TOKEN);
registerExpressWebhook(bot, app, { path: "/telegram", secretToken: SECRET });
app.listen(3000);
```

**Self-hosted Node server** (`node-telegram-bot-api/node`):

```ts
import { Bot } from "node-telegram-bot-api";
import { createWebhookServer, startWebhook } from "node-telegram-bot-api/node";

// Low-level: you own the server and the port.
const server = createWebhookServer(new Bot(TOKEN), { path: "/telegram", secretToken: SECRET });
server.listen(8080);

// Or the managed one-liner (listen + graceful shutdown, the webhook peer of run()):
await startWebhook(new Bot(TOKEN), { port: 8080, path: "/telegram", secretToken: SECRET });
```

Register the URL once: `api.setWebhook({ url, secret_token })`. The `secret_token` is the only thing authenticating callers (payloads aren't signed) - treat it as required in production, and terminate TLS at your proxy.

## ⚠️ Errors

Errors expose structured fields, so you branch on values, not message text.

```ts
import { TelegramApiError, NetworkError, TimeoutError } from "node-telegram-bot-api";

try {
  await api.sendMessage({ chat_id, text });
} catch (err) {
  // 🔁 429s are auto-retried (honoring retry_after) by default - this is the manual form
  if (err instanceof TelegramApiError && err.errorCode === 429) {
    await sleep((err.retryAfter ?? 1) * 1000);
  } else if (err instanceof NetworkError || err instanceof TimeoutError) {
    // transient transport failure
  }
}
```

## 🛡️ Resilience & rate limiting

Safe defaults out of the box - set only what you want to change.

```ts
import { Api } from "node-telegram-bot-api";

const api = new Api(TOKEN, {
  // 🔁 retries 429 (retry_after first), network/timeout/5xx with jittered backoff
  maxRetries: 2,        // default 2
  retryBackoffMs: 300,  // default 300

  // 🚦 opt-in throttle (requests/sec); omit for zero overhead
  rateLimit: { global: 30, perChat: 1 },
});
```

Long polling resumes through transient errors instead of dying on the first blip:

```ts
import { longPoll } from "node-telegram-bot-api";

for await (const update of longPoll(api, {
  timeout: 30,
  retry: true,          // default true - resume on transient errors, keep the offset
  maxBackoffMs: 60_000, // default 60s - cap between failed polls
  onError: (err) => console.warn("poll failed, backing off", err),
}, signal)) {
  // ... fatal 4xx still stops the loop; an aborted signal returns cleanly
}
```

## 🌊 Low-level update stream

`longPoll` is a plain async generator - `for await`, `take(n)`, filter, batch or fan out as you like.

```ts
import { Api, longPoll } from "node-telegram-bot-api";

const api = new Api(TOKEN);
const ac = new AbortController();
for await (const update of longPoll(api, { timeout: 30 }, ac.signal)) {
  console.log(update.update_id);
}
```

## 🐛 Debugging

Set `DEBUG` (the `debug` convention) to trace request lifecycle, polling and webhooks to **stderr**:

```sh
DEBUG="node-telegram-bot-api:*" node app.js
# node-telegram-bot-api:transport -> sendMessage
# node-telegram-bot-api:transport <- sendMessage ok +142ms
```

Namespaces: `:transport`, `:polling`, `:webhook` (filter, or exclude one with a leading `-`). Tracing is Node-only - wired up by importing `node-telegram-bot-api/node`; on edge runtimes it's an inert no-op.

## 🛠️ Development

```sh
bun run generate:types   # regenerate types + client from the live Bot API docs
bun run check            # tsc (strict) + core-isolation lint + edge bundle + unit tests
bun run build            # emit dist/
```

## 👥 Contributors

<p align="center">
  <a href="https://github.com/yagop/node-telegram-bot-api/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=yagop/node-telegram-bot-api" />
  </a>
</p>

## 📄 License

MIT
