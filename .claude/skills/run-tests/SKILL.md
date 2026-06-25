---
name: run-tests
description: How to run this repo's tests (node-telegram-bot-api v2). Use whenever running, scoping, or debugging the unit or e2e suite, after adding or modifying an Api/Bot method, or when setting up the e2e env vars (NODE_TELEGRAM_TOKEN, TEST_GROUP_ID, TEST_USER_ID). Covers bun (preferred) and node runners, scoping a run to a single method, methods that need special chat conditions (e.g. a forum group), the full local gate, and when a full-suite run is required.
---

# Running the tests

Two suites:

- **Unit** (`test/unit/`) - inject a fake `fetch` into `Transport` / `Api` / `Bot` (never monkeypatch `globalThis.fetch`) to assert the outgoing wire format: URL, body params, that structured fields were serialized once, that uploads built the right `multipart/FormData`, plus dispatch/compose/context/longpoll/webhook/errors behavior. One file per core area (`transport`, `encode`, `serialize`, `compose`, `context`, `bot`, `longpoll`, `webhook`, `errors`, `ratelimiter`, `builders`, `adapters`, `debug`, `generate-docs`). No network, no token. Fast.
- **E2E** (`test/e2e/methods.test.ts`, fixtures in `test/e2e/fixtures.ts`) - hit the real `api.telegram.org`. One `describe("<methodName>")` block per Bot API method, registered through the `method()` helper; a coverage-guard test asserts every `Api` method has one (see below). The shared client is rate-limited to ~1 req/s to respect flood limits, and irreversible / session-ending mutations (`logOut`, `close`, and other bot-bricking methods) are `test.skip`-ed - so a full run does **not** log the bot out. Needs credentials (below) and is **slow**.

Framework split: **unit** tests are written against `node:test` + `node:assert`, so they run identically on **bun** (preferred) and **node**. The **e2e** suite uses `bun:test` (`expect`), so it is **bun-only**.

The full local gate is `npm run check`: `typecheck` (src) + `typecheck:test` + `typecheck:examples` + `lint:core` + `check:edge` + the unit suite. Run it before opening a PR. Unlike v1 there **is** a lint/edge gate - `lint:core` (`scripts/check-core-imports.mjs`) and `check:edge` (`scripts/check-edge-bundle.mjs`) fail if `src/core` touches `node:*` / Node globals / a bundled Node builtin.

## Runner: bun (preferred) vs node

`bun` is preferred - it runs the TypeScript directly and **auto-loads `.env`** from the repo root. The unit suite also runs under real `node` (via `tsx`); the e2e suite does not (it imports `bun:test`). If `node` in your environment is a bun shim, real-node-only flags (`--env-file`) and `npm` may be unavailable - prefer the bun forms when in doubt.

| | bun (preferred) | node |
| --- | --- | --- |
| Unit, all | `bun test test/unit` (`npm test`) | `npm run test:node:unit` |
| E2E, all | `bun test --timeout 300000 test/e2e` (`npm run test:e2e`) | n/a (bun-only) |
| One unit file | `bun test test/unit/transport.test.ts` | `node --test --import tsx test/unit/transport.test.ts` |
| One test/describe by name | `bun test -t '<pattern>' <file>` | `node --test --import tsx --test-name-pattern='<pattern>' <file>` |

Tests execute TypeScript through `tsx` (esbuild) under node. esbuild ships a **platform-specific native binary** - if `node_modules` was populated on a different OS/arch the runner fails with "you installed esbuild for another platform"; fix with `bun install` (or `npm install`) on this machine.

## E2E credentials (required)

The e2e suite has **no skip-if-no-token guard** - without valid credentials the real calls reject and the tests fail by design. It reads:

- `NODE_TELEGRAM_TOKEN` (or `TEST_TELEGRAM_TOKEN` as a fallback) - the bot token.
- `TEST_GROUP_ID` - a chat the bot can post to.
- `TEST_USER_ID` - a user id the bot can resolve in `TEST_GROUP_ID`.

These **may be read from a `.env`** in the repo root; `bun test` loads it automatically. The bot must be an **admin in `TEST_GROUP_ID`** with the relevant rights, or capability-dependent tests fail.

## After adding or changing ONE method: run ONLY that method

The full e2e suite is ~180 rate-limited calls and takes minutes, so **scope the run** to the method you touched. The `-t` / `--test-name-pattern` value is a regex matched against the full test name (the `describe` path + test title):

```bash
bun test --timeout 300000 -t 'sendDice' test/e2e/methods.test.ts
```

Also run the matching unit block (`bun test -t '<area>' test/unit/<area>.test.ts`) and `npm run check`.

Watch for **substring overlap**: `-t 'sendMessage'` also matches `sendMessageDraft`; `-t 'copyMessage'` also matches `copyMessages`. Anchor or narrow the pattern (e.g. `-t 'copyMessage\b'`) when that matters.

## Methods that need special chat conditions

