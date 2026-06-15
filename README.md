# node-telegram-bot-api

A runtime-agnostic TypeScript client for the [Telegram Bot API](https://core.telegram.org/bots/api).

The core imports only Web-standard APIs, so the same code runs on **Node 18+, Bun, Deno, Cloudflare Workers, Vercel Edge and Deno Deploy**. Node-only conveniences (filesystem uploads, a self-hosted webhook server, a managed polling runner) live in the `node-telegram-bot-api/node` subpath.

> **v2 is a from-scratch redesign with no backward compatibility.** Coming from v1? See [`redesign/MIGRATION.md`](./redesign/MIGRATION.md). The design and its rationale are in [`redesign/ARCHITECTURE.md`](./redesign/ARCHITECTURE.md).

## Install

```sh
npm install node-telegram-bot-api
```

ESM only. Node floor is 18 (first LTS with stable global `fetch`).

## Runtime support

The core uses only Web-standard APIs (`fetch`, `Blob`, `FormData`, `AbortSignal`), so it runs unchanged across:

| Runtime | Supported | Notes |
|---------|-----------|-------|
| Node | ≥ 18 | global `fetch`/`Blob`/`FormData` are stable from 18; the transport uses `AbortSignal.timeout` (Node 17.3+), **not** `AbortSignal.any`, so the 18 floor holds. |
| Bun | ✓ | Web APIs native. |
| Deno | ✓ | Web APIs native. |
| Cloudflare Workers | ✓ | `webhookCallback` is a pure `(Request) => Response`. |
| Vercel Edge | ✓ | as above. |
| Deno Deploy | ✓ | as above. |

Filesystem uploads (`fromPath`) and the self-hosted `node:http` webhook server are the only Node-bound pieces; they live in `node-telegram-bot-api/node`.

## Quick start — a polling bot

```ts
import { Bot, InlineKeyboard } from "node-telegram-bot-api";
import { run } from "node-telegram-bot-api/node"; // managed runner: handles SIGINT/SIGTERM

const bot = new Bot(process.env.BOT_TOKEN!);

bot.command("start", (ctx) => ctx.reply("Hi! Send me anything."));

bot.hears(/echo (.+)/, (ctx) => ctx.reply(ctx.match![1]!));

bot.on("message", (ctx) =>
  ctx.reply("Pick one:", {
    reply_markup: new InlineKeyboard().text("👍", "up").text("👎", "down").build(),
  }),
);

bot.on("callback_query", async (ctx) => {
  await ctx.answerCallbackQuery({ text: `You tapped ${ctx.callbackQuery!.data}` });
});

await run(bot); // or: await bot.start();
```

The core has no managed runner dependency — `await bot.start()` works anywhere. `run()` just wires `Ctrl-C` to `bot.stop()`.

## Calling the API directly

`Api` is a 1:1 mirror of the wire API: one concrete method per Bot API method, each taking a single params object.

```ts
import { Api } from "node-telegram-bot-api";

const api = new Api(process.env.BOT_TOKEN!);
const me = await api.getMe();
await api.sendMessage({ chat_id: 12345, text: "hello" });
```

`bot.api` and `ctx.api` expose the same client.

## Middleware

`bot.use()` registers koa-style middleware over a per-update `Context`; `on`/`command`/`hears` are filter middleware, so they interleave and respect order. Each layer can wrap everything downstream via `await next()`.

```ts
// timing + error boundary around every update
bot.use(async (ctx, next) => {
  const start = Date.now();
  try {
    await next();
  } finally {
    console.log(`${"message" in ctx.update ? "msg" : "update"} took ${Date.now() - start}ms`);
  }
});

bot.catch((err, ctx) => console.error("handler failed", err));
```

## Keyboards & formatting

Structured fields are branded `Json<T>` strings, produced at the call site by a builder or the generic `json()` helper — serialization happens in the builders, not in the request pipeline.

```ts
import { InlineKeyboard, ReplyKeyboard, removeKeyboard, EntityBuilder, json } from "node-telegram-bot-api";

// inline keyboard
new InlineKeyboard().text("A", "a").url("Docs", "https://core.telegram.org/bots/api").row().text("B", "b").build();

// reply keyboard
new ReplyKeyboard().text("Yes").text("No").build({ resize_keyboard: true });
removeKeyboard();

// rich text without counting UTF-16 offsets by hand
const { text, entities } = new EntityBuilder().plain("Hello ").bold("world").link("docs", "https://x").build();
await api.sendMessage({ chat_id, text, entities });

// escape hatch for any structured field without a bespoke builder
await api.sendMessage({ chat_id, text: "hi", link_preview_options: json({ is_disabled: true }) });
```

## Uploads

A bare string is **always** a `file_id` or URL. To upload bytes, wrap them: `inputFile()` (web-standard data) or `fromPath()` (Node, filesystem).

```ts
import { inputFile, MediaGroup } from "node-telegram-bot-api";
import { fromPath } from "node-telegram-bot-api/node";

await api.sendPhoto({ chat_id, photo: await fromPath("./cat.jpg") });
await api.sendDocument({ chat_id, document: inputFile(new Uint8Array(bytes), { filename: "report.pdf" }) });

// nested files (media groups) — the builder mints attach:// refs at the call site
await api.sendMediaGroup({
  chat_id,
  media: new MediaGroup()
    .photo(inputFile(bytesA), { caption: "A" })
    .photo("https://example.com/b.jpg") // URL → no upload
    .build(),
});
```

## Webhooks

The web-standard callback is a pure `(Request) => Promise<Response>` — one function for every serverless runtime.

**Cloudflare Workers / Bun.serve / Deno Deploy / Vercel Edge:**

```ts
import { Bot, webhookCallback } from "node-telegram-bot-api";

const bot = new Bot(TOKEN);
bot.on("message", (ctx) => ctx.reply("hi from the edge"));

export default {
  fetch: webhookCallback(bot, { secretToken: SECRET }),
};
```

By default the callback awaits your handler before returning `200`. For slow handlers that risk Telegram's webhook timeout, opt into **early ACK**: the callback validates the request, returns `200` immediately, and runs the handler in the background — pass `waitUntil` so the platform keeps the worker alive until it settles (`fastAck: true` alone runs it fire-and-forget). The secret-token check is a constant-time compare either way.

```ts
export default {
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
import { createWebhookServer } from "node-telegram-bot-api/node";

const server = createWebhookServer(new Bot(TOKEN), { path: "/telegram", secretToken: SECRET });
server.listen(8080);
```

Register the URL once with `api.setWebhook({ url, secret_token })`.

## Errors

Errors preserve `cause` and expose structured fields, so you branch on values, not message substrings.

```ts
import { TelegramApiError, NetworkError, TimeoutError } from "node-telegram-bot-api";

try {
  await api.sendMessage({ chat_id, text });
} catch (err) {
  if (err instanceof TelegramApiError && err.errorCode === 429) {
    await sleep((err.retryAfter ?? 1) * 1000);
  } else if (err instanceof NetworkError || err instanceof TimeoutError) {
    // transient transport failure
  }
}
```

(The transport already retries `429` honoring `retry_after` by default.)

## Resilience & rate limiting

The transport retries out of the box and backs off automatically; long polling resumes through transient failures. Everything below has safe defaults — you only set what you want to change.

```ts
import { Api } from "node-telegram-bot-api";

const api = new Api(TOKEN, {
  // 429s honor retry_after first; network/timeout/5xx are also retried,
  // with exponential backoff (base * 2^(n-1), capped at 30s, jittered).
  maxRetries: 2,        // default 2
  retryBackoffMs: 300,  // default 300

  // Opt-in proactive throttle (requests/sec). Omit for zero overhead.
  rateLimit: { global: 30, perChat: 1 },
});
```

Long polling keeps running through transient errors instead of dying on the first network blip:

```ts
import { longPoll } from "node-telegram-bot-api";

for await (const update of longPoll(api, {
  timeout: 30,
  retry: true,          // default true — resume on transient errors, keep the offset
  maxBackoffMs: 60_000, // default 60s — cap between failed polls
  onError: (err) => console.warn("poll failed, backing off", err),
}, signal)) {
  // …
}
```

Fatal `4xx` errors still stop the loop; an aborted signal returns cleanly.

## Low-level update stream

`longPoll` is a plain async generator — `for await`, `take(n)`, filter, batch or fan out as you like.

```ts
import { Api, longPoll } from "node-telegram-bot-api";

const api = new Api(TOKEN);
const ac = new AbortController();
for await (const update of longPoll(api, { timeout: 30 }, ac.signal)) {
  console.log(update.update_id);
}
```

## Development

```sh
bun run generate:types   # regenerate src/types/schemas.ts + src/core/api.ts from the live docs
bun run check            # tsc (strict) + core-isolation lint + unit tests
bun run build            # emit dist/
```

`bun run check` runs three gates: `tsc --strict` over `src/`, a lint that fails if anything under `src/core/` imports a `node:` module (keeping the edge bundle Node-free), and the unit-test suite (which never touches the network — `fetch` is injected).

## License

MIT
