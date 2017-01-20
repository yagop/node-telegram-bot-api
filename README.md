[![Build Status](https://travis-ci.org/yagop/node-telegram-bot-api.svg?branch=master)](https://travis-ci.org/yagop/node-telegram-bot-api)
 [![Build status](https://ci.appveyor.com/api/projects/status/ujko6bsum3g5msjh/branch/master?svg=true)](https://ci.appveyor.com/project/yagop/node-telegram-bot-api/branch/master)
 [![Coverage Status](https://coveralls.io/repos/yagop/node-telegram-bot-api/badge.svg?branch=master)](https://coveralls.io/r/yagop/node-telegram-bot-api?branch=master)
 [![bitHound Score](https://www.bithound.io/github/yagop/node-telegram-bot-api/badges/score.svg)](https://www.bithound.io/github/yagop/node-telegram-bot-api)
 [![https://telegram.me/node_telegram_bot_api](https://img.shields.io/badge/💬 Telegram-node__telegram__bot__api-blue.svg)](https://telegram.me/node_telegram_bot_api)
 [![https://telegram.me/Yago_Perez](https://img.shields.io/badge/💬 Telegram-Yago__Perez-blue.svg)](https://telegram.me/Yago_Perez)

Node.js module to interact with official [Telegram Bot API](https://core.telegram.org/bots/api). A bot token is needed, to obtain one, talk to [@botfather](https://telegram.me/BotFather) and create a new bot.

**Installation:**

```sh
npm install node-telegram-bot-api
```

**Sample Usage:**

```js
var TelegramBot = require('node-telegram-bot-api');

// replace the value below with the Telegram token you receive from @BotFather
var token = 'YOUR_TELEGRAM_BOT_TOKEN';

// Create a bot that uses 'polling' to fetch new updates
var bot = new TelegramBot(token, { polling: true });

// Matches "/echo [whatever]"
bot.onText(/\/echo (.+)/, function (msg, match) {
  // 'msg' is the received Message from Telegram
  // 'match' is the result of executing the regexp above on the text content
  // of the message

  var chatId = msg.chat.id;
  var resp = match[1]; // the captured "whatever"

  // send back the matched "whatever" to the chat
  bot.sendMessage(chatId, resp);
});

// Listen for any kind of message. There are different kinds of
// messages.
bot.on('message', function (msg) {
  var chatId = msg.chat.id;

  // send a message to the chat acknowledging receipt of their message
  bot.sendMessage(chatId, "Received your message");
});
```


* * *


## Documentation

  * Usage ([release][usage-release] / [development][usage-dev])
  * Examples ([release][examples-release] / [development][examples-dev])
  * Help Information ([release][help-release] / [development][help-dev])
  * API Reference ([release][api-release] / [development][api-dev])
  * [Contributing to the Project][contributing]

_**Note**: Development is done against the **master** branch. Code for the latest release
resides on the **release** branch._

[usage-release]:https://github.com/yagop/node-telegram-bot-api/tree/release/doc/usage.md
[examples-release]:https://github.com/yagop/node-telegram-bot-api/tree/release/doc/help.md
[help-release]:https://github.com/yagop/node-telegram-bot-api/tree/release/examples
[api-release]:https://github.com/yagop/node-telegram-bot-api/tree/release/doc/api.md

[usage-dev]:https://github.com/yagop/node-telegram-bot-api/tree/master/doc/usage.md
[examples-dev]:https://github.com/yagop/node-telegram-bot-api/tree/master/doc/help.md
[help-dev]:https://github.com/yagop/node-telegram-bot-api/tree/master/examples
[api-dev]:https://github.com/yagop/node-telegram-bot-api/tree/master/doc/api.md
[contributing]:https://github.com/yagop/node-telegram-bot-api/tree/master/CONTRIBUTING.md


* * *


## Our Community

We have a [Telegram channel][tg-channel] where we post updates on
the Project. Head over and subscribe!

Some things built using this library, and might interest you:

* [tgfancy](https://github.com/GochoMugo/tgfancy): A Fancy, Higher-Level Wrapper for Telegram Bot API
* [node-telegram-bot-api-middleware](https://github.com/idchlife/node-telegram-bot-api-middleware): Middleware for node-telegram-bot-api
* [teleirc](https://github.com/FruitieX/teleirc): A simple Telegram ↔ IRC gateway


* * *


## License Information

**The MIT License (MIT)**

Copyright (c) 2015 Yago


[tg-channel]:https://telegram.me/node_telegram_bot_api
