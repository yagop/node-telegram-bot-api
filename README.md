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

bot.onText(/\/echo (.+)/, function (msg, match) {
  var fromId = msg.from.id;
  var resp = match[1];
  bot.sendMessage(fromId, resp);
});

// Any kind of message
bot.on('message', function (msg) {
  var chatId = msg.chat.id;
  // photo can be: a file path, a stream or a Telegram file_id
  var photo = 'cats.png';
  bot.sendPhoto(chatId, photo, {caption: 'Lovely kittens'});
});
```

There are some other examples on [examples](https://github.com/yagop/node-telegram-bot-api/tree/master/examples).

### Events
Every time  TelegramBot receives a message, it emits a `message`. Depending on which  [message](https://core.telegram.org/bots/api#message) was received, emits an event from this ones: `text`, `audio`, `document`, `photo`, `sticker`, `video`, `voice`, `contact`, `location`, `new_chat_participant`, `left_chat_participant`, `new_chat_title`, `new_chat_photo`, `delete_chat_photo`, `group_chat_created`. Its much better to listen a specific event rather than a `message` in order to stay safe from the content.
* * *

### WebHooks

Telegram only supports HTTPS connections to WebHooks, in order to set a WebHook a private key file and public certificate must be used. Since August 29, 2015 Telegram supports self signed ones, to generate them:
```bash
# Our private cert will be key.pem, keep in private this file.
openssl genrsa -out key.pem 2048
# Our public certificate will be crt.pem
openssl req -new -sha256 -key key.pem -out crt.pem
```
Once they are generated, the `crt.pem` can be provided to `telegramBot.setWebHook(url, crt)` as `crt`.

## API Reference
<a name="TelegramBot"></a>
## TelegramBot
TelegramBot

**Kind**: global class  
**See**: https://core.telegram.org/bots/api  

* [TelegramBot](#TelegramBot)
  * [new TelegramBot(token, [options])](#new_TelegramBot_new)
  * [.getMe()](#TelegramBot+getMe) ⇒ <code>Promise</code>
  * [.setWebHook(url, [cert])](#TelegramBot+setWebHook)
  * [.getUpdates([timeout], [limit], [offset])](#TelegramBot+getUpdates) ⇒ <code>Promise</code>
  * [.sendMessage(chatId, text, [options])](#TelegramBot+sendMessage) ⇒ <code>Promise</code>
  * [.forwardMessage(chatId, fromChatId, messageId)](#TelegramBot+forwardMessage) ⇒ <code>Promise</code>
  * [.sendPhoto(chatId, photo, [options])](#TelegramBot+sendPhoto) ⇒ <code>Promise</code>
  * [.sendAudio(chatId, audio, [options])](#TelegramBot+sendAudio) ⇒ <code>Promise</code>
  * [.sendDocument(chatId, A, [options])](#TelegramBot+sendDocument) ⇒ <code>Promise</code>
  * [.sendSticker(chatId, A, [options])](#TelegramBot+sendSticker) ⇒ <code>Promise</code>
  * [.sendVideo(chatId, A, [options])](#TelegramBot+sendVideo) ⇒ <code>Promise</code>
  * [.sendVoice(chatId, voice, [options])](#TelegramBot+sendVoice) ⇒ <code>Promise</code>
  * [.sendChatAction(chatId, action)](#TelegramBot+sendChatAction) ⇒ <code>Promise</code>
  * [.getUserProfilePhotos(userId, [offset], [limit])](#TelegramBot+getUserProfilePhotos) ⇒ <code>Promise</code>
  * [.sendLocation(chatId, latitude, longitude, [options])](#TelegramBot+sendLocation) ⇒ <code>Promise</code>
  * [.getFile(fileId)](#TelegramBot+getFile) ⇒ <code>Promise</code>
  * [.getFileLink(fileId)](#TelegramBot+getFileLink) ⇒ <code>Promise</code>
  * [.downloadFile(fileId, downloadDir)](#TelegramBot+downloadFile) ⇒ <code>Promise</code>
  * [.onText(regexp, callback)](#TelegramBot+onText)

<a name="new_TelegramBot_new"></a>
### new TelegramBot(token, [options])
Both request method to obtain messages are implemented. To use standard polling, set `polling: true`
on `options`. Notice that [webHook](https://core.telegram.org/bots/api#setwebhook) will need a SSL certificate.
Emits `message` when a message arrives.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| token | <code>String</code> |  | Bot Token |
| [options] | <code>Object</code> |  |  |
| [options.polling] | <code>Boolean</code> &#124; <code>Object</code> | <code>false</code> | Set true to enable polling or set options |
| [options.polling.timeout] | <code>String</code> &#124; <code>Number</code> | <code>4</code> | Polling time |
| [options.polling.interval] | <code>String</code> &#124; <code>Number</code> | <code>2000</code> | Interval between requests in miliseconds |
| [options.webHook] | <code>Boolean</code> &#124; <code>Object</code> | <code>false</code> | Set true to enable WebHook or set options |
| [options.webHook.key] | <code>String</code> |  | PEM private key to webHook server. |
| [options.webHook.cert] | <code>String</code> |  | PEM certificate (public) to webHook server. |

<a name="TelegramBot+getMe"></a>
### telegramBot.getMe() ⇒ <code>Promise</code>
Returns basic information about the bot in form of a `User` object.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#getme  
<a name="TelegramBot+setWebHook"></a>
### telegramBot.setWebHook(url, [cert])
Specify an url to receive incoming updates via an outgoing webHook.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#setwebhook  

| Param | Type | Description |
| --- | --- | --- |
| url | <code>String</code> | URL where Telegram will make HTTP Post. Leave empty to delete webHook. |
| [cert] | <code>String</code> &#124; <code>stream.Stream</code> | PEM certificate key (public). |

<a name="TelegramBot+getUpdates"></a>
### telegramBot.getUpdates([timeout], [limit], [offset]) ⇒ <code>Promise</code>
Use this method to receive incoming updates using long polling

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**Returns**: <code>Promise</code> - Updates  
**See**: https://core.telegram.org/bots/api#getupdates  

| Param | Type | Description |
| --- | --- | --- |
| [timeout] | <code>Number</code> &#124; <code>String</code> | Timeout in seconds for long polling. |
| [limit] | <code>Number</code> &#124; <code>String</code> | Limits the number of updates to be retrieved. |
| [offset] | <code>Number</code> &#124; <code>String</code> | Identifier of the first update to be returned. |

<a name="TelegramBot+sendMessage"></a>
### telegramBot.sendMessage(chatId, text, [options]) ⇒ <code>Promise</code>
Send text message.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#sendmessage  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> &#124; <code>String</code> | Unique identifier for the message recipient |
| text | <code>String</code> | Text of the message to be sent |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+forwardMessage"></a>
### telegramBot.forwardMessage(chatId, fromChatId, messageId) ⇒ <code>Promise</code>
Forward messages of any kind.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> &#124; <code>String</code> | Unique identifier for the message recipient |
| fromChatId | <code>Number</code> &#124; <code>String</code> | Unique identifier for the chat where the original message was sent |
| messageId | <code>Number</code> &#124; <code>String</code> | Unique message identifier |

<a name="TelegramBot+sendPhoto"></a>
### telegramBot.sendPhoto(chatId, photo, [options]) ⇒ <code>Promise</code>
Send photo

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#sendphoto  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> &#124; <code>String</code> | Unique identifier for the message recipient |
| photo | <code>String</code> &#124; <code>stream.Stream</code> | A file path or a Stream. Can also be a `file_id` previously uploaded |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+sendAudio"></a>
### telegramBot.sendAudio(chatId, audio, [options]) ⇒ <code>Promise</code>
Send audio

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#sendaudio  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> &#124; <code>String</code> | Unique identifier for the message recipient |
| audio | <code>String</code> &#124; <code>stream.Stream</code> | A file path or a Stream. Can also be a `file_id` previously uploaded. |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+sendDocument"></a>
### telegramBot.sendDocument(chatId, A, [options]) ⇒ <code>Promise</code>
Send Document

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#sendDocument  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> &#124; <code>String</code> | Unique identifier for the message recipient |
| A | <code>String</code> &#124; <code>stream.Stream</code> | file path or a Stream. Can also be a `file_id` previously uploaded. |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+sendSticker"></a>
### telegramBot.sendSticker(chatId, A, [options]) ⇒ <code>Promise</code>
Send .webp stickers.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#sendsticker  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> &#124; <code>String</code> | Unique identifier for the message recipient |
| A | <code>String</code> &#124; <code>stream.Stream</code> | file path or a Stream. Can also be a `file_id` previously uploaded. |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+sendVideo"></a>
### telegramBot.sendVideo(chatId, A, [options]) ⇒ <code>Promise</code>
Use this method to send video files, Telegram clients support mp4 videos (other formats may be sent as Document).

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#sendvideo  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> &#124; <code>String</code> | Unique identifier for the message recipient |
| A | <code>String</code> &#124; <code>stream.Stream</code> | file path or a Stream. Can also be a `file_id` previously uploaded. |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+sendVoice"></a>
### telegramBot.sendVoice(chatId, voice, [options]) ⇒ <code>Promise</code>
Send voice

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#sendvoice  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> &#124; <code>String</code> | Unique identifier for the message recipient |
| voice | <code>String</code> &#124; <code>stream.Stream</code> | A file path or a Stream. Can also be a `file_id` previously uploaded. |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+sendChatAction"></a>
### telegramBot.sendChatAction(chatId, action) ⇒ <code>Promise</code>
Send chat action.
`typing` for text messages,
`upload_photo` for photos, `record_video` or `upload_video` for videos,
`record_audio` or `upload_audio` for audio files, `upload_document` for general files,
`find_location` for location data.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#sendchataction  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> &#124; <code>String</code> | Unique identifier for the message recipient |
| action | <code>String</code> | Type of action to broadcast. |

<a name="TelegramBot+getUserProfilePhotos"></a>
### telegramBot.getUserProfilePhotos(userId, [offset], [limit]) ⇒ <code>Promise</code>
Use this method to get a list of profile pictures for a user.
Returns a [UserProfilePhotos](https://core.telegram.org/bots/api#userprofilephotos) object.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#getuserprofilephotos  

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>Number</code> &#124; <code>String</code> | Unique identifier of the target user |
| [offset] | <code>Number</code> | Sequential number of the first photo to be returned. By default, all photos are returned. |
| [limit] | <code>Number</code> | Limits the number of photos to be retrieved. Values between 1—100 are accepted. Defaults to 100. |

<a name="TelegramBot+sendLocation"></a>
### telegramBot.sendLocation(chatId, latitude, longitude, [options]) ⇒ <code>Promise</code>
Send location.
Use this method to send point on the map.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#sendlocation  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> &#124; <code>String</code> | Unique identifier for the message recipient |
| latitude | <code>Float</code> | Latitude of location |
| longitude | <code>Float</code> | Longitude of location |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getFile"></a>
### telegramBot.getFile(fileId) ⇒ <code>Promise</code>
Get file.
Use this method to get basic info about a file and prepare it for downloading.
Attention: link will be valid for 1 hour.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#getfile  

| Param | Type | Description |
| --- | --- | --- |
| fileId | <code>String</code> | File identifier to get info about |

<a name="TelegramBot+getFileLink"></a>
### telegramBot.getFileLink(fileId) ⇒ <code>Promise</code>
Get link for file.
Use this method to get link for file for subsequent use.
Attention: link will be valid for 1 hour.

This method is a sugar extension of the (getFile)[#getfilefileid] method, which returns just path to file on remote server (you will have to manually build full uri after that).

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**Returns**: <code>Promise</code> - promise Promise which will have *fileURI* in resolve callback  
**See**: https://core.telegram.org/bots/api#getfile  

| Param | Type | Description |
| --- | --- | --- |
| fileId | <code>String</code> | File identifier to get info about |

<a name="TelegramBot+downloadFile"></a>
### telegramBot.downloadFile(fileId, downloadDir) ⇒ <code>Promise</code>
Downloads file in the specified folder.
This is just a sugar for (getFile)[#getfilefiled] method

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**Returns**: <code>Promise</code> - promise Promise, which will have *filePath* of downloaded file in resolve callback  

| Param | Type | Description |
| --- | --- | --- |
| fileId | <code>String</code> | File identifier to get info about |
| downloadDir | <code>String</code> | Absolute path to the folder in which file will be saved |

<a name="TelegramBot+onText"></a>
### telegramBot.onText(regexp, callback)
Register a RegExp to test against an incomming text message.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  

| Param | Type | Description |
| --- | --- | --- |
| regexp | <code>RegExp</code> | RegExp to be executed with `exec`. |
| callback | <code>function</code> | Callback will be called with 2 parameters, the `msg` and the result of executing `regexp.exec` on message text. |

* * *
