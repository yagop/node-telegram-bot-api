# v1 → v2 cheatsheet

v2 is a from-scratch redesign with **no backward compatibility** (see `ARCHITECTURE.md`). There is no shim - this table is the migration path.

| Before (v1) | After (v2) |
|-------------|------------|
| `const TelegramBot = require('node-telegram-bot-api')` | `import { Bot } from 'node-telegram-bot-api'` (ESM-only) |
| `new TelegramBot(token, { polling: true })` | `const bot = new Bot(token); bot.startPolling()` |
| `new TelegramBot(token)` (for raw API calls) | `const bot = new Bot(token); await bot.api.getMe()` |
| `request.fetchOptions.dispatcher` / proxy options | inject a custom Undici `fetch`: `new Bot(token, { fetch: (url, init) => fetch(url, { ...init, dispatcher }) })` |
| `bot.on('message', msg => ...)` | `bot.on('message', ctx => ...)` - a router over `Context`, not an `EventEmitter` |
| `bot.onText(/\/echo (.+)/, (msg, m) => ...)` | `bot.hears(/\/echo (.+)/, ctx => { ctx.match[1] })` |
| `bot.onReplyToMessage(chatId, msgId, ...)` | middleware reading `ctx.message.reply_to_message` |
| `bot.sendMessage(chatId, text, opts)` | `bot.api.sendMessage({ chat_id, text, ...opts })` or, in a handler, `ctx.reply(text, opts)` |
| `bot.sendMessage(id, t, { reply_markup: { inline_keyboard: [...] } })` | `ctx.reply(t, { reply_markup: new InlineKeyboardBuilder().text('A','a').build() })` |
| `{ reply_markup: JSON.stringify(markup) }` (manual) | a plain object `{ inline_keyboard: [...] }` or a builder `.build()` - the field is a plain typed object; the pipeline serializes it |
| `bot.sendPhoto(id, '/path/to/p.jpg')` | `bot.api.sendPhoto({ chat_id, photo: await fromPath('/path/to/p.jpg') })` (from `'node-telegram-bot-api/node'`) |
| `bot.sendPhoto(id, fs.createReadStream(...))` | `bot.api.sendPhoto({ chat_id, photo: new InputFile(bytes) })` |
| bare string = path **or** file_id (via `options.filepath`) | a bare string is **always** a `file_id`/URL; bytes go through `new InputFile()`/`fromPath()` |
| `bot.sendMediaGroup(id, [{ type:'photo', media: stream }])` | `bot.api.sendMediaGroup({ chat_id, media: [{ type:'photo', media: new InputFile(bytes) }] })` (or the `MediaGroupBuilder`) |
| webhook via `new TelegramBot(token, { webHook: { port } })` | `createWebhookServer(bot, { path })` (`/node`) or `webhookCallback(bot)` on any runtime |
| `bot.setWebHook(url)` | `bot.api.setWebhook({ url })` |
| `bot.startPolling()` / `bot.stopPolling()` / `bot.isPolling()` | `bot.startPolling()` / `bot.stop()` / `bot.isRunning()`, or `longPoll(bot.api, opts, signal)` directly |
| `error.code === 'ETELEGRAM'`, message substring matching | `catch (e) { if (e instanceof TelegramApiError && e.errorCode === 429) e.retryAfter }` |
| `EFATAL` | split into `NetworkError` (`EFETCH`) and `TimeoutError` (`ETIMEOUT`) |
| `update.message` always `Message \| undefined` | `Update` is a discriminated union - `if ('message' in update) update.message` narrows |
| `bot.getMe(...)` etc. (positional + options) | every method takes a single params object: `bot.api.getMe()`, `bot.api.getChat({ chat_id })` |
| CommonJS, Node-only | ESM-only, web-standard core; runs on Node 18+, Bun, Deno, Workers, edge |

## Longer examples

<table>
<thead>
<tr>
<th>Before (v1)</th>
<th>After (v2)</th>
</tr>
</thead>
<tbody>
<tr>
<td valign="top">
<p><strong>Polling handlers</strong></p>

<pre lang="js">
const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "Hi");
});

bot.onText(/\/echo (.+)/, (msg, match) => {
  bot.sendMessage(msg.chat.id, match[1]);
});

bot.on("callback_query", (query) => {
  bot.answerCallbackQuery(query.id, { text: "ok" });
});
</pre>

</td>
<td valign="top">
<p><strong>Polling handlers</strong></p>

<pre lang="ts">
import { Bot } from "node-telegram-bot-api";
import { run } from "node-telegram-bot-api/node";

const bot = new Bot(process.env.BOT_TOKEN!);

bot.command("start", (ctx) => {
  return ctx.reply("Hi");
});

bot.hears(/\/echo (.+)/, (ctx) => {
  return ctx.reply(ctx.match![1]!);
});

