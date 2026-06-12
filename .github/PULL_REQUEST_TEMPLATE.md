<!--
Mark whichever option below applies to this PR.
For example, if your PR passes all tests, you would mark the option as so:
- [x] All tests pass
Note the 'x' in between the square brackets '[]'
-->
- [ ] All unit tests pass (`npm run test:node:unit`)
- [ ] All integration tests pass (`npm run test:node:integration`)
- [ ] `npm run typecheck` is clean
- [ ] `doc/api.md` is up to date (`bun run generate:docs` leaves no diff — required when a `TelegramBot` method signature changed)

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

The project ships two test layers and supports both the Node.js native test
runner and Bun. All scripts assume `npm install` (or `bun install`) has been
run first.

#### Unit tests

Pure unit tests with no network. Safe to run anywhere — no token required.

```bash
npm run test:node:unit     # Node — node:test runner via tsx
npm run test:bun:unit      # Bun — bun:test runner
```

#### Integration tests

Hit `api.telegram.org` directly. Tests that would mutate irreversible bot
configuration (e.g. `logOut`, `close`, `deleteWebHook`, `setMyName`,
`setMyProfilePhoto`, `deleteStickerSet`, …) are deliberately skipped.

**Required environment variables**

| Var | Purpose |
| --- | --- |
| `NODE_TELEGRAM_TOKEN` | Bot token (or `TEST_TELEGRAM_TOKEN` as fallback). Create one via [@BotFather](https://t.me/BotFather). |
| `TEST_GROUP_ID` | Chat id where the bot can send messages (group or private). |
| `TEST_USER_ID` | A user id the bot can resolve in `TEST_GROUP_ID`. |

**Optional**

| Var | Default | Purpose |
| --- | --- | --- |
| `TEST_STICKER_SET_NAME` | `pusheen` | Name of a public sticker set used in sticker tests. |
| `TEST_CUSTOM_EMOJI_ID` | `5368324170671202286` | A custom emoji id used by `getCustomEmojiStickers()`. |

```bash
NODE_TELEGRAM_TOKEN="<your-bot-token>" \
TEST_GROUP_ID="-1001234567890" \
TEST_USER_ID="123456789" \
  npm run test:node:integration

# Bun equivalent
NODE_TELEGRAM_TOKEN="<your-bot-token>" \
TEST_GROUP_ID="-1001234567890" \
TEST_USER_ID="123456789" \
  npm run test:bun:integration
```

> **Tip:** add the bot to a private test group, grab its id with
> [`@RawDataBot`](https://t.me/RawDataBot) (or any update logger), and
> use that id for `TEST_GROUP_ID`. `TEST_GROUP_ID` accepts the canonical
> negative form (`-100…`) or a positive number — the suite normalizes it.

#### Typecheck

```bash
npm run typecheck          # tsc --noEmit
```
