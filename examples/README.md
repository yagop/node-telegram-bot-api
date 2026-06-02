# Examples

Runnable TypeScript examples for `node-telegram-bot-api`.

| Example | What it shows |
| --- | --- |
| [`polling.ts`](./polling.ts) | Long-polling bot: `onText` commands, sending files, inline keyboards, `callback_query` |
| [`webhook/express.ts`](./webhook/express.ts) | Receiving updates through an Express route |
| [`webhook/https.ts`](./webhook/https.ts) | Built-in webhook server with a self-signed certificate |
| [`webhook/heroku.ts`](./webhook/heroku.ts) | Webhook behind Heroku's SSL termination |
| [`game/game.ts`](./game/game.ts) | HTML5 games via `sendGame` + `answerCallbackQuery` |

## Running

The examples are written in TypeScript and run directly with
[`tsx`](https://github.com/privatenumber/tsx) — no build step:

```sh
export TELEGRAM_TOKEN="<token from @BotFather>"
npx tsx examples/polling.ts
```

The webhook and game examples additionally need Express:

```sh
npm i express
npx tsx examples/webhook/express.ts
```

In your own project, import from the package name:

```ts
import TelegramBot from 'node-telegram-bot-api';
```

(The examples use that same import; within this repo it resolves to the local
build via the package's `exports` map.)
