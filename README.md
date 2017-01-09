[![Build Status](https://travis-ci.org/yagop/node-telegram-bot-api.svg?branch=master)](https://travis-ci.org/yagop/node-telegram-bot-api) [![Build status](https://ci.appveyor.com/api/projects/status/ujko6bsum3g5msjh/branch/master?svg=true)](https://ci.appveyor.com/project/yagop/node-telegram-bot-api/branch/master) [![Coverage Status](https://coveralls.io/repos/yagop/node-telegram-bot-api/badge.svg?branch=master)](https://coveralls.io/r/yagop/node-telegram-bot-api?branch=master) [![bitHound Score](https://www.bithound.io/github/yagop/node-telegram-bot-api/badges/score.svg)](https://www.bithound.io/github/yagop/node-telegram-bot-api) [![https://telegram.me/node_telegram_bot_api](https://img.shields.io/badge/💬 Telegram-node__telegram__bot__api-blue.svg)](https://telegram.me/node_telegram_bot_api) [![https://telegram.me/Yago_Perez](https://img.shields.io/badge/💬 Telegram-Yago__Perez-blue.svg)](https://telegram.me/Yago_Perez)

Node.js module to interact with official [Telegram Bot API](https://core.telegram.org/bots/api). A bot token is needed, to obtain one, talk to [@botfather](https://telegram.me/BotFather) and create a new bot.

```sh
npm install node-telegram-bot-api
```

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

There are some other examples on [examples](https://github.com/yagop/node-telegram-bot-api/tree/master/examples).

### Events
Every time TelegramBot receives a message, it emits a `message`. Depending on which  [message](https://core.telegram.org/bots/api#message) was received, emits an event from this ones: `text`, `audio`, `document`, `photo`, `sticker`, `video`, `voice`, `contact`, `location`, `new_chat_participant`, `left_chat_participant`, `new_chat_title`, `new_chat_photo`, `delete_chat_photo`, `group_chat_created`. Its much better to listen a specific event rather than a `message` in order to stay safe from the content.
TelegramBot emits `callback_query` when receives a [Callback Query](https://core.telegram.org/bots/api#callbackquery).
TelegramBot emits `inline_query` when receives an [Inline Query](https://core.telegram.org/bots/api#inlinequery) and `chosen_inline_result` when receives a [ChosenInlineResult](https://core.telegram.org/bots/api#choseninlineresult). Bot must be enabled on [inline mode](https://core.telegram.org/bots/api#inline-mode).
TelegramBot emits `channel_post` on a new incoming channel post of any kind.
TelegramBot emits `edited_message` when a message is edited, and also `edited_message_text` or `edited_message_caption` depending on which type of message was edited.
TelegramBot emits `edited_channel_post` when a channel post is edited, and also `edited_channel_post_text` or `edited_channel_post_caption` depending on which type of channel post was edited.
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
    * [.startPolling([options])](#TelegramBot+startPolling) ⇒ <code>Promise</code>
    * ~~[.initPolling([options])](#TelegramBot+initPolling) ⇒ <code>Promise</code>~~
    * [.stopPolling()](#TelegramBot+stopPolling) ⇒ <code>Promise</code>
    * [.isPolling()](#TelegramBot+isPolling) ⇒ <code>Boolean</code>
    * [.openWebHook()](#TelegramBot+openWebHook) ⇒ <code>Promise</code>
    * [.closeWebHook()](#TelegramBot+closeWebHook) ⇒ <code>Promise</code>
    * [.hasOpenWebHook()](#TelegramBot+hasOpenWebHook) ⇒ <code>Boolean</code>
    * [.getMe()](#TelegramBot+getMe) ⇒ <code>Promise</code>
    * [.setWebHook(url, [options])](#TelegramBot+setWebHook)
    * [.deleteWebHook()](#TelegramBot+deleteWebHook) ⇒ <code>Promise</code>
    * [.getWebHookInfo()](#TelegramBot+getWebHookInfo) ⇒ <code>Promise</code>
    * [.getUpdates([options])](#TelegramBot+getUpdates) ⇒ <code>Promise</code>
    * [.processUpdate(update)](#TelegramBot+processUpdate)
    * [.sendMessage(chatId, text, [options])](#TelegramBot+sendMessage) ⇒ <code>Promise</code>
    * [.answerInlineQuery(inlineQueryId, results, [options])](#TelegramBot+answerInlineQuery) ⇒ <code>Promise</code>
    * [.forwardMessage(chatId, fromChatId, messageId, [options])](#TelegramBot+forwardMessage) ⇒ <code>Promise</code>
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
    * [.getUserProfilePhotos(userId, [options])](#TelegramBot+getUserProfilePhotos) ⇒ <code>Promise</code>
    * [.sendLocation(chatId, latitude, longitude, [options])](#TelegramBot+sendLocation) ⇒ <code>Promise</code>
    * [.sendVenue(chatId, latitude, longitude, title, address, [options])](#TelegramBot+sendVenue) ⇒ <code>Promise</code>
    * [.sendContact(chatId, phoneNumber, firstName, [options])](#TelegramBot+sendContact) ⇒ <code>Promise</code>
    * [.getFile(fileId)](#TelegramBot+getFile) ⇒ <code>Promise</code>
    * [.getFileLink(fileId)](#TelegramBot+getFileLink) ⇒ <code>Promise</code>
    * [.downloadFile(fileId, downloadDir)](#TelegramBot+downloadFile) ⇒ <code>Promise</code>
    * [.onText(regexp, callback)](#TelegramBot+onText)
    * [.onReplyToMessage(chatId, messageId, callback)](#TelegramBot+onReplyToMessage)
    * [.getChat(chatId)](#TelegramBot+getChat) ⇒ <code>Promise</code>
    * [.getChatAdministrators(chatId)](#TelegramBot+getChatAdministrators) ⇒ <code>Promise</code>
    * [.getChatMembersCount(chatId)](#TelegramBot+getChatMembersCount) ⇒ <code>Promise</code>
    * [.getChatMember(chatId, userId)](#TelegramBot+getChatMember) ⇒ <code>Promise</code>
    * [.leaveChat(chatId)](#TelegramBot+leaveChat) ⇒ <code>Promise</code>
    * [.sendGame(chatId, gameShortName, [options])](#TelegramBot+sendGame) ⇒ <code>Promise</code>
    * [.setGameScore(userId, score, [options])](#TelegramBot+setGameScore) ⇒ <code>Promise</code>
    * [.getGameHighScores(userId, [options])](#TelegramBot+getGameHighScores) ⇒ <code>Promise</code>

<a name="new_TelegramBot_new"></a>

### new TelegramBot(token, [options])
Both request method to obtain messages are implemented. To use standard polling, set `polling: true`
on `options`. Notice that [webHook](https://core.telegram.org/bots/api#setwebhook) will need a SSL certificate.
Emits `message` when a message arrives.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| token | <code>String</code> |  | Bot Token |
| [options] | <code>Object</code> |  |  |
| [options.polling] | <code>Boolean</code> &#124; <code>Object</code> | <code>false</code> | Set true to enable polling or set options.  If a WebHook has been set, it will be deleted automatically. |
| [options.polling.timeout] | <code>String</code> &#124; <code>Number</code> | <code>10</code> | Timeout in seconds for long polling |
| [options.polling.interval] | <code>String</code> &#124; <code>Number</code> | <code>300</code> | Interval between requests in miliseconds |
| [options.polling.autoStart] | <code>Boolean</code> | <code>true</code> | Start polling immediately |
| [options.webHook] | <code>Boolean</code> &#124; <code>Object</code> | <code>false</code> | Set true to enable WebHook or set options |
| [options.webHook.port] | <code>Number</code> | <code>8443</code> | Port to bind to |
| [options.webHook.key] | <code>String</code> |  | Path to file with PEM private key for webHook server.  The file is read **synchronously**! |
| [options.webHook.cert] | <code>String</code> |  | Path to file with PEM certificate (public) for webHook server.  The file is read **synchronously**! |
| [options.webHook.pfx] | <code>String</code> |  | Path to file with PFX private key and certificate chain for webHook server.  The file is read **synchronously**! |
| [options.webHook.autoOpen] | <code>Boolean</code> | <code>true</code> | Open webHook immediately |
| [options.webHook.https] | <code>Object</code> |  | Options to be passed to `https.createServer()`.  Note that `options.webHook.key`, `options.webHook.cert` and `options.webHook.pfx`, if provided, will be  used to override `key`, `cert` and `pfx` in this object, respectively.  See https://nodejs.org/api/https.html#https_https_createserver_options_requestlistener for more information. |
| [options.onlyFirstMatch] | <code>Boolean</code> | <code>false</code> | Set to true to stop after first match. Otherwise, all regexps are executed |
| [options.request] | <code>Object</code> |  | Options which will be added for all requests to telegram api.  See https://github.com/request/request#requestoptions-callback for more information. |
| [options.baseApiUrl] | <code>String</code> | <code>https://api.telegram.org</code> | API Base URl; useful for proxying and testing |

<a name="TelegramBot+startPolling"></a>

### telegramBot.startPolling([options]) ⇒ <code>Promise</code>
Start polling.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [options] | <code>Object</code> |  |  |
| [options.restart] | <code>Boolean</code> | <code>true</code> | Consecutive calls to this method causes polling to be restarted |

<a name="TelegramBot+initPolling"></a>

### ~~telegramBot.initPolling([options]) ⇒ <code>Promise</code>~~
***Deprecated***

Alias of `TelegramBot#startPolling()`. This is **deprecated**.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  

| Param | Type |
| --- | --- |
| [options] | <code>Object</code> | 

<a name="TelegramBot+stopPolling"></a>

### telegramBot.stopPolling() ⇒ <code>Promise</code>
Stops polling after the last polling request resolves.
Multiple invocations do nothing if polling is already stopped.
Returning the promise of the last polling request is **deprecated**.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
<a name="TelegramBot+isPolling"></a>

### telegramBot.isPolling() ⇒ <code>Boolean</code>
Return true if polling. Otherwise, false.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
<a name="TelegramBot+openWebHook"></a>

### telegramBot.openWebHook() ⇒ <code>Promise</code>
Open webhook.
Multiple invocations do nothing if webhook is already open.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
<a name="TelegramBot+closeWebHook"></a>

### telegramBot.closeWebHook() ⇒ <code>Promise</code>
Close webhook after closing all current connections.
Multiple invocations do nothing if webhook is already closed.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**Returns**: <code>Promise</code> - promise  
<a name="TelegramBot+hasOpenWebHook"></a>

### telegramBot.hasOpenWebHook() ⇒ <code>Boolean</code>
Return true if using webhook and it is open i.e. accepts connections.
Otherwise, false.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
<a name="TelegramBot+getMe"></a>

### telegramBot.getMe() ⇒ <code>Promise</code>
Returns basic information about the bot in form of a `User` object.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#getme  
<a name="TelegramBot+setWebHook"></a>

### telegramBot.setWebHook(url, [options])
Specify an url to receive incoming updates via an outgoing webHook.
This method has an [older, compatible signature][setWebHook-v0.25.0]
that is being deprecated.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#setwebhook  

| Param | Type | Description |
| --- | --- | --- |
| url | <code>String</code> | URL where Telegram will make HTTP Post. Leave empty to delete webHook. |
| [options] | <code>Object</code> | Additional Telegram query options |
| [options.certificate] | <code>String</code> &#124; <code>stream.Stream</code> | PEM certificate key (public). |

<a name="TelegramBot+deleteWebHook"></a>

### telegramBot.deleteWebHook() ⇒ <code>Promise</code>
Use this method to remove webhook integration if you decide to
switch back to getUpdates. Returns True on success.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#deletewebhook  
<a name="TelegramBot+getWebHookInfo"></a>

### telegramBot.getWebHookInfo() ⇒ <code>Promise</code>
Use this method to get current webhook status.
On success, returns a [WebhookInfo](https://core.telegram.org/bots/api#webhookinfo) object.
If the bot is using getUpdates, will return an object with the
url field empty.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#getwebhookinfo  
<a name="TelegramBot+getUpdates"></a>

### telegramBot.getUpdates([options]) ⇒ <code>Promise</code>
Use this method to receive incoming updates using long polling.
This method has an [older, compatible signature][getUpdates-v0.25.0]
that is being deprecated.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#getupdates  

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+processUpdate"></a>

### telegramBot.processUpdate(update)
Process an update; emitting the proper events and executing regexp
callbacks. This method is useful should you be using a different
way to fetch updates, other than those provided by TelegramBot.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#update  

| Param | Type |
| --- | --- |
| update | <code>Object</code> | 

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

### telegramBot.forwardMessage(chatId, fromChatId, messageId, [options]) ⇒ <code>Promise</code>
Forward messages of any kind.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> &#124; <code>String</code> | Unique identifier for the message recipient |
| fromChatId | <code>Number</code> &#124; <code>String</code> | Unique identifier for the chat where the original message was sent |
| messageId | <code>Number</code> &#124; <code>String</code> | Unique message identifier |
| [options] | <code>Object</code> | Additional Telegram query options |

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
**See**: https://core.telegram.org/bots/api#editmessagecaption  

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

### telegramBot.getUserProfilePhotos(userId, [options]) ⇒ <code>Promise</code>
Use this method to get a list of profile pictures for a user.
Returns a [UserProfilePhotos](https://core.telegram.org/bots/api#userprofilephotos) object.
This method has an [older, compatible signature][getUserProfilePhotos-v0.25.0]
that is being deprecated.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#getuserprofilephotos  

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>Number</code> &#124; <code>String</code> | Unique identifier of the target user |
| [options] | <code>Object</code> | Additional Telegram query options |

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

<a name="TelegramBot+sendVenue"></a>

### telegramBot.sendVenue(chatId, latitude, longitude, title, address, [options]) ⇒ <code>Promise</code>
Send venue.
Use this method to send information about a venue.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#sendvenue  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> &#124; <code>String</code> | Unique identifier for the message recipient |
| latitude | <code>Float</code> | Latitude of location |
| longitude | <code>Float</code> | Longitude of location |
| title | <code>String</code> | Name of the venue |
| address | <code>String</code> | Address of the venue |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+sendContact"></a>

### telegramBot.sendContact(chatId, phoneNumber, firstName, [options]) ⇒ <code>Promise</code>
Send contact.
Use this method to send phone contacts.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#sendcontact  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> &#124; <code>String</code> | Unique identifier for the message recipient |
| phoneNumber | <code>String</code> | Contact's phone number |
| firstName | <code>String</code> | Contact's first name |
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

<a name="TelegramBot+getChat"></a>

### telegramBot.getChat(chatId) ⇒ <code>Promise</code>
Use this method to get up to date information about the chat
(current name of the user for one-on-one conversations, current
username of a user, group or channel, etc.).

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#getchat  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> &#124; <code>String</code> | Unique identifier for the target chat or username of the target supergroup or channel |

<a name="TelegramBot+getChatAdministrators"></a>

### telegramBot.getChatAdministrators(chatId) ⇒ <code>Promise</code>
Returns the administrators in a chat in form of an Array of `ChatMember` objects.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#getchatadministrators  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> &#124; <code>String</code> | Unique identifier for the target group or username of the target supergroup |

<a name="TelegramBot+getChatMembersCount"></a>

### telegramBot.getChatMembersCount(chatId) ⇒ <code>Promise</code>
Use this method to get the number of members in a chat.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#getchatmemberscount  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> &#124; <code>String</code> | Unique identifier for the target group or username of the target supergroup |

<a name="TelegramBot+getChatMember"></a>

### telegramBot.getChatMember(chatId, userId) ⇒ <code>Promise</code>
Use this method to get information about a member of a chat.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#getchatmember  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> &#124; <code>String</code> | Unique identifier for the target group or username of the target supergroup |
| userId | <code>String</code> | Unique identifier of the target user |

<a name="TelegramBot+leaveChat"></a>

### telegramBot.leaveChat(chatId) ⇒ <code>Promise</code>
Leave a group, supergroup or channel.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#leavechat  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> &#124; <code>String</code> | Unique identifier for the target group or username of the target supergroup (in the format @supergroupusername) |

<a name="TelegramBot+sendGame"></a>

### telegramBot.sendGame(chatId, gameShortName, [options]) ⇒ <code>Promise</code>
Use this method to send a game.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#sendgame  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> &#124; <code>String</code> | Unique identifier for the message recipient |
| gameShortName | <code>String</code> | name of the game to be sent. |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+setGameScore"></a>

### telegramBot.setGameScore(userId, score, [options]) ⇒ <code>Promise</code>
Use this method to set the score of the specified user in a game.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#setgamescore  

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>String</code> | Unique identifier of the target user |
| score | <code>Number</code> | New score value. |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getGameHighScores"></a>

### telegramBot.getGameHighScores(userId, [options]) ⇒ <code>Promise</code>
Use this method to get data for high score table.

**Kind**: instance method of <code>[TelegramBot](#TelegramBot)</code>  
**See**: https://core.telegram.org/bots/api#getgamehighscores  

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>String</code> | Unique identifier of the target user |
| [options] | <code>Object</code> | Additional Telegram query options |

* * *

[setWebHook-v0.25.0]:https://github.com/yagop/node-telegram-bot-api/tree/4e5a493cadfaad5589a8d79e55d9e0d103000ce4#telegrambotsetwebhookurl-cert
[getUpdates-v0.25.0]:https://github.com/yagop/node-telegram-bot-api/tree/4e5a493cadfaad5589a8d79e55d9e0d103000ce4#TelegramBot+getUpdates
[getUserProfilePhotos-v0.25.0]:https://github.com/yagop/node-telegram-bot-api/tree/4e5a493cadfaad5589a8d79e55d9e0d103000ce4#TelegramBot+getUserProfilePhotos
