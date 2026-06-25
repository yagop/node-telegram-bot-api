# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`node-telegram-bot-api` v2: a from-scratch, runtime-agnostic TypeScript Telegram Bot API client.
Node 18+, also runs on Bun, Deno, Cloudflare Workers, and Vercel/Deno Edge. The source is
ESM/web-standard; the **published** package is dual-module - `zshy` emits both ESM (`*.js`/`*.d.ts`)
and CJS (`*.cjs`/`*.d.cts`), exposed via the `exports` map's `import`/`require` conditions, so it can
be `import`ed or `require`d. `src/core` stays Node-free, so the edge story is unchanged. There is
**no v1 compatibility**; the v1->v2 migration cheatsheet lives in `CHANGELOG.md`.

Current development happens on `feat/v2-core`; the base/release branch is `master`.

## Commands

Bun is the primary toolchain (it is a devDependency and runs the unit suite and generator).

```sh
bun install                       # install deps (CI uses --frozen-lockfile)

npm run check                     # full local gate: typecheck (x3) + lint:core + check:edge + unit tests
npm run typecheck                 # tsc --noEmit over src (strict)
npm run typecheck:test            # tsc over test/ (needs bun types installed)
npm run lint:core                 # FAILS if src/core touches node:* or Node globals (see below)
npm run check:edge                # FAILS if src/core bundles a Node builtin (even transitively)

npm test                          # unit tests via Bun (test/unit)
npm run test:node:unit            # unit tests via Node's node:test + tsx (CI runs this on Node 22/24/26)
npm run test:e2e                  # LIVE tests against api.telegram.org (see Testing)

npm run build                     # zshy -> dist/ dual ESM+CJS (core, node, types subpaths); postbuild repairs CJS source-map refs
npm run generate:types            # regenerate generated sources from live Bot API docs
```

Run a single unit test:

```sh
bun test test/unit/transport.test.ts          # one file
bun test -t "429 then success retries"        # by test-name substring
```

## Architecture

Three source folders, one published package, exposed via subpath exports (`.`, `./node`, `./types`):

```text
src/
  core/   runtime-agnostic. Bot, Context, compose, the single Api client, Transport,
          serializeParams + encodeForm, InputFile, the markup / entity / media builders
          (optional sugar), longPoll, webhookCallback, framework webhook adapters
          (Express / Next.js), errors. Web-standard APIs only.
          -> zero node:* imports; runs on Node 18+ / Bun / Deno / Workers / edge.
  node/   the ONLY folder allowed to import node:*. Node-only sugar: fromPath() (fs
          uploads), createWebhookServer() (node:http -> delegates to core's
          webhookCallback), the managed run() polling runner, the DEBUG stderr sink.
  types/  the generated schema (re-exported by core): discriminated Update, the generated
          Api method signatures / *Params / *Result types, expanded MessageEntity.
```

The `exports` map points `.` at the core, `./node` at the Node helpers, and `./types` at the
schema; each subpath ships ESM + CJS with matching typings:

```jsonc
// package.json
"exports": {
  ".": {
    "import":  { "types": "./dist/core/index.d.ts",  "default": "./dist/core/index.js"  },
    "require": { "types": "./dist/core/index.d.cts", "default": "./dist/core/index.cjs" }
  },
  "./node":  { /* same shape -> dist/node/*  */ },
  "./types": { /* same shape -> dist/types/* */ }
}
```

`import { Bot } from "node-telegram-bot-api"` is the runtime-agnostic core; `import { fromPath }
from "node-telegram-bot-api/node"` opts into the Node helpers. The core-vs-node isolation is a CI
rule (`lint:core` + `check:edge`), not a package boundary, so the edge bundle never drags in a Node
builtin.

### The Api client

One **generated** `Api` class - no `Proxy`, no `RawApi`/`Api` split. One concrete method per Bot
API method, each a one-liner over a shared `request()`, taking a single params object plus an
optional trailing `AbortSignal` (`getMe(signal?)`, `sendMessage(params, signal?)`). Real methods
give correct stack traces, are greppable, and need no casts; adding a method is a regenerate, never
a hand-written body. `Bot` holds an `Api`; `ctx.api` and `bot.api` expose it. The whole client
ships regardless of which methods a bot calls (no per-method tree-shaking - a deliberate trade for
the single discoverable `api.*` namespace).

### Request pipeline (the only place serialization happens)

`Api.request` -> `serializeParams` (one `JSON.stringify` + `attach://` walk for nested files) ->
`encodeForm` -> `Transport` (injectable `fetch`, 429/transient retry with jittered backoff,
`{ok,result}` envelope unwrap). Structured fields (`reply_markup`, entities, `reply_parameters`,
media, ...) are **plain typed objects/arrays** that `serializeParams` stringifies once. Builders
(`InlineKeyboardBuilder`, `EntityBuilder`, `MediaGroupBuilder`, plus the sticker / profile-photo /
story builders) are **optional sugar** whose `.build()` returns the same plain shape - a literal
object works identically. `EntityType` is the typo-proof constant for entity kinds.

Every request goes out as form encoding: `x-www-form-urlencoded`, or `multipart/form-data` iff an
`InputFile` is present (the only thing that flips the body type). `encodeForm` has exactly three
branches: attach an `InputFile` as a part / spread a form-part composite (its JSON string + nested
parts) / set a string. `InputFile` wraps web-standard data only (`Blob | Uint8Array |
ReadableStream<Uint8Array>`); `fromPath()` (`/node`) is the only fs-backed constructor. File-bearing
params are `InputFile | string` - a bare string is always a `file_id`/URL, never a path. Nested
files (`sendMediaGroup`, sticker sets, ...) are hoisted to `attach://<name>` parts by
`serializeParams`.

