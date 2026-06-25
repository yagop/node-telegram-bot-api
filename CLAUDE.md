# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`node-telegram-bot-api` v2: a from-scratch, runtime-agnostic TypeScript Telegram Bot API client.
Node 18+, also runs on Bun, Deno, Cloudflare Workers, and Vercel/Deno Edge. The source is
ESM/web-standard; the **published** package is dual-module - `zshy` emits both ESM (`*.js`/`*.d.ts`)
and CJS (`*.cjs`/`*.d.cts`), exposed via the `exports` map's `import`/`require` conditions, so it can
be `import`ed or `require`d. `src/core` stays Node-free, so the edge story is unchanged. There is
**no v1 compatibility**. The full design rationale and ADRs live in `redesign/ARCHITECTURE.md` -
read it before any non-trivial change; `redesign/MIGRATION.md` is the v1->v2 cheatsheet.

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

- **`src/core/`** - runtime-agnostic. The `Bot`, `Context`, `compose` middleware, the single `Api`
  client, `Transport`, `serializeParams`/`encodeForm`, `InputFile`, builders, `longPoll`,
  `webhookCallback`, framework adapters, errors. **Web-standard APIs only.**
- **`src/node/`** - the ONLY folder allowed to import `node:*`. Node-only sugar: `fromPath` (fs
  uploads), `createWebhookServer`, the managed `run()` polling runner, and the `DEBUG` stderr sink.
- **`src/types/`** - the generated schema (discriminated `Update`, `*Params`/`*Result` types).

Request pipeline (the only place serialization happens):
`Api.request` -> `serializeParams` (one `JSON.stringify` + `attach://` walk for nested files) ->
`encodeForm` (3 branches: InputFile part / form-part composite / string) -> `Transport`
(injectable `fetch`, 429/transient retry with jittered backoff, `{ok,result}` envelope unwrap).
Structured fields (`reply_markup`, entities, media, ...) are **plain typed objects**; builders
(`InlineKeyboardBuilder`, `EntityBuilder`, `MediaGroupBuilder`, ...) are optional sugar whose
`.build()` returns the same plain shape. File-bearing params are `InputFile | string` (a bare
string is always a `file_id`/URL, never a path).

Dispatch: koa-style middleware over a per-update `Context`. `bot.on(kind)`, `bot.command(name)`,
`bot.hears(trigger)` are filter middleware in the same chain - registration order wins. Two entry
points share **one** dispatch path: `bot.startPolling()` pumps the `longPoll` async generator;
`bot.handleUpdate(update)` handles a single update and is what `webhookCallback` calls.

Errors (`src/core/errors.ts`): a `TelegramBotError` base preserving `cause`, plus `NetworkError`,
`TimeoutError`, `ParseError`, `TelegramApiError` (structured fields). Callers branch on values
(`err.errorCode === 429`, `err.retryAfter`), never on message text.

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
guard, uses the strict "the call resolving is the assertion" model, and **running the full suite
logs the bot out** (a ~10 min lockout). It reads `NODE_TELEGRAM_TOKEN`, `TEST_GROUP_ID`,
`TEST_USER_ID` from `.env`. Run it only via `npm run test:e2e`. The `run-tests` skill is the
authority on scoping a run, flood limits, and fixture gotchas.

## Project skills (`.claude/skills/`)

Authoritative playbooks - consult them for these workflows: `run-tests` (running/scoping/debugging
the suites), `generate-docs` (regenerating the API reference after a public method change),
`update-bot-api` (adding a new Bot API version), `release` (version bump + publish).
