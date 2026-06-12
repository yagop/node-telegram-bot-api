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


### Updating the API Reference i.e. generating `doc/api.md`

`doc/api.md` is generated from the TypeScript source. Whenever a public
`TelegramBot` method is added, removed, or has its signature changed,
regenerate it (the CI / PR checklist requires it to be in sync):

```bash
$ npm run generate:docs   # bun scripts/api-doc.ts
```


### Regenerating the types

`src/types/schemas.ts` is generated from the official Bot API docs - do
**not** hand-edit it. When Telegram ships new methods or fields, re-run:

```bash
$ npm run generate:types  # bun scripts/api-parser.ts
```


### Running tests

See `test/README.md` for the env vars and commands. In short:

```bash
$ npm run typecheck            # tsc --noEmit (the static-analysis gate)
$ npm run test:node:unit       # unit tests, no token required
$ npm run test:node:integration  # hits api.telegram.org, needs credentials
```

There is **no separate lint step** - `npm run typecheck` under `strict`
is the static-analysis gate.


### Building

The published artifact in `dist/` is produced by the TypeScript compiler
(there is no babel step anymore):

```bash
$ npm run build   # tsc -p tsconfig.build.json
```

[coc]:https://github.com/yagop/node-telegram-bot-api/blob/master/CODE_OF_CONDUCT.md
[license]:https://github.com/yagop/node-telegram-bot-api/blob/master/LICENSE.md
