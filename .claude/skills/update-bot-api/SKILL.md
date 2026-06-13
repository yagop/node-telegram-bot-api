---
name: update-bot-api
description: How to add support for a new Telegram Bot API version to node-telegram-bot-api. Use whenever asked to "add support for Bot API X.Y", "update to the latest Bot API", "implement the <month> Bot API changelog", or wire up new Telegram methods/types. Covers reading the changelog authoritatively, regenerating types with scripts/api-parser.ts, hand-adding the new TelegramBot methods, serializing structured fields through the _fix* pipeline, testing (unit + live e2e), and the docs/CHANGELOG steps. Defers test-running to the run-tests skill, doc regen to generate-docs, and publishing to the release skill.
---

# Adding support for a new Bot API version

The split that makes this fast: **types are generated, methods are hand-written.**
`scripts/api-parser.ts` regenerates the entire type surface from the live docs in
one command, so the only real work is adding the new public `TelegramBot` methods
in `src/telegram.ts` and wiring any new structured fields into the request
pipeline. It is version-agnostic - use placeholders (`<method>`, `<Method>Params`,
`<field>`) as the names for whatever the target changelog introduces.

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
| New **method** | `src/telegram.ts` public method | **Yes** - add it (step 3) |
| New **field on a method** (a request parameter) | flows via the `Omit<...Params>` options bag | none, **unless** it is structured (step 4) |
| New **field on an object** (a response/struct field) | `src/types/schemas.ts` | **Generated** - none |

## 2. Regenerate the types

```bash
bun scripts/api-parser.ts        # == npm run generate:types -> src/types/schemas.ts
```

This fetches the live docs and emits every documented object, the "one of" unions,
and per method `<Method>Params` / `<Method>Result`. It is **strict on purpose**:

- An **unmapped type string** is a hard error (non-zero exit) - it never falls back
  to `unknown`. If Telegram introduces a new scalar spelling, extend `mapScalar` /
  `mapType` in the parser.
- An **unresolved return type** falls back to `boolean` and is listed in the run
  summary (`reply type fell back to boolean for N method(s)`). If that is wrong,
  add the method to `RETURN_OVERRIDES` in `scripts/api-parser.ts` with the verbatim
  documented return type.

Do **not** hand-edit `src/types/schemas.ts`. New types are re-exported publicly for
free (`src/index.ts` -> `src/types/index.ts` -> `export * from "./schemas.js"`).

### Sanity-check the diff

```bash
git diff --stat src/types/schemas.ts
git diff src/types/schemas.ts | grep '^-' | grep -v '^---'   # inspect every deletion
```

Pure additions are expected. A handful of **deletions are normal and benign** -
they are almost always one of two shapes: a union gaining a member, or a field
going from required to optional (`x:` -> `x?:`). If a deletion is *not* one of
those shapes, investigate before continuing.

## 3. Add each new method to `src/telegram.ts`

Match the surrounding methods exactly (see CLAUDE.md "Request pipeline"). The
canonical shape is: positional args first, then an options bag typed
`Omit<<Method>Params, "<the positional fields>">`, spread into the payload, with a
`satisfies <Method>Params` check, delegating to `_form` (or `_sendFile` for uploads):

```ts
// 1) import the new types: any new object type used in the signature, plus the
//    method's <Method>Params / <Method>Result in the Params/Result import blocks.

// 2) the method, placed next to related ones (sends near sendMessage, etc.)
<method>(
  chatId: ChatId,
  <primaryArg>: <PrimaryArgType>,
  form: Omit<<Method>Params, "chat_id" | "<primary_arg>"> = {},
): Promise<<Method>Result> {
  return this._form("<method>", {
    ...form,
    chat_id: chatId,
    <primary_arg>: <primaryArg>,
  } satisfies <Method>Params);
}
```

Notes:
- Decide the positional/options split by which fields are documented `Required: Yes`;
  required fields become positional args, the rest live in the `form` bag.
- **Required-only methods** (no optional params) take just the positional args and
  skip the `form` bag entirely.
- ESM rule: every relative import carries a **`.js`** extension even though the
  source is `.ts`. Omitting it breaks the build.
- A **modified existing method** (a new optional request field) usually needs **no
  code change** - the field rides in automatically once `<Method>Params` regenerates
  and the method already passes `Omit<<Method>Params, ...>`. The one exception is
  serialization (step 4).

