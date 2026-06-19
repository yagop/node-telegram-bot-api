---
name: update-bot-api
description: How to add support for a new Telegram Bot API version to node-telegram-bot-api (v2). Use whenever asked to "add support for Bot API X.Y", "update to the latest Bot API", "implement the <month> Bot API changelog", or wire up new Telegram methods/types. Covers reading the changelog authoritatively, regenerating BOTH the type surface and the generated Api methods with scripts/api-parser.ts, the rare generator extensions (RETURN_OVERRIDES, mapScalar/mapType), and the unit + live e2e testing. Defers test-running to the run-tests skill and publishing to the release skill.
---

# Adding support for a new Bot API version

The v2 split that makes this fast: **both the types AND the methods are generated.**
`scripts/api-parser.ts` regenerates the entire type surface (`src/types/schemas.ts`)
**and** the entire `Api` client (`src/core/api.ts`) from the live docs in one command.
So a new Bot API version is, in the common case, **`npm run generate:types` + tests +
CHANGELOG** - there are no method bodies to hand-write and no per-field serialization
to wire (ADR-001 generated `Api`, ADR-002 automatic `serializeParams`). It is
version-agnostic - use placeholders (`<method>`, `<Method>Params`, `<field>`) as the
names for whatever the target changelog introduces.

## 0. Inputs

- The changelog section for the target version:
  <https://core.telegram.org/bots/api-changelog> (anchor like `#january-1-2026`).
- The main reference for per-method params/returns: <https://core.telegram.org/bots/api>.

## 1. Read the changelog from the RAW page, not a summary

WebFetch (and other LLM summarizers) **hallucinate** here - they have invented
classes that do not exist on the page. Always confirm against the raw HTML before
trusting a class/method/field list:

```bash
curl -s https://core.telegram.org/bots/api-changelog -o /tmp/changelog.html
node -e 'const t=require("fs").readFileSync("/tmp/changelog.html","utf8");
  const i=t.indexOf("<VERSION DATE>");                       // e.g. "January 1, 2026"
  if (i < 0) throw new Error("changelog: <VERSION DATE> heading not found - check the exact text");
  let s=t.slice(i-50,i+6000).replace(/<[^>]+>/g," ").replace(/&amp;/g,"&");
  console.log(s.replace(/[ \t]+/g," "));'
```

Inventory the section into four buckets - this drives the rest of the work:

| Changelog item | Where it lands | Hand-work? |
| --- | --- | --- |
| New **object / union type** | `src/types/schemas.ts` | **Generated** - none |
| New **method** | `src/core/api.ts` (`Api` class) | **Generated** - none (see §3) |
| New **field on a method** (a request parameter) | flows through `serializeParams` automatically | **none** |
| New **field on an object** (a response/struct field) | `src/types/schemas.ts` | **Generated** - none |

## 2. Regenerate types AND methods

```bash
bun scripts/api-parser.ts        # == npm run generate:types
```

This fetches the live docs and emits **two** files from one run:
- `src/types/schemas.ts` - every documented object, the "one of" unions, and per
  method `<Method>Params` / `<Method>Result`;
- `src/core/api.ts` - the generated `Api` class with one method per Bot API method,
  each shaped exactly like:

  ```ts
  sendMessage(params: T.SendMessageParams, signal?: AbortSignal): Promise<T.SendMessageResult> {
    return this.request<T.SendMessageResult>("sendMessage", params, signal);
  }
  ```

  i.e. a **single `params` object** typed `<Method>Params`, an optional `AbortSignal`,
  returning `<Method>Result`. There are no positional args and no `Omit<...>` options
  split - callers pass one object (e.g. `bot.api.sendMessage({ chat_id, text })`).

The generator is **strict on purpose**:

- An **unmapped type string** is a hard error (non-zero exit) - it never falls back
  to `unknown`. If Telegram introduces a new scalar spelling, extend `mapScalar` /
  `mapType` in `scripts/api-parser.ts`.
- An **unresolved return type** falls back to `boolean` and is listed in the run
  summary (`reply type fell back to boolean for N method(s)`). If that is wrong,
  add the method to `RETURN_OVERRIDES` in `scripts/api-parser.ts` with the verbatim
  documented return type.

Do **not** hand-edit `src/types/schemas.ts` or `src/core/api.ts` - both are generated.
New types are re-exported publicly for free (`src/core/index.ts` ->
`src/types/index.ts` -> `export * from "./schemas.js"`), and new `Api` methods surface
on `bot.api.*` automatically (the `Bot` class holds `this.api: Api` - it does NOT
extend `Api`, so it never needs per-method edits).

### Sanity-check the diff

```bash
git diff --stat src/types/schemas.ts src/core/api.ts
git diff src/types/schemas.ts | grep '^-' | grep -v '^---'   # inspect every deletion
```

Pure additions are expected. A handful of **deletions are normal and benign** -
they are almost always one of two shapes: a union gaining a member, or a field
going from required to optional (`x:` -> `x?:`). If a deletion is *not* one of
those shapes, investigate before continuing.

## 3. There is (usually) nothing to hand-add

This is the big change from v1. Because methods are generated, the work that used to
be "add the method to `src/telegram.ts` and serialize its fields" is now zero:

- **New method** - already on `Api` after §2. No code to write.
- **New optional field on an existing method** - the regenerated `<Method>Params`
  already carries it; callers can pass it. No code change.
