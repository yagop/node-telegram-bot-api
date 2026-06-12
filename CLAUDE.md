# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`node-telegram-bot-api` — a Node.js client for the [Telegram Bot API](https://core.telegram.org/bots/api). This branch (`feat/typescript`) is the TypeScript rewrite: hand-written source in `src/` compiles to `dist/` (the published artifact). The latest release lives on `master`; PRs target `master`.

## Commands

```bash
npm run build            # tsc -p tsconfig.build.json → dist/ (src only)
npm run typecheck        # tsc --noEmit over BOTH src/ and test/
npm run generate:types   # bun scripts/api-parser.ts → regenerate src/types/schemas.ts
```

There is **no separate lint step** — `npm run typecheck` under `strict` is the static-analysis gate. (The instructions in `test/README.md` mentioning `mocha`/`eslint` are stale; the suite is built on `node:test`.)

### Tests

**See the `run-tests` skill** (`.claude/skills/run-tests/SKILL.md`) for how to run the unit and integration suites. In short: prefer `bun` (it auto-loads `.env`), `node` also works; integration tests hit `api.telegram.org` and require `NODE_TELEGRAM_TOKEN`, `TEST_GROUP_ID`, `TEST_USER_ID` (readable from `.env`). The full integration suite is slow — scope a run to the method you changed with `bun test -t '<method>' test/integration/telegram.test.ts`, and only run the whole suite when you touch a core/shared part of the request pipeline. Some methods need special chat conditions (e.g. a forum-enabled `TEST_GROUP_ID`).

## Module system gotchas

- **ESM-only, `NodeNext`.** Every relative import inside `src/` and `test/` must carry a `.js` extension (e.g. `import { ... } from "./errors.js"`) even though the source is `.ts`. Omitting it breaks the build.
- Tests execute TypeScript directly through `tsx` (esbuild under the hood). esbuild ships a **platform-specific native binary** — if `node_modules` was populated on a different OS/arch the test runner fails with a "you installed esbuild for another platform" error; fix with `npm install` on this machine.
- The suite is written against `node:test` + `node:assert/strict` so it runs identically on Node and Bun.

## Architecture

The whole public surface is re-exported from `src/index.ts`: the `TelegramBot` class (both default and named export), the `TelegramBotPolling` / `TelegramBotWebHook` / `HttpClient` classes, the full set of generated request/reply types, and the error hierarchy.

### Request pipeline (the important part)

`src/telegram.ts` holds the `TelegramBot` class (~2000 lines, one method per Bot API method). Every API call funnels through the same path:

```
<apiMethod>()  →  _form() / _sendFile()  →  _request()  →  http.request()
```

- **`_request()` normalizes the payload** before it goes out. A series of `_fix*` helpers JSON-stringify structured fields that the Bot API expects as strings on form bodies — `reply_markup`, the `*_entities` family, `reply_parameters`, `suggested_post_parameters`, `link_preview_options`, `areas`, `message_ids`. Strings are passed through untouched, so callers may pre-serialize. **When adding a method with a new structured field, add/extend the matching `_fix*` step** — this is what the unit tests assert on.
- **`_sendFile()` handles uploads.** `prepareFile()` (in `src/utils.ts`) turns a filesystem path / `Buffer` / stream into a multipart `PreparedFile`, or, when given a plain string that isn't an existing path, treats it as a Telegram `file_id` or public URL (no upload). The path-vs-fileId behavior is gated by `options.filepath`. Thumbnails and multi-file methods use `attach://<name>` references into the form data.
- **`src/http.ts` (`HttpClient`) is the only place that touches `fetch`.** It builds the URL (`{baseApiUrl}/bot{token}[/test]/{method}`), picks `x-www-form-urlencoded` vs `multipart/form-data` (streams are buffered to `Buffer` first), and unwraps Telegram's `{ ok, result, description, error_code }` envelope. On `ok` it returns `result`; on `429` it sleeps `retry_after` and retries up to `maxRetriesOn429` (default 2); otherwise it throws.

### Inbound updates

`processUpdate(update)` is the single dispatcher for incoming updates, regardless of source. It emits `"message"` plus the matching content-type sub-event (`"text"`, `"photo"`, …), runs registered `onText` regexps and `onReplyToMessage` listeners, and for non-message updates emits the corresponding event (`callback_query`, `chat_member`, etc.). `TelegramBot` extends `EventEmitter`; the regex/reply listeners are kept in in-process arrays on the instance.

`src/polling.ts` (a `getUpdates` long-poll loop) and `src/webhook.ts` (an HTTP server) are the two update sources — both ultimately call `bot.processUpdate`. Polling and webhook are **mutually exclusive** and guarded against being active simultaneously.

### Errors

`src/errors.ts` defines one base class and three codes, also reachable via the static `TelegramBot.errors`:

- `FatalError` (`EFATAL`) — network failure or programmer error.
- `ParseError` (`EPARSE`) — response wasn't valid JSON.
- `TelegramError` (`ETELEGRAM`) — the API returned `ok: false`. Integration tests routinely branch on `err.code === "ETELEGRAM"` to tolerate chat-specific rejections.

### Types & schemas

`src/types/schemas.ts` is **generated** — do not hand-edit it. `scripts/api-parser.ts` (run with `npm run generate:types`, i.e. `bun scripts/api-parser.ts`) fetches <https://core.telegram.org/bots/api>, walks the docs with Bun's `HTMLRewriter`, and emits plain TypeScript `type` aliases (no Zod, no runtime validation): every documented object, the abstract "one of" objects as unions, and per method a `<Method>Params` (the full documented request) plus a `<Method>Result` (reply type parsed from the method's prose, with a `RETURN_OVERRIDES` fallback). The file is kept **docs-faithful** — it contains only what the API page documents; it deliberately does **not** emit convenience option aliases. Each `telegram.ts` method types its trailing options argument inline as `Omit<<Method>Params, <args passed positionally>>` (e.g. `Omit<SendMessageParams, "chat_id" | "text">`), so the positional-vs-options split lives next to the method that defines it, not in the generated file. The generator is strict: any unmappable type string or unresolved reply type is a hard error rather than `unknown`, and types carry no index signatures. A small hand-written prelude in the parser supplies library-only names (`ChatId`, `ReplyMarkup`, `InputProfilePhotoInput`, `InputFile`, `ParseMode`, `MESSAGE_TYPES`/`MessageType`). When Telegram adds methods/fields, re-run the generator instead of editing by hand. `src/internal/` has small dependency-free helpers (`debug`, magic-byte `file-type` sniffing, `mime` lookup).

## Testing approach

Unit tests **stub `globalThis.fetch`** to capture outgoing requests and assert the wire format (URL, body params, that structured fields were serialized, that uploads built the right `FormData`) — no network, no token. Integration tests run the real thing against `api.telegram.org`, throttle ~1.1s between calls to respect rate limits, and deliberately skip irreversible mutations (`logOut`, `close`, `setMyName`, profile-photo changes, sticker-set deletion, …).

For how to actually run, scope, and credential the suites — and which changes require a full-suite run — see the **`run-tests` skill** (`.claude/skills/run-tests/SKILL.md`).