The e2e model is strict: a call resolving **is** the assertion, and there is no error-swallowing wrapper - so **env-limited** methods (forum-only, special-supergroup stickers, payments without a provider, owner-not-promotable admin ops, business / story / gift / passport, ...) **WILL fail** when run live here. That is intended. If a scoped run fails at setup with a `TelegramApiError`, check the chat, not the code:

- **Forum methods and any `message_thread_id` test** (`createForumTopic`, `editForumTopic`, sends into a topic, ...): `TEST_GROUP_ID` must be a **forum-enabled supergroup**. A plain group returns `400: ... the chat is not a forum`. (The `.env` group in this environment is NOT forum-enabled - see the `test-group-not-forum` memory.)
- **`setChatPhoto` / `setMyProfilePhoto`** (and chat-photo ops): the uploaded photo must be a **JPEG**. Telegram's photo backend silently **stalls** on a non-JPEG (e.g. a PNG) until the per-request `timeoutMs` aborts the call with a `TimeoutError`, so the fixtures use real JPEGs (`PROFILE_JPEG`, `JPEG_160`), never a PNG.
- **Owner-targeted admin methods** (`promoteChatMember`, `setChatAdministratorCustomTitle`): if `TEST_USER_ID` is the chat owner it cannot be promoted/restricted, so those tests assert the expected `TelegramApiError` rejection rather than a happy path.

## Diagnosing failures: flood limits, timeouts, DEBUG

The e2e client sets `rateLimit: { global: 1 }` (~1 req/s) to stay under Telegram's flood limits, but against a recently-hammered bot/group Telegram still **flood-limits** hard, and in practice many e2e failures are a **timeout, not an assertion failure** - confirm the cause before suspecting the code.

- **Do NOT immediately re-run a flood-limited suite.** Back-to-back runs *compound* the flood limit. Let the bot sit **idle ~30 min**, then re-run.
- **Two different timeouts, easy to confuse:**
  - **Test-runner cap** (`bun test --timeout <ms>`): kills the test itself. `test:e2e` uses **300000** (5 min) because a flood-limited `429` sleeps through `retry_after` (bounded by the transport's `maxRetryAfterMs`, default 60s) before the bounded retry.
  - **Per-request `timeoutMs`** (`TransportOptions`, the e2e client sets 30s): aborts one HTTP request as a `TimeoutError`. A stall with **no server response** is usually a bad request (e.g. the JPEG note above), not flood - flood returns a fast `429`.
- **Errors are values, not strings.** Branch on `err instanceof TelegramApiError && err.errorCode === 429` / `err.retryAfter`, `NetworkError`, `TimeoutError`, `ParseError` - never on message text.
- **Use `DEBUG` to see the wire.** The e2e suite preloads the Node stderr trace sink (`test/preload.ts` via `bunfig.toml`), so `DEBUG="node-telegram-bot-api:*"` (or `DEBUG=*`) prints the `transport` namespace traces - `-> <method>` per request, `<- <method> ok` / `<- <method> error <code> <description>` on completion, plus the retry lines - the fastest way to tell apart a `429` + `retry_after` (flood), a `400` `TelegramApiError` (real API rejection), and a request that stalls into a `TimeoutError`:
  ```bash
  DEBUG="node-telegram-bot-api:*" bun test -t '<method>' test/e2e/methods.test.ts
  ```

## When to run the FULL suite

Scope-to-one-method applies to a leaf method. If you change a **core / shared** part of the pipeline, every method is affected - run the **full unit suite** (always) and the **full e2e suite** (when the change alters wire behavior):

- `Transport` (`src/core/transport.ts`) - fetch, timeout/signal, 429 + transient retry, envelope unwrap.
- `serializeParams` (`src/core/serialize.ts`) and `encodeForm` (`src/core/encode.ts`) - the one serialization step and the multipart/urlencoded encoder.
- `Api.request` (`src/core/api.ts`), `InputFile` / files (`src/core/files.ts`), the builders (`src/core/keyboard.ts`, `entities.ts`, `media.ts`).
- Dispatch: `compose` (`src/core/compose.ts`), `Context` (`src/core/context.ts`), `Bot` (`src/core/bot.ts`), `longPoll` (`src/core/longpoll.ts`), `webhookCallback` (`src/core/webhook.ts`), `src/core/errors.ts`.
- Regenerating the generated surface (`src/types/schemas.ts`, `src/core/api.ts`).

```bash
npm test                                   # full unit suite (bun) - always after a core change
npm run test:node:unit                     # same suite under node
npm run test:e2e                           # full e2e (bun, slow) - when wire behavior changed
npm run check                              # the whole gate before a PR
```

## Coverage guard

Method coverage is enforced **inside** the e2e suite, not a separate script: the final `test("coverage - every Api method has a describe", ...)` walks `Api.prototype` and fails if any method (other than `constructor` / `request`) lacks a `describe` block, or if there is an `extra` describe with no matching method. So adding an `Api` method without an e2e `describe` (even a `test.skip`-ed one) breaks the suite - register the block when you add the method.
