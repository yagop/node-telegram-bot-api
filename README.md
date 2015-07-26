[![Build Status](https://travis-ci.org/yagop/node-telegram-bot-api.svg?branch=master)](https://travis-ci.org/yagop/node-telegram-bot-api) [![Build status](https://ci.appveyor.com/api/projects/status/ujko6bsum3g5msjh/branch/master?svg=true)](https://ci.appveyor.com/project/yagop/node-telegram-bot-api/branch/master) [![Coverage Status](https://coveralls.io/repos/yagop/node-telegram-bot-api/badge.svg?branch=master)](https://coveralls.io/r/yagop/node-telegram-bot-api?branch=master) [![bitHound Score](https://www.bithound.io/github/yagop/node-telegram-bot-api/badges/score.svg)](https://www.bithound.io/github/yagop/node-telegram-bot-api)

Node.js module to interact with official [Telegram Bot API](https://core.telegram.org/bots/api). A bot token is needed, to obtain one, talk to [@botfather](telegram.me/BotFather) and create a new bot.

```sh
npm install node-telegram-bot-api
```

```js
var TelegramBot = require('node-telegram-bot-api');

var token = 'YOUR_TELEGRAM_BOT_TOKEN';
// Setup polling way
var bot = new TelegramBot(token, {polling: true});
bot.on('message', function (msg) {
  var chatId = msg.chat.id;
  // photo can be: a file path, a stream or a Telegram file_id
  var photo = 'bot.gif';
  bot.sendPhoto(chatId, photo, {caption: "I'm a bot!"});
});
```

There are some other examples on [examples](https://github.com/yagop/node-telegram-bot-api/tree/master/examples).

* * *


<!-- Start src/telegram.js -->

## TelegramBot

Both request method to obtain messages are implemented. To use standard polling, set `polling: true`
on `options`. Notice that [webHook](https://core.telegram.org/bots/api#setwebhook) will need a valid (not self signed) SSL certificate.
Emmits `message` when a message arrives.

See: https://core.telegram.org/bots/api

### Params:

* **String** *token* Bot Token
* **Object** *[options]*
* **Boolean|Object** *[options.polling=false]* Set true to enable polling
* **String|Number** *[options.polling.timeout=4]* Polling time
* **Boolean|Object** *[options.webHook=false]* Set true to enable WebHook
* **String** *[options.webHook.key]* PEM private key to webHook server
* **String** *[options.webHook.cert]* PEM certificate key to webHook server

## getMe()

Returns basic information about the bot in form of a `User` object.

### Return:

* **Promise**

## setWebHook(url)

Specify an url to receive incoming updates via an outgoing webHook.

See: https://core.telegram.org/bots/api#setwebhook

### Params:

* **String** *url* URL where Telegram will make HTTP Post. Leave empty to delete webHook.

## getUpdates([timeout], [limit], [offset])

Use this method to receive incoming updates using long polling

See: https://core.telegram.org/bots/api#getupdates

### Params:

* **Number|String** *[timeout]* Timeout in seconds for long polling.
* **Number|String** *[limit]* Limits the number of updates to be retrieved.
* **Number|String** *[offset]* Identifier of the first update to be returned.

### Return:

* **Promise** Updates

## sendMessage(chatId, text, [options])

Send text message.

See: https://core.telegram.org/bots/api#sendmessage

### Params:

* **Number|String** *chatId* Unique identifier for the message recipient
* **Sting** *text* Text of the message to be sent
* **Object** *[options]* Additional Telegram query options

### Return:

* **Promise**

## forwardMessage(chatId, fromChatId, messageId)

Forward messages of any kind.

### Params:

* **Number|String** *chatId* Unique identifier for the message recipient
* **Number|String** *fromChatId* Unique identifier for the chat where the original message was sent
* **Number|String** *messageId* Unique message identifier

### Return:

* **Promise**

## sendPhoto(chatId, photo, [options])

Send photo

See: https://core.telegram.org/bots/api#sendphoto

### Params:

* **Number|String** *chatId* Unique identifier for the message recipient
* **String|stream.Stream** *photo* A file path or a Stream. Can also be a `file_id` previously uploaded
* **Object** *[options]* Additional Telegram query options

### Return:

* **Promise**

## sendAudio(chatId, audio, [options])

Send audio

See: https://core.telegram.org/bots/api#sendaudio

### Params:

* **Number|String** *chatId* Unique identifier for the message recipient
* **String|stream.Stream** *audio* A file path or a Stream. Can also be a `file_id` previously uploaded.
* **Object** *[options]* Additional Telegram query options

### Return:

* **Promise**

## sendDocument(chatId, A, [options])

Send Document

See: https://core.telegram.org/bots/api#sendDocument

### Params:

* **Number|String** *chatId* Unique identifier for the message recipient
* **String|stream.Stream** *A* file path or a Stream. Can also be a `file_id` previously uploaded.
* **Object** *[options]* Additional Telegram query options

### Return:

* **Promise**

## sendSticker(chatId, A, [options])

Send .webp stickers.

See: https://core.telegram.org/bots/api#sendsticker

### Params:

* **Number|String** *chatId* Unique identifier for the message recipient
* **String|stream.Stream** *A* file path or a Stream. Can also be a `file_id` previously uploaded.
* **Object** *[options]* Additional Telegram query options

### Return:

* **Promise**

## sendVideo(chatId, A, [options])

Send video files, Telegram clients support mp4 videos (other formats may be sent whith `sendDocument`)

See: https://core.telegram.org/bots/api#sendvideo

### Params:

* **Number|String** *chatId* Unique identifier for the message recipient
* **String|stream.Stream** *A* file path or a Stream. Can also be a `file_id` previously uploaded.
* **Object** *[options]* Additional Telegram query options

### Return:

* **Promise**

## sendChatAction(chatId, action)

Send chat action.
`typing` for text messages,
`upload_photo` for photos, `record_video` or `upload_video` for videos,
`record_audio` or `upload_audio` for audio files, `upload_document` for general files,
`find_location` for location data.

See: https://core.telegram.org/bots/api#sendchataction

### Params:

* **Number|String** *chatId* Unique identifier for the message recipient
* **String** *action* Type of action to broadcast.

### Return:

* **Promise**

## getUserProfilePhotos(userId, [offset], [limit])

Use this method to get a list of profile pictures for a user.
Returns a [UserProfilePhotos](https://core.telegram.org/bots/api#userprofilephotos) object.

See: https://core.telegram.org/bots/api#getuserprofilephotos

### Params:

* **Number|String** *userId* Unique identifier of the target user
* **Number** *[offset]* Sequential number of the first photo to be returned. By default, all photos are returned.
* **Number** *[limit]* Limits the number of photos to be retrieved. Values between 1—100 are accepted. Defaults to 100.

### Return:

* **Promise**

## sendLocation(chatId, latitude, longitude, [options])

Send location.
Use this method to send point on the map.

See: https://core.telegram.org/bots/api#sendlocation

### Params:

* **Number|String** *chatId* Unique identifier for the message recipient
* **Float** *latitude* Latitude of location
* **Float** *longitude* Longitude of location
* **Object** *[options]* Additional Telegram query options

### Return:

* **Promise**

<!-- End src/telegram.js -->
