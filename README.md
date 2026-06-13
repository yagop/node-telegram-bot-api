<h1 align="center">Node.js Telegram Bot API</h1>

<div align="center">

Node.js module to interact with the official [Telegram Bot API](https://core.telegram.org/bots/api).


[![Bot API](https://img.shields.io/badge/Bot%20API-v.10.1-00aced.svg?style=flat-square&logo=telegram)](https://core.telegram.org/bots/api)
[![npm package](https://img.shields.io/npm/v/node-telegram-bot-api?logo=npm&style=flat-square)](https://www.npmjs.org/package/node-telegram-bot-api)
[![Coverage Status](https://img.shields.io/codecov/c/github/yagop/node-telegram-bot-api?style=flat-square&logo=codecov)](https://codecov.io/gh/yagop/node-telegram-bot-api)

[![https://telegram.me/node_telegram_bot_api](https://img.shields.io/badge/💬%20Telegram-Channel-blue.svg?style=flat-square)](https://telegram.me/node_telegram_bot_api)
[![https://t.me/+_IC8j_b1wSFlZTVk](https://img.shields.io/badge/💬%20Telegram-Group-blue.svg?style=flat-square)](https://t.me/+_IC8j_b1wSFlZTVk)
[![https://telegram.me/Yago_Perez](https://img.shields.io/badge/💬%20Telegram-Yago_Perez-blue.svg?style=flat-square)](https://telegram.me/Yago_Perez)

</div>

## 📦 Install

```sh
npm i node-telegram-bot-api
```

> ✍️ **Note:** This package is **ESM-only** and requires **Node.js ≥ 18**. Use
> `import` (not `require`). **TypeScript types are bundled** — do **not** install
> `@types/node-telegram-bot-api` (it would shadow the bundled, more accurate
> types). Upgrading from `0.6x`? See the [migration notes in the changelog][migration].

## 🚀 Usage

```ts
import TelegramBot from 'node-telegram-bot-api';

// replace the value below with the Telegram token you receive from @BotFather
const token = 'YOUR_TELEGRAM_BOT_TOKEN';

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

// Matches "/echo [whatever]" - the leading ^ anchors the command to the start of
// the message, so it won't match "/echo" embedded in a URL or mid-sentence.
bot.onText(/^\/echo (.+)/, (msg, match) => {
  // 'msg' is the received Message from Telegram
  // 'match' is the result of executing the regexp above on the text content
  // of the message

  const chatId = msg.chat.id;
  const resp = match?.[1] ?? ''; // the captured "whatever"

  // send back the matched "whatever" to the chat
  bot.sendMessage(chatId, resp);
});

// Listen for any kind of message. There are different kinds of messages.
bot.on('message', (msg) => {
  const chatId = msg.chat.id;

  // send a message to the chat acknowledging receipt of their message
  bot.sendMessage(chatId, 'Received your message');
});
```

More runnable examples live in the [`examples/`](./examples) directory.

## 📚 Documentation

* [Usage][usage]
* [Examples][examples]
* [Migration guide (0.6x → 1.0)][migration]
* [Tutorials][tutorials]
* [Help Information][help]
* [API Reference][api] — generated from source; the package also ships its own TypeScript types, and method signatures mirror the [official Bot API][bot-api]
* [Contributing to the Project][contributing]

_**Note**: Code for the latest release resides on the **master** branch, and
pull requests should target **master**._


## 💭 Community

We thank all the developers in the Open-Source community who continuously
take their time and effort in advancing this project.
See our [list of contributors][contributors].

We have a [Telegram channel][tg-channel] where we post updates on
the Project. Head over and subscribe!

We also have a [Telegram  group][tg-group] to discuss issues related to this library.

Some things built using this library that might interest you:

* [tgfancy](https://github.com/GochoMugo/tgfancy): A fancy, higher-level wrapper for Telegram Bot API
* [node-telegram-bot-api-middleware](https://github.com/idchlife/node-telegram-bot-api-middleware): Middleware for node-telegram-bot-api
* [teleirc](https://github.com/FruitieX/teleirc): A simple Telegram ↔ IRC gateway
* [bot-brother](https://github.com/SerjoPepper/bot-brother): Node.js library to help you easily create telegram bots
* [redbot](https://github.com/guidone/node-red-contrib-chatbot): A Node-RED plugin to create telegram bots visually
* [node-telegram-keyboard-wrapper](https://github.com/alexandercerutti/node-telegram-keyboard-wrapper): A wrapper to improve keyboards structures creation through a more easy-to-see way (supports Inline Keyboards, Reply Keyboard, Remove Keyboard and Force Reply)
* [beetube-bot](https://github.com/kodjunkie/beetube-bot): A telegram bot for music, videos, movies, EDM tracks, torrent downloads, files and more.
* [telegram-inline-calendar](https://github.com/VDS13/telegram-inline-calendar): Date and time picker and inline calendar for Node.js telegram bots.
* [telegram-captcha](https://github.com/VDS13/telegram-captcha): Telegram bot to protect Telegram groups from automatic bots.
* [@toptl/node-telegram-bot-api](https://github.com/top-tl/node-telegram-bot-api): Plugin for TOP.TL, the Telegram directory. Auto-tracks bot stats and enables vote checking.


## 👥 Contributors

<p align="center">
  <a href="https://github.com/yagop/node-telegram-bot-api/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=yagop/node-telegram-bot-api" />
  </a>
</p>

## License

**The MIT License (MIT)**

Copyright © 2019 Yago

[usage]:https://github.com/yagop/node-telegram-bot-api/tree/master/doc/usage.md
[examples]:https://github.com/yagop/node-telegram-bot-api/tree/master/examples
[migration]:https://github.com/yagop/node-telegram-bot-api/blob/master/CHANGELOG.md#migrating-from-v067x
[api]:https://github.com/yagop/node-telegram-bot-api/tree/master/doc/api.md
[bot-api]:https://core.telegram.org/bots/api
[help]:https://github.com/yagop/node-telegram-bot-api/tree/master/doc/help.md
[tutorials]:https://github.com/yagop/node-telegram-bot-api/tree/master/doc/tutorials.md
[contributing]:https://github.com/yagop/node-telegram-bot-api/tree/master/CONTRIBUTING.md
[contributors]:https://github.com/yagop/node-telegram-bot-api/graphs/contributors
[tg-channel]:https://telegram.me/node_telegram_bot_api
[tg-group]:https://t.me/+UTbprHdcw0JdZdbL