- **Serialization** - automatic and universal. `serializeParams` (in
  `src/core/serialize.ts`, called once from `Api.request`) walks every param,
  JSON-stringifies any object/array, and hoists nested `InputFile`s to `attach://`
  refs with per-call stable indices. There is **no `_fix*` pipeline and no per-field
  list to maintain** - a new structured field is serialized for free. (This replaces
  v1's `_fixJsonFields` / `_fixReplyMarkup` / etc.)

The only hand-work that can come up, all rare and all in the **generator**, not the
library source:

- A new scalar type spelling the parser can't map -> extend `mapScalar`/`mapType`
  (§2), then re-run.
- A method whose return type the parser can't infer -> add it to `RETURN_OVERRIDES`
  (§2), then re-run.

### Context shortcuts (only for ubiquitous per-update helpers)

`Context` (in `src/core/context.ts`) has a small, curated set of ergonomic shortcuts
that infer an id from the current update and delegate to `this.api.<method>` - today
just `reply` (-> `sendMessage`) and `answerCallbackQuery`. Add a new one **only** if
the new method is a similarly ubiquitous per-update reply/answer helper (rare). Do
not add a shortcut for every new method.

## 4. Unit tests (wire format)

Unit tests are organized **per module**, not per method - there is no per-method unit
test file. Serialization of structured fields and file hoisting is asserted once,
globally, in `test/unit/serialize.test.ts` and `test/unit/encode.test.ts`; the request
envelope / retry behavior in `test/unit/transport.test.ts`. Add a case there **only**
if a new field exercises a serialization path not already covered (e.g. a new shape of
nested file). Otherwise the generated method has no bespoke unit test.

Tests **inject a fake `fetch`** instead of monkeypatching `globalThis.fetch` - `fetch`
is an injectable `Transport` option:

```ts
const { fetch } = jsonFetch([{ ok: true, result: { ... } }]);
const tr = new Transport(TOKEN, { fetch });        // or new Api(TOKEN, { fetch })
```

Run the suite with `npm test` / `bun test test/unit` (see the **run-tests** skill).

## 5. E2E tests (probe first, then assert)

The live suite is `test/e2e/methods.test.ts` - **one `describe` per Bot API method**
(~180). It uses the strict "the call resolving IS the assertion" model: every method
hits the real `api.telegram.org` and a rejection FAILS the test (no `ETELEGRAM`
swallowing). Add a `describe` block for each new method.

**Probe the live API before writing the block** so it reflects real behavior in the
test chat rather than a guess: a throwaway script that calls each new method tells you
which methods happy-path here and which only reject (forum-only, payments without a
provider, business/story/gift methods, etc.). For methods that cannot be satisfied in
the test chat, prefer the suite's existing patterns (self-contained fixtures created
and reverted within the same test); do not add a catch-and-tolerate wrapper.

Credentials come from the env (`NODE_TELEGRAM_TOKEN`, `TEST_GROUP_ID`, `TEST_USER_ID`,
loaded from `.env` by `bun test`). Run it **scoped** to your methods - the full suite
is slow, flood-limited, and its last two blocks (`logOut`, `close`) terminate the bot
session (~10 min lockout). See the **run-tests** skill.

```bash
bun test --timeout 300000 -t '<method1>|<method2>' test/e2e/methods.test.ts
```

Watch for `-t` substring overlap (a shorter method name can match a longer one).

## 6. CHANGELOG

Add an entry under `## [Unreleased][Unreleased]` in `CHANGELOG.md` summarizing the new
methods, the modified method(s), and the headline new types, grouped by the
changelog's own section headings.

## 7. Verify gate

```bash
npm run check     # full gate: typecheck (src + test + examples) + lint:core + check:edge + unit
npm run build     # tsc -p tsconfig.build.json -> dist/
```

Both must be clean before shipping. `npm run typecheck` alone is src-only; `npm run
check` is the real contributor gate (it also runs `typecheck:test` + `typecheck:examples`).
CI additionally runs the unit suite on the Node 22/24/26 matrix.

## 8. Ship

Branch off `master`, commit, push, open a PR to `master`.

**ASCII-only commit hook:** a pre-commit hook rejects non-ASCII "smart" punctuation
(em dash U+2014, curly quotes, invisible spaces) in staged changes - emoji are
allowed. Hand-written prose (CHANGELOG, comments) must use `-`, `->`, `...`. If a
**generated** file (`schemas.ts` / `api.ts`) carries em dashes, do not hand-edit it to
satisfy the hook (that diverges from the generator and reverts on the next run) - fix
the generator separately.

Bumping the version and publishing is a **separate** step - use the **release** skill.

## Gotchas checklist

- [ ] Trusted the **raw** changelog, not a WebFetch/LLM summary (hallucinated classes).
- [ ] Generator exited 0 - no unmapped type strings, no unintended `boolean` fallbacks
      (added to `RETURN_OVERRIDES` where needed).
- [ ] Reviewed the `schemas.ts` + `api.ts` diff; every deletion is a union-member add
      or a field-optional change.
- [ ] Did **not** hand-edit the generated files or try to wire serialization - new
      methods/fields are generated and serialized automatically.
- [ ] Added a `Context` shortcut only if the new method is an ubiquitous per-update
      helper (rare; usually skip).
- [ ] E2e block added per new method; assertions pinned to **probed** live behavior.
- [ ] `npm run check` + `npm run build` green.
- [ ] CHANGELOG and all prose are ASCII.
