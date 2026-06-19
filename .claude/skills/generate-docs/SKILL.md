---
name: generate-docs
description: How to (re)generate the API reference doc/api.md for node-telegram-bot-api. Use whenever a public Api method, class, function, or type is added/removed/changed, or when a PR check reports doc/api.md is out of date. Covers the two-stage pipeline (TypeDoc -> doc/api.json -> doc/api.md via scripts/generate-docs.ts), what it does and does not capture, and how to verify the result is committed.
---

# Generating doc/api.md

`doc/api.md` is the human-readable API reference. It is **generated**, not
hand-edited, and **checked into git** - so it must be regenerated and committed
whenever the public surface changes. The intermediate `doc/api.json` is
gitignored.

## Command

```bash
npm run generate:docs        # == bun scripts/generate-docs.ts
```

This runs the two stages (see below) and prints a summary of how many classes,
functions, interfaces, enums, type aliases, and variables it wrote. It needs no
token and no network - TypeDoc reads the local TypeScript source.

## The two-stage pipeline

`scripts/generate-docs.ts` deliberately separates parsing from presentation:

1. **TypeDoc -> `doc/api.json`.** The script boots TypeDoc on the package entry
   points (`src/core/index.ts`, `src/node/index.ts`) and calls
   `app.generateJson(project, ...)`. TypeDoc owns the type graph - generics,
   unions, literal types, intersections, and cross-references - and serializes
   the full project reflection to JSON. Private, protected, and `@internal`
   members are excluded (`excludePrivate` / `excludeProtected` /
   `excludeInternal`).
2. **JSON -> `doc/api.md`.** A small hand-written renderer walks the JSON and
   emits Markdown: a methods table per class (with each method's params, return
   type, and a "Bot API" link), param/return tables for functions, property
   tables for interfaces, and a section per type alias / variable / enum. Type
   references to other documented declarations become in-page links. It imports
   TypeDoc's public `ReflectionKind` enum so the kind numbers track the
   installed TypeDoc version.

Why the split: TypeDoc is the robust parser; the script is the only place that
decides what the docs *look* like. The JSON stays on disk as an inspectable
intermediate.

## When to run

Regenerate after any change to the **public surface**:

- adding, removing, or renaming a class, function, interface, enum, variable, or
  exported type alias;
- changing a method's parameters, return type, or its `Api`-method `{@link}`
  comment;
- regenerating types with `npm run generate:types` (new methods/types appear
  automatically).

You do **not** need to run it for changes to method *bodies* that don't change a
signature, or for private/internal code.

## The Bot API links

Every generated `Api` method carries a TSDoc comment (emitted by the type
generator, `scripts/api-parser.ts`) of the form
`/** {@link https://core.telegram.org/bots/api#sendmessage sendMessage} */`. The
renderer turns that into the method's "Bot API" column link. To change those
links, change the generator - do not hand-edit `src/core/api.ts`.

## Verify before committing

The doc must match the source. Confirm regenerating produces no diff:

```bash
npm run generate:docs
git diff --exit-code doc/api.md   # exit 0 = up to date
```

If `git diff` shows changes, commit the regenerated `doc/api.md` alongside your
code change. `doc/api.json` is gitignored - never commit it.

This is separate from `npm run generate:types` (which regenerates
`src/types/schemas.ts` and `src/core/api.ts` from the live Telegram docs). If you
regenerate types and that adds/changes the public surface, regenerate docs too.

## Tweak the presentation

Output layout (tables vs. fenced blocks, what gets a heading, how a type renders)
lives entirely in `scripts/generate-docs.ts`. In particular `renderType` handles
each TypeDoc type variant; add a case there if a new type shape renders poorly,
and `slug()` must keep matching GitHub's anchor algorithm (it preserves
underscores) so in-page links resolve.
