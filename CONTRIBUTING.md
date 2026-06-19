# Contributing

> If you are willing to contribute, first you should know that
> I will love you and so will the Telegram Bot community.

Before proceeding any further, read the following documents:

1. [Code of Conduct][coc]
1. [License][license]

## General Information

### Creating a Github issue:

1. Ensure that your issue does **not** already exist. [Do a search](https://github.com/yagop/node-telegram-bot-api/issues).
2. Browse through [StackOverflow](https://stackoverflow.com/search?q=telegram+nodejs) and other similar platforms.
3. Should you open your issue, ensure you use the English language for
   the wider target audience.
4. Be patient please.


### Keeping up with Bot API releases

Both the type surface and the API client are **generated** from the official
Bot API docs - never hand-edit them:

- `src/types/schemas.ts` - every object, union, and per-method `<Method>Params` /
  `<Method>Result` type.
- `src/core/api.ts` - the generated `Api` class, one method per Bot API method.

When Telegram ships new methods or fields, re-run (one command emits both
files):

```bash
$ npm run generate:types   # bun scripts/api-parser.ts
```

The generator is strict: an unmapped type string is a hard error rather than
`unknown`, and an unresolved return type falls back to `boolean` (reported in the
run summary; add the method to `RETURN_OVERRIDES` in `scripts/api-parser.ts` if
that is wrong). The full flow, including the rare generator extensions, is in the
`update-bot-api` skill (`.claude/skills/update-bot-api/SKILL.md`).


### Running tests

The contributor gate is `npm run check` - run it before opening a PR. It chains
the typechecks (`src` + `test` + `examples`), `lint:core` and `check:edge`
(keeping `src/core` free of `node:*` imports / Node globals / bundled builtins),
and the unit suite:

```bash
$ npm run check               # full local gate (see package.json for the parts)
$ npm test                    # unit suite alone, via Bun (no token required)
$ npm run test:node:unit      # same suite via Node's node:test + tsx
```

The e2e suite hits the real `api.telegram.org` and needs credentials, read from
`.env` (Bun loads it automatically): `NODE_TELEGRAM_TOKEN`, `TEST_GROUP_ID`,
`TEST_USER_ID`. It is slow, flood-limited, and its last two blocks (`logOut`,
`close`) terminate the bot session, so run it scoped, only via:

```bash
$ npm run test:e2e            # bun test --timeout 300000 test/e2e
```

See the `run-tests` skill (`.claude/skills/run-tests/SKILL.md`) for scoping a
run, flood limits, and fixture gotchas.


### Building

The published artifact in `dist/` is produced by the TypeScript compiler
(there is no babel step anymore):

```bash
$ npm run build   # tsc -p tsconfig.build.json
```

[coc]:https://github.com/yagop/node-telegram-bot-api/blob/master/CODE_OF_CONDUCT.md
[license]:https://github.com/yagop/node-telegram-bot-api/blob/master/LICENSE.md
