---
name: generate-docs
description: How to (re)generate the API reference doc/api.md for node-telegram-bot-api. Use whenever a public TelegramBot method is added, removed, or has its signature/parameters/return type changed, or when a PR check reports doc/api.md is out of date. Covers the bun generator script, what it does and does NOT capture, and how to verify the result is committed.
---

# Generating doc/api.md

`doc/api.md` is the human-readable API reference. It is **generated**, not
hand-edited, and it is **checked into git** - so it must be regenerated and
committed whenever the public method surface changes.

## Command

```bash
bun run generate:docs        # = bun scripts/api-doc.ts
```

This rewrites `doc/api.md` in place and prints a summary
(`Wrote doc/api.md: N methods, M static props.`). It needs no token, no
network, and no extra dependencies (only the `typescript` that's already
installed).

The script is runtime-agnostic (only `node:fs/promises` + the `typescript`
package), so either runner works:

```bash
bun scripts/api-doc.ts     # what `generate:docs` uses
node scripts/api-doc.ts    # Node >=23.6 / 24 strips the TS types natively
```

## When to run

Run it after any change that alters the **public surface of the `TelegramBot`
class** in `src/telegram.ts`:

- adding, removing, or renaming a public method
- changing a method's parameters (count, names, optionality) or return type
- adding/removing a public `static` property

You do **not** need to run it for changes to method *bodies* that don't touch
the signature, or for changes outside `src/telegram.ts`.

## How it works

`scripts/api-doc.ts` walks the `TelegramBot` class with the TypeScript compiler
API (syntax only, no type checker) and emits a jsdoc2md-style reference: a table
of contents plus one section per public method (signature, `Returns`, a `See`
link to the matching Telegram Bot API method, and a parameter table). It
documents **only** the class's own public members - no inherited `EventEmitter`
methods, no "Defined in" source links, and no dump of the generated
request/reply types.

Details worth knowing when output looks off:

- **The Telegram `See` link** is derived from the first string literal passed to
  `this._form(...)` / `this._sendFile(...)` / `this._request(...)` in the method
  body. A method that delegates to another method (no direct `_form` call) gets
  **no** `See` link - that's expected.
- **Types are simplified** for readability: `ChatId -> Number | String`,
  `FileInput -> String | Stream | Buffer`, an options bag (`...Params` /
  `FileMeta`) -> `Object`, `Promise<X> -> Promise`, arrays -> `Array`, unknown
  object types -> `Object`. Extend the `mapToken` / `displayReturn` tables in
  the script if a new primitive needs a friendly name.
- **An options parameter named `form`** is displayed as `[options]`.
- **Descriptions are blank** unless the method carries a JSDoc summary or
  `@param` tags. The TS rewrite dropped the old hand-written prose, so most
  cells are empty by design. To enrich a method, add a JSDoc block above it in
  `src/telegram.ts` - the generator picks up the summary and `@param` text
  automatically. Do not hand-edit `doc/api.md`; it will be overwritten.

This is separate from `npm run generate:types` (which regenerates
`src/types/schemas.ts` from the live Telegram docs). If you regenerate types and
that adds/changes methods, regenerate docs too.

## Verify before committing

The doc must match the source. Confirm regenerating produces no diff:

```bash
bun run generate:docs
git diff --exit-code doc/api.md   # exit 0 = up to date
```

If `git diff` shows changes, commit the regenerated `doc/api.md` alongside your
code change.
