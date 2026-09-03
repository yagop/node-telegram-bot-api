<h1 align="center">✨ A Modern Telegram Bot API Library ✨</h1>

<div align=center>

[![Bot API](https://img.shields.io/badge/Bot%20API-v.10.3-00aced.svg?style=flat-square&logo=telegram)](https://core.telegram.org/bots/api)
[![npm package](https://img.shields.io/npm/v/node-telegram-bot-api?logo=npm&style=flat-square)](https://www.npmjs.org/package/node-telegram-bot-api)

[![https://telegram.me/node_telegram_bot_api](https://img.shields.io/badge/💬%20Telegram-Channel-blue.svg?style=flat-square)](https://telegram.me/node_telegram_bot_api)
[![https://t.me/+_IC8j_b1wSFlZTVk](https://img.shields.io/badge/💬%20Telegram-Group-blue.svg?style=flat-square)](https://t.me/+_IC8j_b1wSFlZTVk)
[![https://telegram.me/Yago_Perez](https://img.shields.io/badge/💬%20Telegram-Yago_Perez-blue.svg?style=flat-square)](https://telegram.me/Yago_Perez)

</div>

> **v2 is a from-scratch redesign, no v1 compatibility.** Coming from v1? See the [v1 -> v2 migration guide](./CHANGELOG.md) in the changelog.

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
import { Bot, InlineKeyboardBuilder, ReplyKeyboardBuilder, EntityBuilder } from "node-telegram-bot-api";

const bot = new Bot(process.env.BOT_TOKEN!);

// 🎛️ inline keyboard as reply_markup
await bot.api.sendMessage({
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
await bot.api.sendMessage({
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
  .link("docs", "https://github.com/yagop/node-telegram-bot-api")
  .build();
await bot.api.sendMessage({ chat_id, text, entities });

// any structured field is just a plain object - no wrapper needed
await bot.api.sendMessage({ chat_id, text: "hi", link_preview_options: { is_disabled: true } });
```

## 📤 Uploads

A bare string is always a `file_id` or URL. Wrap raw bytes to upload them. Pass a
`filename` with the right extension - the core does no content sniffing, so the name is
what Telegram sees (`fromPath` uses the basename).

Uploads stream: bytes flow from their source straight into the request, so memory stays
flat no matter the file size (`fromPath` re-opens a disk stream per attempt). A `Blob`
or `Uint8Array` upload is re-streamed if the transport retries; a `ReadableStream` is
one-shot - it is sent once and a failure surfaces immediately instead of retrying. To
keep retries for an arbitrary stream source, pass a factory that returns a fresh stream:

```ts
// replayable streaming upload: the factory opens a new stream per attempt
await bot.api.sendVideo({
  chat_id,
  video: new InputFile(() => openVideoStream(), { filename: "video.mp4", contentType: "video/mp4" }),
});
```

```ts
import { Bot, InputFile, MediaGroupBuilder } from "node-telegram-bot-api";
import { fromPath } from "node-telegram-bot-api/node";

const bot = new Bot(process.env.BOT_TOKEN!);

// upload from disk (Node only)
await bot.api.sendPhoto({ chat_id, photo: await fromPath("./cat.jpg") });
// upload raw bytes (web-standard, runs anywhere)
await bot.api.sendDocument({ chat_id, document: new InputFile(bytes, { filename: "report.pdf" }) });

// a raw InputFile nested in a structure is auto-hoisted to an attach:// part
await bot.api.sendMediaGroup({
  chat_id,
  media: [
    { type: "photo", media: new InputFile(bytesA, { filename: "a.jpg" }), caption: "A" },
    { type: "photo", media: "https://telegram.org/example/photo.jpg" },
  ],
});

// MediaGroupBuilder: optional sugar for the same array
await bot.api.sendMediaGroup({
  chat_id,
  media: new MediaGroupBuilder()
    .photo({ media: new InputFile(bytesA, { filename: "a.jpg" }), caption: "A" })
    .photo({ media: "https://telegram.org/example/photo.jpg" })
    .build(),
});
```

Builders cover the other `attach://` methods; each `.build()` returns the plain shape.

```ts
import {
  Bot,
  InputFile,
  StickerSetBuilder,
  StaticProfilePhotoBuilder,
  PhotoStoryBuilder,
} from "node-telegram-bot-api";

const bot = new Bot(process.env.BOT_TOKEN!);

// collect a sticker set
await bot.api.createNewStickerSet({
  user_id,
  name,
  title,
  stickers: new StickerSetBuilder()
    .add({ sticker: new InputFile(pngBytes, { filename: "sticker.png" }), format: "static", emoji_list: ["🙂"] })
    .build(),
});

// a single sticker is a plain InputSticker - no builder needed
await bot.api.addStickerToSet({
  user_id,
  name,
  sticker: { sticker: new InputFile(pngBytes, { filename: "sticker.png" }), format: "static", emoji_list: ["🙂"] },
});

// profile photo: Static / AnimatedProfilePhotoBuilder
await bot.api.setMyProfilePhoto({
  photo: new StaticProfilePhotoBuilder({ photo: new InputFile(pngBytes, { filename: "avatar.png" }) }).build(),
});

// story: Photo / VideoStoryBuilder
await bot.api.postStory({
  business_connection_id,
  active_period,
  content: new PhotoStoryBuilder({ photo: new InputFile(pngBytes, { filename: "story.png" }) }).build(),
});
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
  fetch: (req: Request, _env: unknown, ctx: { waitUntil(promise: Promise<unknown>): void }) =>
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

## 💾 Sessions

Opt-in session middleware adds a persistent, per-chat bag, reached from the context with **`ctx.getSession<T>()`**. The `store` is **required** - no implicit default, so the durability choice is always explicit. Nothing lives in process memory between updates (only what the store persists), so the same code works under one-invocation-per-update serverless and under long-polling.

```ts
import { Bot, createSession, MemorySessionStorage } from "node-telegram-bot-api";

type Session = { count: number };

const bot = new Bot(process.env.BOT_TOKEN!);
bot.use(createSession<Session>({ store: new MemorySessionStorage(), initial: () => ({ count: 0 }) }));

bot.command("count", async (ctx) => {
  const s = ctx.getSession<Session>();
  s.data.count++; // mutate in place, or reassign: s.data = { count: 0 }
  await ctx.reply(`Seen ${s.data.count} times`);
});
```

Tired of repeating `<Session>`? Keep the middleware and use its own accessor, typed once at construction - `createSession<Session>()` returns a middleware carrying `.get(ctx)` and `.find(ctx)` (the latter returns `undefined` instead of throwing when the update had no session key):

```ts
const session = createSession<Session>({ store: new MemorySessionStorage(), initial: () => ({ count: 0 }) });
bot.use(session);
bot.command("count", (ctx) => ctx.reply(`Seen ${++session.get(ctx).data.count} times`));
```

Both return the same handle, which is also where the non-bag members live: `.createdAt` / `.updatedAt`, `.ext()` for layers built on sessions, and `.delete()`, which evicts the whole key on flush - an explicit end-of-conversation / `/forget` / erasure hook. `ctx.getSession()` and `session.get(ctx)` throw when the middleware did not run for this update (not registered, or no derivable key).

### Reply tracking

Reply tracking is a layer **on top of** the session (it stores its table in the envelope's `ext.reply`, so a bot that never uses it persists nothing extra). It records "awaiting a reply to a specific message" as plain data matched on `reply_to_message.message_id` - never a live promise - so it survives a restart and works on serverless.

You tag the message you sent; when its reply arrives, you read the tag back, so you know **which** prompt is being answered - the reason it exists is that a chat can have several prompts outstanding at once. `taggedReplies<Tag>(ctx)` wraps both ends for a plain string tag, tying `expect` and `match` to one type. Below, the `step` tag drives a two-question flow through a single `message` handler:

```ts
import { taggedReplies } from "node-telegram-bot-api";

type Session = { name?: string };

bot.command("start", async (ctx) => {
  const sent = await ctx.reply("What's your name?", { reply_markup: { force_reply: true } });
  // tag the message we sent with the step its reply will answer
  taggedReplies<"name" | "email">(ctx).expect(sent.message_id, "name");
});

bot.on("message", async (ctx, next) => {
  const step = taggedReplies<"name" | "email">(ctx).match(); // "name" | "email" | undefined
  if (!step) return next(); // not a reply we're waiting on -> let other handlers run

  if (step === "name") {
    ctx.getSession<Session>().data.name = ctx.message?.text;
    const sent = await ctx.reply("And your email?", { reply_markup: { force_reply: true } });
    taggedReplies<"name" | "email">(ctx).expect(sent.message_id, "email"); // chain the next prompt
  } else {
    await ctx.reply(`Thanks ${ctx.getSession<Session>().data.name}, got your email: ${ctx.message?.text}`);
  }
});
```

`taggedReplies` is sugar over the primitives `expectReply(ctx, id, marker?)` (stores any JSON marker object), `matchReply<M>(ctx)` (returns it typed as `M`) and `forgetReply(ctx, id)` (cancels a pending expectation). With a single prompt in flight you can drop the marker entirely - its presence alone is the signal.

#### Button presses

`expectCallback(ctx, id, marker?)` / `matchCallback<M>(ctx, { once? })` are the callback-query peers, keyed on `callback_query.message.message_id` and sharing the same table (`taggedReplies(ctx).expectPress` / `.matchPress` for string tags).

**Reach for them only when `callback_data` is not enough.** A button already carries 64 bytes you chose, round-tripped by Telegram for free - that is the idiomatic way to route a press, and it needs no session at all:

```ts
bot.on("callback_query", (ctx) => {
  if (ctx.callbackQuery?.data === "confirm") { /* ... */ }
});
```

The session-backed version earns its keep for a marker that does not fit in 64 bytes, one the client must not read (`callback_data` is plain text in the app), or a button that must fire once:

```ts
const sent = await ctx.reply("Delete everything?", { reply_markup: { inline_keyboard: [[{ text: "Yes", callback_data: "y" }]] } });
expectCallback(ctx, sent.message_id, { op: "delete", scope: "all" });

bot.on("callback_query", async (ctx, next) => {
  const hit = matchCallback<{ op: string }>(ctx, { once: true }); // one-shot: a double tap can't fire twice
  if (!hit) return next();
  await ctx.answerCallbackQuery({ text: `Running ${hit.op}` });
});
```

Unlike a reply, matching a press does **not** consume the marker by default - an inline keyboard usually stays live for several presses (paging, a toggle), and consuming would break every press after the first. Pass `{ once: true }` for a one-shot button. A press on an inline-mode message carries no `message`, so there is nothing to key on; route those by `callback_data`.

### Storage backends

Every backend implements the same `SessionStore`: a **string** key/value contract - `read(key)`, `write(key, value, { ttlSeconds })`, `delete(key)`, plus optional `init` / `close` and, for backends with a TTL, `touch(key, ttlSeconds)` (the middleware calls it when an update changed nothing, so an active chat is not evicted just because its data stood still). Serialization happens once in the middleware's codec, never inside a store, so the in-memory store is a faithful simulation of a durable one - a `Date` in the bag comes back a string everywhere, not only on Redis. Swapping backends is a one-line change:

| Store | Import | Runtime | Durable | Notes |
| --- | --- | --- | --- | --- |
| `MemorySessionStorage` | `node-telegram-bot-api` | any | ❌ | process-local; single-process / polling only; optional TTL |
| `FileSessionStorage` | `node-telegram-bot-api/node` | Node | ✅ | one file per key; atomic writes; single host |
| `SqliteSessionStorage` | `node-telegram-bot-api/bun` | Bun | ✅ | `bun:sqlite`; sync; single host |
| `SqlSessionStorage` | `node-telegram-bot-api/bun` | Bun | ✅ | Bun `SQL` (Postgres); cross-instance |
| `RedisSessionStorage` | `node-telegram-bot-api/bun` | Bun | ✅ | Bun `redis`; cross-instance; optional TTL |

```ts
// durable on Node (e.g. a webhook on one host)
import { createSession } from "node-telegram-bot-api";
import { FileSessionStorage } from "node-telegram-bot-api/node";
bot.use(createSession<Session>({ store: new FileSessionStorage({ path: "./.sessions" }) }));

// durable on Bun, shared across instances, idle sessions expiring after a day
import { RedisSessionStorage } from "node-telegram-bot-api/bun";
bot.use(createSession<Session>({ store: new RedisSessionStorage(), ttlSeconds: 86400 }));
```

Any other backend (ioredis, `pg`, a KV service) is ~10 lines implementing the three methods. The `node-telegram-bot-api/bun` stores import Bun built-ins and are isolated behind that subpath - a Node or edge install never resolves them.

### Lifecycle

A middleware may carry `init` / `close`; `bot.use` picks those up, `bot.init()` runs them once in registration order and `bot.close()` in reverse. Session middleware forwards both to its store, so setup (create the directory / table, open the pool) happens **at startup**, not lazily on update #1:

```ts
bot.use(createSession<Session>({ store: new FileSessionStorage({ path: "./.sessions" }) }));
await bot.init(); // optional: a bad path / unreachable backend fails here, at boot
```

`startPolling()` and `handleUpdate()` await `bot.init()` themselves (memoized), so this is only about *when* a setup error surfaces - one raised during an update goes to the `bot.catch()` boundary like any other. `run()` (`/node`) calls `bot.close()` on shutdown, and `close()` drops the setup memo so a later `init()` starts over. A store that owned the connection it closed (`SqlSessionStorage` with a `url`, `SqliteSessionStorage` with a path) is spent after that - construct a new one; with a caller-supplied client the store stays usable.

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

### 🧯 Handler errors: the boundary contract

An error thrown by a handler never stops the bot. It is routed to the error boundary, which by default logs it via `console.error` and consumes the update - polling keeps pumping, and a webhook delivery is ACKed (Telegram does not redeliver it). Install your own boundary with `bot.catch()`:

```ts
bot.catch((err, ctx) => {
  console.error("update", ctx.update.update_id, "failed:", err);
});
```

Throwing from the boundary opts back into fail-loud: `startPolling()` rejects (the update was never confirmed, so Telegram redelivers it on restart) and `webhookCallback` responds 500 (Telegram redelivers). `bot.catch((err) => { throw err; })` is the explicit fail-loud opt-in.

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
