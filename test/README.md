# Tests

The suite is built on the Node.js native test runner (`node:test` +
`node:assert/strict`) and runs identically under Node and Bun. There is
**no** mocha/eslint step.

## Unit tests

Pure unit tests - they stub `globalThis.fetch`, so no network and no token
is required. Safe to run anywhere.

```bash
npm run test:node:unit   # Node - node:test via tsx
npm run test:bun:unit    # Bun - bun:test runner
```

## Integration tests

These hit `api.telegram.org` directly and throttle ~1.1s between calls to
respect rate limits. Tests that would mutate irreversible bot configuration
(e.g. `logOut`, `close`, `setMyName`, `setMyProfilePhoto`, `deleteStickerSet`)
are deliberately skipped.

### Required environment variables

| Var | Purpose |
| --- | --- |
| `NODE_TELEGRAM_TOKEN` | Bot token (or `TEST_TELEGRAM_TOKEN` as a fallback). Create one via [@BotFather](https://t.me/BotFather). |
| `TEST_GROUP_ID` | Chat id where the bot can send messages. Some tests need a forum-enabled supergroup. |
| `TEST_USER_ID` | A user id the bot can resolve in `TEST_GROUP_ID`. |

### Optional

| Var | Default | Purpose |
| --- | --- | --- |
| `TEST_STICKER_SET_NAME` | `pusheen` | A public sticker set used in sticker tests. |
| `TEST_CUSTOM_EMOJI_ID` | `5368324170671202286` | A custom emoji id used by `getCustomEmojiStickers()`. |

```bash
NODE_TELEGRAM_TOKEN="<your-bot-token>" \
TEST_GROUP_ID="-1001234567890" \
TEST_USER_ID="123456789" \
  npm run test:node:integration   # or test:bun:integration
```

The full integration suite is slow. To scope a run to a single method:

```bash
bun test -t '<method>' test/integration/telegram.test.ts
```

> **Note:** the bot must be an administrator in the chat (with the relevant
> admin rights) for some tests to pass.
