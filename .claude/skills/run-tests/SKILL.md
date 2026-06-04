---
name: run-tests
description: How to run this repo's tests (node-telegram-bot-api). Use whenever running, scoping, or debugging the unit or integration suite, after adding or modifying a TelegramBot method, or when setting up the integration env vars (NODE_TELEGRAM_TOKEN, TEST_GROUP_ID, TEST_USER_ID). Covers bun (preferred) and node runners, scoping a run to a single method, methods that need special chat conditions (e.g. a forum group), and when a full-suite run is required.
---

# Running the tests

Two suites:

- **Unit** (`test/unit/`) - stub `globalThis.fetch` to assert the outgoing wire format (URL, body params, that structured fields were serialized, that uploads built the right `FormData`). No network, no token. Fast.
- **Integration** (`test/integration/`) - hit the real `api.telegram.org`. One `describe("<methodName>")` block per Bot API method. Throttle ~1.1s between calls to respect rate limits, and deliberately skip irreversible mutations (`logOut`, `close`, `setMyName`, profile-photo changes, sticker-set deletion, ...). Needs credentials (below) and is **slow**.

Both suites are written against `node:test` + `node:assert/strict`, so they run identically on **bun** (preferred here) and **node**.

The static-analysis gate is `npm run typecheck` (`tsc --noEmit` over BOTH `src/` and `test/`, under `strict`). There is **no separate lint step**. Run it after any code or test change.

## Runner: bun (preferred) vs node

`bun` is preferred - it runs the TypeScript directly and **auto-loads `.env`** from the repo root. `node` works too but here `node` is a bun shim, so real-node-only commands (`--env-file`, `npm`) may be unavailable; prefer the bun forms when in doubt.

| | bun (preferred) | node |
| --- | --- | --- |
| Unit, all | `bun test test/unit` | `npm run test:node:unit` |
| Integration, all | `bun test --timeout 120000 test/integration` | `npm run test:node:integration` |
| One file | `bun test test/unit/utils.test.ts` | `node --test --import tsx test/unit/utils.test.ts` |
| One test/describe by name | `bun test -t '<pattern>' <file>` | `node --test --import tsx --test-name-pattern='<pattern>' <file>` |

`test/run-unit.mjs` / `test/run-integration.mjs` exist only because native `node --test` glob support landed in Node 22; to target one file/test, invoke the runner directly as above.

Tests execute TypeScript through `tsx` (esbuild). esbuild ships a **platform-specific native binary** - if `node_modules` was populated on a different OS/arch the runner fails with "you installed esbuild for another platform"; fix with `npm install` on this machine.

## Integration credentials (required)

`test:node:integration` throws unless these are set:

- `NODE_TELEGRAM_TOKEN` (or `TEST_TELEGRAM_TOKEN`) - the bot token.
- `TEST_GROUP_ID` - a chat the bot can post to.
- `TEST_USER_ID` - a user id the bot can resolve in `TEST_GROUP_ID`.

These **may be read from a `.env`** in the repo root. `bun test` loads `.env` automatically. With the node runner, pass `node --env-file=.env test/run-integration.mjs` (real Node only) or export the vars first.

The bot must be an **admin in `TEST_GROUP_ID`** with the relevant rights, or capability-dependent tests fail.

Optional vars:

- `TEST_STICKER_SET_NAME` (default `"pusheen"`) and `TEST_CUSTOM_EMOJI_ID` (has a default).
- `TEST_SUPERGROUP_100_MEMBERS_ID` - a supergroup with >=100 members the bot admins and that owns a sticker set; enables the `setChatStickerSet` / `deleteChatStickerSet` happy-path blocks (those describes are omitted when unset).

## After adding or changing ONE method: run ONLY that method

The full integration suite is ~180 throttled calls and takes several minutes, so **scope the run** to the method you touched. The `-t` / `--test-name-pattern` value is a regex matched against the full test name (the `describe` path + `it` title):

```bash
# bun (preferred)
bun test --timeout 120000 -t 'sendDice' test/integration/telegram.test.ts
# node
node --test --import tsx --test-name-pattern='sendDice' test/integration/telegram.test.ts
```

Also run the matching unit block (`bun test -t 'sendDice' test/unit/telegram.test.ts`) and `npm run typecheck`.

Watch for **substring overlap**: `-t 'sendMessage'` also matches `sendMessageDraft`; `-t 'copyMessage'` also matches `copyMessages`. Anchor or narrow the pattern (e.g. `-t 'copyMessage\b'`) when that matters.

## Methods that need special chat conditions

Some integration blocks only pass when the target chat has a specific capability. If a scoped run fails at setup with `ETELEGRAM`, check the chat, not the code:

- **Forum methods and any `message_thread_id` test** (`createForumTopic`, `editForumTopic`, `sendMessage`/`sendDice`/`copyMessage`/... into a topic): `TEST_GROUP_ID` must be a **forum-enabled supergroup**. A plain group returns `400: the chat is not a forum`. (The `.env` group in this environment is NOT forum-enabled - see the `test-group-not-forum` memory.)
- **`setChatStickerSet` / `deleteChatStickerSet`**: require `TEST_SUPERGROUP_100_MEMBERS_ID` (set, with the bot as admin, owning a sticker set).
- **`createInvoiceLink` `need_*` / `send_*_to_provider`**: not exercisable with an XTR (Stars) invoice - a Stars invoice has no provider and collects no buyer info (`STARS_INVOICE_INVALID`). They need a real provider token.
- **Owner-targeted admin methods** (`promoteChatMember`, `setChatAdministratorCustomTitle`): `TEST_USER_ID` is the chat owner and cannot be promoted/restricted, so those tests assert the expected `TelegramError` rejection rather than a happy path.

## When to run the FULL suite

Scope-to-one-method applies to a leaf method. If you change a **core / shared** part of the pipeline, every method is affected - run the **full unit suite** (always) and the **full integration suite** (when the change alters wire behavior):

- `_request()` and the `_fix*` payload normalizers, `_form()` / `_sendFile()` in `src/telegram.ts`.
- `prepareFile()` in `src/utils.ts` (upload handling).
- `src/http.ts` (`HttpClient` - URL building, content-type selection, 429 retry, envelope unwrapping).
- `processUpdate` dispatch, `src/polling.ts`, `src/webhook.ts`, `src/errors.ts`.
- Regenerating `src/types/schemas.ts`.

```bash
bun test test/unit                              # always after a core change
bun test --timeout 120000 test/integration      # when wire behavior changed (slow)
npm run typecheck
```

## Coverage audit

`node scripts/coverage-audit.mjs` diffs each method's full param set against what the integration tests actually pass, and rewrites `doc/integration-coverage.md` (a checklist of untested methods and option params). Run it after adding tests to confirm the gap closed.