### Dispatch

koa-style middleware over a per-update `Context`. `bot.use(mw)` registers middleware; `bot.on(kind)`,
`bot.command(name)`, `bot.hears(trigger)` are filter middleware in the same chain - registration
order wins, and each can wrap everything downstream via `await next()` (sessions, auth, rate-limit,
error boundaries). `Context` bundles the raw `update`, the typed `api`, a mutable `state` bag, and
chat-inferring shortcuts (`ctx.reply`, `ctx.answerCallbackQuery`). Update sources are async
generators - `longPoll(api, opts, signal)` replaces the old polling class. Two entry points share
**one** dispatch path: `bot.startPolling()` pumps `longPoll`; `bot.handleUpdate(update)` handles a
single update and is what `webhookCallback` calls.

### Webhooks

`webhookCallback(bot)` is a pure `(Request) => Promise<Response>` (Cloudflare Workers, Deno Deploy,
Vercel Edge, Bun.serve, Next.js App Router). Thin adapters mount it on an existing server:
`registerExpressWebhook`, `nodeFrameworkWebhook` (an `(req, res)` handler), `nextAppWebhook`. The
Node `createWebhookServer` (`/node`) adapts a `node:http` request and delegates to the same
callback - no duplicate request-handling logic.

### Transport & errors

`Transport` is the only module touching `fetch`; it is injectable (`opts.fetch`) so tests pass a
fake instead of monkeypatching globals. It merges the per-request timeout with the caller's signal
via `combineSignals` over `AbortSignal.timeout` (deliberately not `AbortSignal.any`, which needs
Node 18.17/20.3), unwraps the envelope, and retries: `429`s honor `retry_after` up to
`maxRetryAfterMs` (default 60s; a longer flood-wait surfaces immediately as a `TelegramApiError`),
transient failures (`NetworkError`/`TimeoutError`/5xx, classified by `isTransientError`) retry up to
`maxRetries` (default 2) with exponential jittered backoff. Opt-in proactive rate limiting
(`opts.rateLimit: { global?, perChat? }`) via a token-bucket keyed on `chat_id` - off by default,
zero overhead when unset.

Errors (`src/core/errors.ts`): a `TelegramBotError` base preserving `cause`, plus `NetworkError`,
`TimeoutError`, `ParseError`, `TelegramApiError` (structured `errorCode`/`description`/`parameters`
+ a `retryAfter` getter). Callers branch on values (`err.errorCode === 429`, `err.retryAfter`),
never on message text.

## Critical invariants

- **`src/core/api.ts` and `src/types/schemas.ts` are GENERATED** by `scripts/api-parser.ts` from
  the live Bot API docs. Do not hand-edit them; change the generator and run `npm run generate:types`.
  Adding a Bot API method = regenerate, never a hand-written method body. (See the `update-bot-api`
  skill for the full flow, including the hand-added `Bot`/`Context` sugar.)
- **`src/core` must stay Node-free.** No `node:*` imports, no bare-builtin imports, no Node globals
  (`Buffer`, `process`, `setImmediate`, ...). Enforced by both `lint:core` (static) and `check:edge`
  (bundler). Anything needing Node goes in `src/node`.
- **Keep generated runtime lists in lockstep with their source types** (e.g. `UPDATE_TYPES`,
  `MESSAGE_TYPES`) via the both-direction compile-time asserts already in place; `satisfies` alone
  misses absent keys.
- **ASCII only** in code, comments, and commit messages: use `-`, `->`, `...` - never em dashes or
  smart quotes (a commit hook rejects them; emoji are fine).
- TypeScript style: prefer `type` over `interface`; never emit `any`; avoid `unknown` and index
  signatures. Prose-enum string fields (e.g. `MessageEntity.type`) are deliberately kept `string`,
  not narrowed to unions.
- Tests inject a fake `fetch` rather than monkeypatching globals, and must be deterministic across
  the Node 22/24/26 CI matrix - do not rely on a real unref'd timer (e.g. `AbortSignal.timeout`)
  firing as the only thing keeping the event loop alive; settle fakes directly.

## Testing

Unit tests (`test/unit`, no network) run under both Bun and Node. The e2e suite (`test/e2e`) hits
the **real** api.telegram.org with one `describe` per Bot API method; it has no skip-if-no-token
guard and uses the strict "the call resolving is the assertion" model. The session terminators
(`logOut`, `close`) and other bot-bricking methods are `test.skip`-ed, so a full run does **not**
log the bot out - but it is slow, flood-limited, and env-limited methods (forum-only, payments, ...)
fail by design, so scope a run to what you changed. It reads `NODE_TELEGRAM_TOKEN`, `TEST_GROUP_ID`,
`TEST_USER_ID` from `.env`. Run it only via `npm run test:e2e`. The `run-tests` skill is the
authority on scoping a run, flood limits, and fixture gotchas.

## Project skills (`.claude/skills/`)

Authoritative playbooks - consult them for these workflows: `run-tests` (running/scoping/debugging
the suites), `generate-docs` (regenerating the API reference after a public method change),
`update-bot-api` (adding a new Bot API version), `release` (version bump + publish).
