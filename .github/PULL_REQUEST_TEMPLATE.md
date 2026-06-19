<!--
Mark whichever option below applies to this PR.
For example, if your PR passes all tests, you would mark the option as so:
- [x] All tests pass
Note the 'x' in between the square brackets '[]'
-->
- [ ] `npm run check` is clean (typecheck src + test + examples, `lint:core`, `check:edge`, unit suite)
- [ ] `npm run build` is clean
- [ ] Generated files are untouched / regenerated (`src/types/schemas.ts` and `src/core/api.ts` come from `npm run generate:types`; never hand-edit)

### Description

<!-- Explain what you are trying to achieve with this PR -->

### References

<!--
Add references to other documents/pages that are relevant to this
PR, such as related issues, documentation, etc.

For example,
* Issue #1: https://github.com/yagop/node-telegram-bot-api/issues/1
* Telegram Bot API - Getting updates: https://core.telegram.org/bots/api#getting-updates
-->

---

### Running the test suite

The project ships two test layers and runs under both Bun and Node. All scripts
assume `npm install` (or `bun install`) has been run first.

#### Unit tests

Pure unit tests with no network. Safe to run anywhere — no token required.

```bash
npm test                  # Bun (bun:test) — the default unit run
npm run test:node:unit    # Node (node:test via tsx)
```

The full local gate is `npm run check` — it chains the typechecks (`src` +
`test` + `examples`), `lint:core` and `check:edge` (keeping `src/core` free of
`node:*` imports / Node globals / bundled builtins), and the unit suite.

#### E2E tests

Hit `api.telegram.org` directly. Methods that would brick the shared test bot
or need a chat it lacks (e.g. `logOut`, `close`, the forum-topic ops, …) are
`test.skip`-ed so the suite never terminates the session or floods. There is
**no skip-if-no-token guard** — without valid credentials the real calls reject
and the tests fail by design.

**Required environment variables** (read from `.env`; Bun loads it automatically)

| Var | Purpose |
| --- | --- |
| `NODE_TELEGRAM_TOKEN` | Bot token (`TEST_TELEGRAM_TOKEN` is read as a fallback). Create one via [@BotFather](https://t.me/BotFather). |
| `TEST_GROUP_ID` | Chat id where the bot can send messages (group or private). |
| `TEST_USER_ID` | A user id the bot can resolve in `TEST_GROUP_ID`. |

```bash
npm run test:e2e    # bun test --timeout 300000 test/e2e
```

> **Tip:** add the bot to a private test group, grab its id with
> [`@RawDataBot`](https://t.me/RawDataBot) (or any update logger), and
> use that id for `TEST_GROUP_ID`. The suite is slow and flood-limited, so run
> it scoped to the methods you changed (see the `run-tests` skill).