## 4. Serialize new structured fields through the `_fix*` pipeline

The Bot API expects nested objects as **JSON strings** on the form body. `_request()`
in `src/telegram.ts` normalizes them via a series of `_fix*` helpers. If a new field
is a structured object (an object/array, not a scalar), make sure it goes out
serialized - for most fields that means appending the key to the list in
`_fixJsonFields`. One entry there covers **every** method carrying that field.

Fields with bespoke handling (`reply_markup`, `reply_parameters`, the `*_entities`
family, `message_ids`, `areas`, `link_preview_options`, `suggested_post_parameters`)
already have their own `_fix*` step - extend those only if a new field is similar in
spirit. The unit tests in step 5 assert this serialization.

## 5. Unit tests (wire format)

Add a `describe` block per new method in `test/unit/telegram.test.ts`. Unit tests
stub `globalThis.fetch` and assert the outgoing URL + body params, including that
structured fields were JSON-stringified. No token, no network. Run with
`bun test test/unit` (see the **run-tests** skill for detail).

## 6. Integration / e2e tests (probe first, then assert)

**Probe the live API before writing assertions** so each test reflects real
behavior instead of a guess. A throwaway script that calls each new method against
`api.telegram.org` tells you which methods happy-path in the test chat and which
only reject. Then write, for each method, the assertion that matches what you saw:

- **Happy path** when the method works in the test chat - assert the real result.
- **`ETELEGRAM` rejection** when the method needs a live fixture that cannot be
  synthesized (a real query id, a private-chat peer, a capability the test bot
  lacks) - assert `err.code === "ETELEGRAM"`, the same pattern the suite already
  uses for methods like `approve`/`declineChatJoinRequest`.

Add the blocks to `test/integration/telegram.test.ts`, then run **scoped** to your
methods (the full suite is slow and flood-limits - see the **run-tests** skill):

```bash
bun test --timeout 300000 -t '<method1>|<method2>' test/integration/telegram.test.ts
```

Watch for `-t` substring overlap (a shorter method name can match a longer one).

## 7. Docs and coverage

- Regenerate the API reference whenever a public method was added/changed - see the
  **generate-docs** skill: `bun run generate:docs` (rewrites `doc/api.md`, commit it).
- Optionally refresh the coverage audit: `node scripts/coverage-audit.mjs`
  (rewrites `doc/integration-coverage.md`). Its output uses em dashes, which the
  commit hook rejects (step 10) - only commit it if you are also resolving that.

## 8. CHANGELOG

Add an entry under `## [Unreleased][Unreleased]` summarizing the new methods, the
modified method(s), and the headline new types, grouped by the changelog's own
section headings.

## 9. Verify gate

```bash
npm run typecheck      # tsc --noEmit over src AND test - the static-analysis gate
npm run build          # tsc -p tsconfig.build.json -> dist/
bun test test/unit     # full unit suite
```

All three must be clean before shipping.

## 10. Ship

Branch off `master`, commit, push, open a PR to `master`.

**ASCII-only commit hook:** a pre-commit hook rejects non-ASCII "smart" punctuation
(em dash U+2014, curly quotes, invisible spaces) in staged changes - emoji are
allowed. Hand-written prose (CHANGELOG, comments) must use `-`, `->`, `...`. If a
**generated** file carries em dashes, do not hand-edit it to satisfy the hook (that
diverges from the generator and reverts on the next run) - leave it out of the
commit or fix the generator separately.

Bumping the version and publishing is a **separate** step - use the **release** skill.

## Gotchas checklist

- [ ] Trusted the **raw** changelog, not a WebFetch/LLM summary (hallucinated classes).
- [ ] Generator exited 0 - no unmapped type strings, no unintended `boolean` fallbacks.
- [ ] Reviewed the `schemas.ts` diff; every deletion is a union-member add or a
      field-optional change.
- [ ] New structured fields added to a `_fix*` step (usually `_fixJsonFields`).
- [ ] `.js` extensions on all new relative imports.
- [ ] Integration assertions pinned to **probed** live behavior (happy vs ETELEGRAM).
- [ ] `typecheck` + `build` + unit suite green.
- [ ] CHANGELOG and all prose are ASCII.