bot.on("callback_query", (ctx) => {
  return ctx.answerCallbackQuery({ text: "ok" });
});

await run(bot);
</pre>

</td>
</tr>
<tr>
<td valign="top">
<p><strong>Uploads</strong></p>

<pre lang="js">
const TelegramBot = require("node-telegram-bot-api");
const fs = require("node:fs");

const bot = new TelegramBot(token);

await bot.sendPhoto(chatId, "./cat.jpg");
await bot.sendDocument(chatId, fs.createReadStream("./report.pdf"));
await bot.sendMediaGroup(chatId, [
  { type: "photo", media: fs.createReadStream("./a.jpg") },
  { type: "photo", media: "https://example.com/b.jpg" },
]);
</pre>

</td>
<td valign="top">
<p><strong>Uploads</strong></p>

<pre lang="ts">
import { Bot, InputFile } from "node-telegram-bot-api";
import { fromPath } from "node-telegram-bot-api/node";
import { readFile } from "node:fs/promises";

const bot = new Bot(token);

await bot.api.sendPhoto({ chat_id: chatId, photo: await fromPath("./cat.jpg") });

const report = await readFile("./report.pdf");
await bot.api.sendDocument({
  chat_id: chatId,
  document: new InputFile(report, { filename: "report.pdf" }),
});

await bot.api.sendMediaGroup({
  chat_id: chatId,
  media: [
    { type: "photo", media: await fromPath("./a.jpg") },
    { type: "photo", media: "https://example.com/b.jpg" },
  ],
});
</pre>

</td>
</tr>
<tr>
<td valign="top">
<p><strong>Proxy request options</strong></p>

<pre lang="js">
const TelegramBot = require("node-telegram-bot-api");
const { ProxyAgent } = require("undici");

const dispatcher = new ProxyAgent("http://127.0.0.1:8080");

const bot = new TelegramBot(token, {
  request: {
    fetchOptions: { dispatcher },
  },
});
</pre>

</td>
<td valign="top">
<p><strong>Proxy request options</strong></p>

<pre lang="ts">
import { fetch as undiciFetch, ProxyAgent, type Dispatcher } from "undici";
import { Bot } from "node-telegram-bot-api";

const dispatcher = new ProxyAgent("http://127.0.0.1:8080");

const bot = new Bot(token, {
  fetch: (url, init) =>
    undiciFetch(url, {
      ...init,
      dispatcher,
    } as RequestInit &amp; { dispatcher: Dispatcher }),
});

await bot.api.getMe();
</pre>

</td>
</tr>
</tbody>
</table>

## Runtime & module format

v2 is **ESM-only** - there is no CommonJS build, no `require()` entry, and no UMD/CJS shim. This is the largest single source of breakage for existing integrations: any project still on `require('node-telegram-bot-api')` will fail at load, and the failure is immediate (a module-resolution error), not a runtime surprise. Be honest about the blast radius before upgrading - CommonJS codebases, older bundler configs, and tools that can't load ESM are all affected.

The **package name is intentionally retained** (`node-telegram-bot-api`) even though v2 shares no API surface with v1. This is a deliberate semver-major: the name carries the install base and the docs/SEO, and v2 owns the lineage. The cost is that `npm install node-telegram-bot-api` on an old tutorial now lands you on a completely different API - the version (`^2`) is the only signal, so pin it.

**CJS interop path.** If you must consume v2 from a CommonJS module, use a dynamic `import()`, which is available in CJS:

```js
// CommonJS consumer
const { Bot, Api } = await import("node-telegram-bot-api");
```

`await import()` works at the top level of an ESM module and inside any `async` function in CJS. A plain top-level `require()` will not - that's the breaking constraint, not an oversight.

## Mental-model shifts

- **One client, single-argument methods.** `Api` mirrors the wire API: one method per Bot API method, each taking one params object. Positional ergonomics (`ctx.reply(text)`) live on `Context`.
- **Structured fields are plain typed objects.** `reply_markup`, `entities`, `reply_parameters`, `media`, ... take a plain object/array (or a fluent builder, which returns the same plain shape); the pipeline serializes them once. No `json()` wrapper, no branded strings. A nested file is just an `InputFile` dropped into the file field - the pipeline hoists it to an `attach://` part.
- **Composition over events.** `bot.use(mw)` and the filter helpers (`on`/`command`/`hears`) are koa-style middleware over a per-update `Context`, so sessions/auth/rate-limiting/error-boundaries wrap one another via `await next()`.
- **Two entry points, one dispatch path.** `bot.startPolling(source)` pumps an async generator for long-running processes; `bot.handleUpdate(update)` handles a single update and is what the edge/webhook callback calls.
- **Node helpers are opt-in.** `import ... from 'node-telegram-bot-api'` is the runtime-agnostic core; `import ... from 'node-telegram-bot-api/node'` adds `fromPath`, `createWebhookServer`, and `run`.
