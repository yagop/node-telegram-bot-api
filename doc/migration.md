# Migrating from v0.67.x to v1.0.0

`v1.0.0` is the TypeScript rewrite of `node-telegram-bot-api`. The public
surface — the `TelegramBot` class, its method names, their positional
arguments, and the emitted events — is unchanged, so most bots keep working
after the changes below. This guide lists everything that is **not**
backwards-compatible.

- [Module system: ESM-only](#module-system-esm-only)
- [Bundled TypeScript types](#bundled-typescript-types)
- [Docs-faithful options (removed aliases)](#docs-faithful-options-removed-aliases)
- [`answerCallbackQuery` signature](#answercallbackquery-signature)
- [Error `response` shape](#error-response-shape)
- [Removed `NTBA_FIX_350` flag](#removed-ntba_fix_350-flag)
- [Request options](#request-options)
- [Build output](#build-output)

<a name="module-system-esm-only"></a>
## Module system: ESM-only

The package is now ESM-only (`"type": "module"`) and requires **Node.js ≥ 18**.
`require()` no longer works — use `import`:

```diff
-const TelegramBot = require('node-telegram-bot-api');
+import TelegramBot from 'node-telegram-bot-api';
```

The class is available as both the default export and a named export, plus the
helper classes and every generated type:

```ts
import TelegramBot, {
  type TelegramBotOptions,
  type Message,
  TelegramError,
} from 'node-telegram-bot-api';
```

If you are stuck on CommonJS, you can still load the package with a dynamic
import: `const { default: TelegramBot } = await import('node-telegram-bot-api')`.

<a name="bundled-typescript-types"></a>
## Bundled TypeScript types

Types ship with the package now. **Uninstall** the community typings — keeping
them will shadow the bundled, more accurate ones:

```sh
npm remove @types/node-telegram-bot-api
```

The generated types are **docs-faithful**: they contain exactly what the
[Bot API page](https://core.telegram.org/bots/api) documents, with no extra
convenience aliases (see below).

<a name="docs-faithful-options-removed-aliases"></a>
## Docs-faithful options (removed aliases)

Option fields that Telegram itself has deprecated are no longer part of the
types. The two you are most likely to hit:

**`reply_to_message_id` → `reply_parameters`**

```diff
-bot.sendMessage(chatId, 'Hi', { reply_to_message_id: msg.message_id });
+bot.sendMessage(chatId, 'Hi', { reply_parameters: { message_id: msg.message_id } });
```

**`thumb` → `thumbnail`** (on `sendAudio`, `sendDocument`, `sendVideo`,
`sendAnimation`, `sendVoice`, sticker methods, …)

```diff
-bot.sendVideo(chatId, video, { thumb: 'path/to/thumb.jpg' });
+bot.sendVideo(chatId, video, { thumbnail: 'path/to/thumb.jpg' });
```

**Reply-keyboard string shorthand → `KeyboardButton` objects**

`KeyboardButton` is now an object only — the plain-string shorthand for a
button is not part of the type:

```diff
 reply_markup: {
-  keyboard: [['Yes'], ['No']],
+  keyboard: [[{ text: 'Yes' }], [{ text: 'No' }]],
 },
```

`reply_markup` itself is unchanged — you may pass the object directly (it is
serialized for you) or a pre-stringified value.

<a name="answercallbackquery-signature"></a>
## `answerCallbackQuery` signature

The legacy positional forms `answerCallbackQuery(id, text, showAlert)` and
`answerCallbackQuery([options])`, deprecated since v0.27.1/v0.29.0, have been
removed. Use `(callbackQueryId, options)`:

```diff
-bot.answerCallbackQuery(query.id, 'Done!', true);
+bot.answerCallbackQuery(query.id, { text: 'Done!', show_alert: true });
```

<a name="error-response-shape"></a>
## Error `response` shape

Errors still expose `code` (`EFATAL` / `EPARSE` / `ETELEGRAM`) and a
`response`, but `response` is now a plain object rather than the raw
`http.IncomingMessage`:

```ts
interface TelegramErrorResponse {
  status?: number;                      // was: response.statusCode
  body?: unknown;                       // the { ok, description, error_code } envelope — unchanged
  headers?: Record<string, string>;
  raw?: unknown;                        // the underlying fetch Response, when available
}
```

`error.response.body` keeps working. If you read the status code, rename it:

```diff
-console.log(error.response.statusCode);
+console.log(error.response.status);
```

<a name="removed-ntba_fix_350-flag"></a>
## Removed `NTBA_FIX_350` flag

`filename` and `contentType` are now always resolved automatically (including
magic-byte sniffing of `Buffer`s). The `NTBA_FIX_350` environment variable is
gone — remove it; the fixed behavior is the default. You can still override
either value per call via the file-options argument:

```ts
bot.sendAudio(chatId, data, {}, { filename: 'song.mp3', contentType: 'audio/mpeg' });
```

<a name="request-options"></a>
## Request options

Networking is built on `fetch` now (no `request`/`@cypress/request`
dependency). The `request` constructor option still exists but feeds the
internal `HttpClient` (timeouts, default headers) rather than the old
`request` library — review any proxy/agent configuration you passed there.

<a name="build-output"></a>
## Build output

The compiled artifact moved from `lib/` to `dist/`. If you imported internal
files by path (unsupported, but it happened), update `.../lib/...` to
`.../dist/...`.
