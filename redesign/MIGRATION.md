# v1 → v2 cheatsheet

v2 is a from-scratch redesign with **no backward compatibility** (see `ARCHITECTURE.md`). There is no shim — this table is the migration path.

| v1 | v2 |
|----|----|
| `const TelegramBot = require('node-telegram-bot-api')` | `import { Bot } from 'node-telegram-bot-api'` (ESM-only) |
| `new TelegramBot(token, { polling: true })` | `const bot = new Bot(token); bot.start()` |
| `new TelegramBot(token)` (for one-off calls) | `import { Api } from 'node-telegram-bot-api'; const api = new Api(token)` |
| `bot.on('message', msg => …)` | `bot.on('message', ctx => …)` — a router over `Context`, not an `EventEmitter` |
| `bot.onText(/\/echo (.+)/, (msg, m) => …)` | `bot.hears(/\/echo (.+)/, ctx => { ctx.match[1] })` |
| `bot.onReplyToMessage(chatId, msgId, …)` | middleware reading `ctx.message.reply_to_message` |
| `bot.sendMessage(chatId, text, opts)` | `api.sendMessage({ chat_id, text, ...opts })` or, in a handler, `ctx.reply(text, opts)` |
| `bot.sendMessage(id, t, { reply_markup: { inline_keyboard: [...] } })` | `ctx.reply(t, { reply_markup: new InlineKeyboard().text('A','a').build() })` |
| `{ reply_markup: JSON.stringify(markup) }` (manual) | a builder `.build()` or `json(value)` — the field is a branded `Json<T>` string |
| `bot.sendPhoto(id, '/path/to/p.jpg')` | `api.sendPhoto({ chat_id, photo: await fromPath('/path/to/p.jpg') })` (from `'node-telegram-bot-api/node'`) |
| `bot.sendPhoto(id, fs.createReadStream(...))` | `api.sendPhoto({ chat_id, photo: inputFile(bytes) })` |
| bare string = path **or** file_id (via `options.filepath`) | a bare string is **always** a `file_id`/URL; bytes go through `inputFile()`/`fromPath()` |
| `bot.sendMediaGroup(id, [{ type:'photo', media: stream }])` | `api.sendMediaGroup({ chat_id, media: mediaGroup().photo(inputFile(bytes)).build() })` |
| webhook via `new TelegramBot(token, { webHook: { port } })` | `createWebhookServer(bot, { path })` (`/node`) or `webhookCallback(bot)` on any runtime |
| `bot.setWebHook(url)` | `api.setWebhook({ url })` |
| `bot.startPolling()` / `bot.stopPolling()` / `bot.isPolling()` | `bot.start()` / `bot.stop()` / `bot.isRunning()`, or `longPoll(api, opts, signal)` directly |
| `error.code === 'ETELEGRAM'`, message substring matching | `catch (e) { if (e instanceof TelegramApiError && e.errorCode === 429) e.retryAfter }` |
| `EFATAL` | split into `NetworkError` (`EFETCH`) and `TimeoutError` (`ETIMEOUT`) |
| `update.message` always `Message \| undefined` | `Update` is a discriminated union — `if ('message' in update) update.message` narrows |
| `bot.getMe(...)` etc. (positional + options) | every method takes a single params object: `api.getMe()`, `api.getChat({ chat_id })` |
| CommonJS, Node-only | ESM-only, web-standard core; runs on Node 18+, Bun, Deno, Workers, edge |

## Mental-model shifts

- **One client, single-argument methods.** `Api` mirrors the wire API: one method per Bot API method, each taking one params object. Positional ergonomics (`ctx.reply(text)`) live on `Context`.
- **The library serializes nothing.** Structured fields (`reply_markup`, `entities`, `reply_parameters`, …) are typed as `Json<T>` strings and produced at the call site by a builder or `json(value)`. Passing a plain object or a bare string is a *type* error.
- **Composition over events.** `bot.use(mw)` and the filter helpers (`on`/`command`/`hears`) are koa-style middleware over a per-update `Context`, so sessions/auth/rate-limiting/error-boundaries wrap one another via `await next()`.
- **Two entry points, one dispatch path.** `bot.start(source)` pumps an async generator for long-running processes; `bot.handleUpdate(update)` handles a single update and is what the edge/webhook callback calls.
- **Node helpers are opt-in.** `import … from 'node-telegram-bot-api'` is the runtime-agnostic core; `import … from 'node-telegram-bot-api/node'` adds `fromPath`, `createWebhookServer`, and `run`.
