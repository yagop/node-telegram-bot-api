# Examples

Runnable, idiomatic examples for `node-telegram-bot-api` v2. Each file imports the
package by its **published name** (`node-telegram-bot-api` and
`node-telegram-bot-api/node`) - exactly how a real consumer would - never via
relative `../src` paths.

| File | Shows | Run |
| --- | --- | --- |
| [`01-polling-bot.ts`](./01-polling-bot.ts) | `Bot` with `command`/`hears`/`on`, `ctx.reply`, managed `run()` from `/node` | `BOT_TOKEN=... bun examples/01-polling-bot.ts` |
| [`02-api-client.ts`](./02-api-client.ts) | Low-level `Api`: `getMe`, `sendMessage`, token from env | `BOT_TOKEN=... CHAT_ID=... bun examples/02-api-client.ts` |
| [`03-webhook-workers.ts`](./03-webhook-workers.ts) | `webhookCallback` as a Cloudflare Workers `fetch`, with `fastAck` + `waitUntil` | deploy with wrangler (illustrative) |
| [`04-webhook-express.ts`](./04-webhook-express.ts) | `registerExpressWebhook` mounting the route on a (structurally-typed) app | run inside an Express server (illustrative) |
| [`05-webhook-nextjs.ts`](./05-webhook-nextjs.ts) | `nextAppWebhook` as an App Router `export const POST` | `app/api/telegram/route.ts` in a Next.js app (illustrative) |
| [`06-keyboards.ts`](./06-keyboards.ts) | `InlineKeyboard`, `ReplyKeyboard`, `removeKeyboard`, `forceReply`, `ctx.answerCallbackQuery` | `BOT_TOKEN=... bun examples/06-keyboards.ts` |
| [`07-formatting.ts`](./07-formatting.ts) | `EntityBuilder` + `EntityType` + `json()`, sending entities | `BOT_TOKEN=... CHAT_ID=... bun examples/07-formatting.ts` |
| [`08-uploads.ts`](./08-uploads.ts) | `InputFile`, `fromPath` (`/node`), `MediaGroup` | `BOT_TOKEN=... CHAT_ID=... bun examples/08-uploads.ts` |
| [`09-middleware.ts`](./09-middleware.ts) | `bot.use` for timing, an in-memory session, and an allowlist auth gate | `BOT_TOKEN=... ALLOWED_USERS=111,222 bun examples/09-middleware.ts` |
| [`10-resilience-ratelimit.ts`](./10-resilience-ratelimit.ts) | `maxRetries`/`retryBackoffMs`/`rateLimit`, branching on `TelegramApiError`/`NetworkError` | `BOT_TOKEN=... CHAT_ID=... bun examples/10-resilience-ratelimit.ts` |
| [`11-longpoll-stream.ts`](./11-longpoll-stream.ts) | Consume `longPoll(api, opts, signal)` with `for await`, filter, stop via `AbortController` | `BOT_TOKEN=... bun examples/11-longpoll-stream.ts` |
| [`12-conversation.ts`](./12-conversation.ts) | A multi-step conversation (name → age) via `ctx.state` + a per-chat step `Map` | `BOT_TOKEN=... bun examples/12-conversation.ts` |
| [`13-webhook-node-server.ts`](./13-webhook-node-server.ts) | `createWebhookServer` (`/node`): a raw `node:http` webhook server, no framework | `BOT_TOKEN=... WEBHOOK_SECRET=... PUBLIC_URL=https://... bun examples/13-webhook-node-server.ts` |

The framework webhook examples (03-05) target serverless/framework platforms and
aren't standalone-runnable here, but they typecheck and show the exact wiring.
The self-hosted `node:http` variant (13) does start a real server locally - put a
TLS-terminating proxy or tunnel in front of it to receive live Telegram traffic.

## Running from this repo

The examples import the **package name**, so the package must resolve. Either:

- **Build first**, then run with Bun/Node:
  ```sh
  bun run build           # emits dist/ that the package "exports" map points at
  BOT_TOKEN=... bun examples/01-polling-bot.ts
  ```
- **Or just typecheck** them against the source (no build) via the path-mapped
  config - the bare-name imports are mapped onto `src/`:
  ```sh
  ./node_modules/.bin/tsc -p examples/tsconfig.json --noEmit
  ```

## Conventions

- Tokens are read from `process.env.BOT_TOKEN` (non-null asserted for brevity);
  never hardcode a token.
- `CHAT_ID` (your user id or a group id) is required by the examples that actually
  send messages.
- Every builder's `.build()` returns a wire-ready `Json<...>` string - the library
  serializes nothing; you produce the JSON at the call site.
