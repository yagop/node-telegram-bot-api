[![Build Status](https://travis-ci.org/yagop/node-telegram-bot-api.svg?branch=master)](https://travis-ci.org/yagop/node-telegram-bot-api) [![Build status](https://ci.appveyor.com/api/projects/status/ujko6bsum3g5msjh/branch/master?svg=true)](https://ci.appveyor.com/project/yagop/node-telegram-bot-api/branch/master) [![Coverage Status](https://coveralls.io/repos/yagop/node-telegram-bot-api/badge.svg?branch=master)](https://coveralls.io/r/yagop/node-telegram-bot-api?branch=master) [![bitHound Score](https://www.bithound.io/github/yagop/node-telegram-bot-api/badges/score.svg)](https://www.bithound.io/github/yagop/node-telegram-bot-api) [![https://telegram.me/node_telegram_bot_api](https://img.shields.io/badge/💬 Telegram-node__telegram__bot__api-blue.svg)](https://telegram.me/node_telegram_bot_api) [![https://telegram.me/Yago_Perez](https://img.shields.io/badge/💬 Telegram-Yago__Perez-blue.svg)](https://telegram.me/Yago_Perez)

Node.js module to interact with official [Telegram Bot API](https://core.telegram.org/bots/api). A bot token is needed, to obtain one, talk to [@botfather](https://telegram.me/BotFather) and create a new bot.

```sh
npm install node-telegram-bot-api
```

```js
var TelegramBot = require('node-telegram-bot-api');

var token = 'YOUR_TELEGRAM_BOT_TOKEN';
// Setup polling way
var bot = new TelegramBot(token, {polling: true});

// Matches /echo [whatever]
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
Every time TelegramBot receives a message, it emits a `message`. Depending on which  [message](https://core.telegram.org/bots/api#message) was received, emits an event from this ones: `text`, `audio`, `document`, `photo`, `sticker`, `video`, `voice`, `contact`, `location`, `new_chat_participant`, `left_chat_participant`, `new_chat_title`, `new_chat_photo`, `delete_chat_photo`, `group_chat_created`. Its much better to listen a specific event rather than a `message` in order to stay safe from the content.
TelegramBot emits `inline_query` when receives an [Inline Query](https://core.telegram.org/bots/api#inlinequery) and `chosen_inline_result` when receives a [ChosenInlineResult](https://core.telegram.org/bots/api#choseninlineresult). Bot must be enabled on [inline mode](https://core.telegram.org/bots/api#inline-mode)
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
    * [.answerInlineQuery(inlineQueryId, results, [options])](#TelegramBot+answerInlineQuery) ⇒ <code>Promise</code>
    * [.forwardMessage(chatId, fromChatId, messageId)](#TelegramBot+forwardMessage) ⇒ <code>Promise</code>
    * [.sendPhoto(chatId, photo, [options])](#TelegramBot+sendPhoto) ⇒ <code>Promise</code>
    * [.sendAudio(chatId, audio, [options])](#TelegramBot+sendAudio) ⇒ <code>Promise</code>
    * [.sendDocument(chatId, doc, [options], [fileOpts])](#TelegramBot+sendDocument) ⇒ <code>Promise</code>
    * [.sendSticker(chatId, sticker, [options])](#TelegramBot+sendSticker) ⇒ <code>Promise</code>
    * [.sendVideo(chatId, video, [options])](#TelegramBot+sendVideo) ⇒ <code>Promise</code>
    * [.sendVoice(chatId, voice, [options])](#TelegramBot+sendVoice) ⇒ <code>Promise</code>
    * [.sendChatAction(chatId, action)](#TelegramBot+sendChatAction) ⇒ <code>Promise</code>
    * [.kickChatMember(chatId, userId)](#TelegramBot+kickChatMember) ⇒ <code>Promise</code>
    * [.unbanChatMember(chatId, userId)](#TelegramBot+unbanChatMember) ⇒ <code>Promise</code>
    * [.answerCallbackQuery(callbackQueryId, text, showAlert, [options])](#TelegramBot+answerCallbackQuery) ⇒ <code>Promise</code>
    * [.editMessageText(text, [options])](#TelegramBot+editMessageText) ⇒ <code>Promise</code>
    * [.editMessageCaption(caption, [options])](#TelegramBot+editMessageCaption) ⇒ <code>Promise</code>
    * [.editMessageReplyMarkup(replyMarkup, [options])](#TelegramBot+editMessageReplyMarkup) ⇒ <code>Promise</code>
    * [.getUserProfilePhotos(userId, [offset], [limit])](#TelegramBot+getUserProfilePhotos) ⇒ <code>Promise</code>
    * [.sendLocation(chatId, latitude, longitude, [options])](#TelegramBot+sendLocation) ⇒ <code>Promise</code>
    * [.getFile(fileId)](#TelegramBot+getFile) ⇒ <code>Promise</code>
    * [.getFileLink(fileId)](#TelegramBot+getFileLink) ⇒ <code>Promise</code>
    * [.downloadFile(fileId, downloadDir)](#TelegramBot+downloadFile) ⇒ <code>Promise</code>
    * [.onText(regexp, callback)](#TelegramBot+onText)
    * [.onReplyToMessage(chatId, messageId, callback)](#TelegramBot+onReplyToMessage)

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
| [options.polling.timeout] | <code>String</code> &#124; <code>Number</code> | <code>10</code> | Polling time in seconds |
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

<a name="TelegramBot+answerInlineQuery"></a>

### telegramBot.answerInlineQuery(inlineQueryId, results, [options]) ⇒ <code>Promise</code>
Send answers to an inline query.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#answerinlinequery  

| Param | Type | Description |
| --- | --- | --- |
| inlineQueryId | <code>String</code> | Unique identifier of the query |
| results | <code>Array.&lt;InlineQueryResult&gt;</code> | An array of results for the inline query |
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
| photo | <code>String</code> &#124; <code>stream.Stream</code> &#124; <code>Buffer</code> | A file path or a Stream. Can also be a `file_id` previously uploaded |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+sendAudio"></a>

### telegramBot.sendAudio(chatId, audio, [options]) ⇒ <code>Promise</code>
Send audio

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#sendaudio  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> &#124; <code>String</code> | Unique identifier for the message recipient |
| audio | <code>String</code> &#124; <code>stream.Stream</code> &#124; <code>Buffer</code> | A file path, Stream or Buffer. Can also be a `file_id` previously uploaded. |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+sendDocument"></a>

### telegramBot.sendDocument(chatId, doc, [options], [fileOpts]) ⇒ <code>Promise</code>
Send Document

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#sendDocument  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> &#124; <code>String</code> | Unique identifier for the message recipient |
| doc | <code>String</code> &#124; <code>stream.Stream</code> &#124; <code>Buffer</code> | A file path, Stream or Buffer. Can also be a `file_id` previously uploaded. |
| [options] | <code>Object</code> | Additional Telegram query options |
| [fileOpts] | <code>Object</code> | Optional file related meta-data |

<a name="TelegramBot+sendSticker"></a>

### telegramBot.sendSticker(chatId, sticker, [options]) ⇒ <code>Promise</code>
Send .webp stickers.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#sendsticker  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> &#124; <code>String</code> | Unique identifier for the message recipient |
| sticker | <code>String</code> &#124; <code>stream.Stream</code> &#124; <code>Buffer</code> | A file path, Stream or Buffer. Can also be a `file_id` previously uploaded. Stickers are WebP format files. |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+sendVideo"></a>

### telegramBot.sendVideo(chatId, video, [options]) ⇒ <code>Promise</code>
Use this method to send video files, Telegram clients support mp4 videos (other formats may be sent as Document).

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#sendvideo  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> &#124; <code>String</code> | Unique identifier for the message recipient |
| video | <code>String</code> &#124; <code>stream.Stream</code> &#124; <code>Buffer</code> | A file path or Stream. Can also be a `file_id` previously uploaded. |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+sendVoice"></a>

### telegramBot.sendVoice(chatId, voice, [options]) ⇒ <code>Promise</code>
Send voice

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#sendvoice  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> &#124; <code>String</code> | Unique identifier for the message recipient |
| voice | <code>String</code> &#124; <code>stream.Stream</code> &#124; <code>Buffer</code> | A file path, Stream or Buffer. Can also be a `file_id` previously uploaded. |
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

<a name="TelegramBot+kickChatMember"></a>

### telegramBot.kickChatMember(chatId, userId) ⇒ <code>Promise</code>
Use this method to kick a user from a group or a supergroup.
In the case of supergroups, the user will not be able to return
to the group on their own using invite links, etc., unless unbanned
first. The bot must be an administrator in the group for this to work.
Returns True on success.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#kickchatmember  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> &#124; <code>String</code> | Unique identifier for the target group or username of the target supergroup |
| userId | <code>String</code> | Unique identifier of the target user |

<a name="TelegramBot+unbanChatMember"></a>

### telegramBot.unbanChatMember(chatId, userId) ⇒ <code>Promise</code>
Use this method to unban a previously kicked user in a supergroup.
The user will not return to the group automatically, but will be
able to join via link, etc. The bot must be an administrator in
the group for this to work. Returns True on success.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#unbanchatmember  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> &#124; <code>String</code> | Unique identifier for the target group or username of the target supergroup |
| userId | <code>String</code> | Unique identifier of the target user |

<a name="TelegramBot+answerCallbackQuery"></a>

### telegramBot.answerCallbackQuery(callbackQueryId, text, showAlert, [options]) ⇒ <code>Promise</code>
Use this method to send answers to callback queries sent from
inline keyboards. The answer will be displayed to the user as
a notification at the top of the chat screen or as an alert.
On success, True is returned.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#answercallbackquery  

| Param | Type | Description |
| --- | --- | --- |
| callbackQueryId | <code>Number</code> &#124; <code>String</code> | Unique identifier for the query to be answered |
| text | <code>String</code> | Text of the notification. If not specified, nothing will be shown to the user |
| showAlert | <code>Boolean</code> | Whether to show an alert or a notification at the top of the screen |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+editMessageText"></a>

### telegramBot.editMessageText(text, [options]) ⇒ <code>Promise</code>
Use this method to edit text messages sent by the bot or via
the bot (for inline bots). On success, the edited Message is
returned.

Note that you must provide one of chat_id, message_id, or
inline_message_id in your request.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#editmessagetext  

| Param | Type | Description |
| --- | --- | --- |
| text | <code>String</code> | New text of the message |
| [options] | <code>Object</code> | Additional Telegram query options (provide either one of chat_id, message_id, or inline_message_id here) |

<a name="TelegramBot+editMessageCaption"></a>

### telegramBot.editMessageCaption(caption, [options]) ⇒ <code>Promise</code>
Use this method to edit captions of messages sent by the
bot or via the bot (for inline bots). On success, the
edited Message is returned.

Note that you must provide one of chat_id, message_id, or
inline_message_id in your request.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#editmessagetext  

| Param | Type | Description |
| --- | --- | --- |
| caption | <code>String</code> | New caption of the message |
| [options] | <code>Object</code> | Additional Telegram query options (provide either one of chat_id, message_id, or inline_message_id here) |

<a name="TelegramBot+editMessageReplyMarkup"></a>

### telegramBot.editMessageReplyMarkup(replyMarkup, [options]) ⇒ <code>Promise</code>
Use this method to edit only the reply markup of messages
sent by the bot or via the bot (for inline bots).
On success, the edited Message is returned.

Note that you must provide one of chat_id, message_id, or
inline_message_id in your request.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#editmessagetext  

| Param | Type | Description |
| --- | --- | --- |
| replyMarkup | <code>Object</code> | A JSON-serialized object for an inline keyboard. |
| [options] | <code>Object</code> | Additional Telegram query options (provide either one of chat_id, message_id, or inline_message_id here) |

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

This method is a sugar extension of the (getFile)[#getfilefileid] method,
which returns just path to file on remote server (you will have to manually build full uri after that).

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

<a name="TelegramBot+onReplyToMessage"></a>

### telegramBot.onReplyToMessage(chatId, messageId, callback)
Register a reply to wait for a message response.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> &#124; <code>String</code> | The chat id where the message cames from. |
| messageId | <code>Number</code> &#124; <code>String</code> | The message id to be replied. |
| callback | <code>function</code> | Callback will be called with the reply message. |

* * *
