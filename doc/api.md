# API Reference

**Note:** If you are looking for available [events](usage.md#events) or usage of api, please refer [`usage.md`](usage.md).

<a name="TelegramBot"></a>

## TelegramBot
TelegramBot

**Kind**: global class  
**See**: https://core.telegram.org/bots/api  

* [TelegramBot](#TelegramBot)
    * [new TelegramBot(token, [options])](#new_TelegramBot_new)
    * _instance_
        * [.on(event, listener)](#TelegramBot+on)
        * [.startPolling([options])](#TelegramBot+startPolling) ⇒ <code>Promise</code>
        * ~~[.initPolling([options])](#TelegramBot+initPolling) ⇒ <code>Promise</code>~~
        * [.stopPolling([options])](#TelegramBot+stopPolling) ⇒ <code>Promise</code>
        * [.isPolling()](#TelegramBot+isPolling) ⇒ <code>Boolean</code>
        * [.openWebHook()](#TelegramBot+openWebHook) ⇒ <code>Promise</code>
        * [.closeWebHook()](#TelegramBot+closeWebHook) ⇒ <code>Promise</code>
        * [.hasOpenWebHook()](#TelegramBot+hasOpenWebHook) ⇒ <code>Boolean</code>
        * [.getMe([options])](#TelegramBot+getMe) ⇒ <code>Promise</code>
        * [.setWebHook(url, [options], [fileOptions])](#TelegramBot+setWebHook) ⇒ <code>Promise</code>
        * [.deleteWebHook([options])](#TelegramBot+deleteWebHook) ⇒ <code>Promise</code>
        * [.getWebHookInfo([options])](#TelegramBot+getWebHookInfo) ⇒ <code>Promise</code>
        * [.getUpdates([options])](#TelegramBot+getUpdates) ⇒ <code>Promise</code>
        * [.processUpdate(update)](#TelegramBot+processUpdate)
        * [.sendMessage(chatId, text, [options])](#TelegramBot+sendMessage) ⇒ <code>Promise</code>
        * [.answerInlineQuery(inlineQueryId, results, [options])](#TelegramBot+answerInlineQuery) ⇒ <code>Promise</code>
        * [.forwardMessage(chatId, fromChatId, messageId, [options])](#TelegramBot+forwardMessage) ⇒ <code>Promise</code>
        * [.sendPhoto(chatId, photo, [options], [fileOptions])](#TelegramBot+sendPhoto) ⇒ <code>Promise</code>
        * [.sendAudio(chatId, audio, [options], [fileOptions])](#TelegramBot+sendAudio) ⇒ <code>Promise</code>
        * [.sendDocument(chatId, doc, [options], [fileOptions])](#TelegramBot+sendDocument) ⇒ <code>Promise</code>
        * [.sendSticker(chatId, sticker, [options], [fileOptions])](#TelegramBot+sendSticker) ⇒ <code>Promise</code>
        * [.sendVideo(chatId, video, [options], [fileOptions])](#TelegramBot+sendVideo) ⇒ <code>Promise</code>
        * [.sendVideoNote(chatId, videoNote, [options], [fileOptions])](#TelegramBot+sendVideoNote) ⇒ <code>Promise</code>
        * [.sendVoice(chatId, voice, [options], [fileOptions])](#TelegramBot+sendVoice) ⇒ <code>Promise</code>
        * [.sendChatAction(chatId, action, [options])](#TelegramBot+sendChatAction) ⇒ <code>Promise</code>
        * [.kickChatMember(chatId, userId, [options])](#TelegramBot+kickChatMember) ⇒ <code>Promise</code>
        * [.unbanChatMember(chatId, userId, [options])](#TelegramBot+unbanChatMember) ⇒ <code>Promise</code>
        * [.restrictChatMember(chatId, userId, [options])](#TelegramBot+restrictChatMember) ⇒ <code>Promise</code>
        * [.promoteChatMember(chatId, userId, [options])](#TelegramBot+promoteChatMember) ⇒ <code>Promise</code>
        * [.exportChatInviteLink(chatId, [options])](#TelegramBot+exportChatInviteLink) ⇒ <code>Promise</code>
        * [.setChatPhoto(chatId, photo, [options], [fileOptions])](#TelegramBot+setChatPhoto) ⇒ <code>Promise</code>
        * [.deleteChatPhoto(chatId, [options])](#TelegramBot+deleteChatPhoto) ⇒ <code>Promise</code>
        * [.setChatTitle(chatId, title, [options])](#TelegramBot+setChatTitle) ⇒ <code>Promise</code>
        * [.setChatDescription(chatId, description, [options])](#TelegramBot+setChatDescription) ⇒ <code>Promise</code>
        * [.pinChatMessage(chatId, messageId, [options])](#TelegramBot+pinChatMessage) ⇒ <code>Promise</code>
        * [.unpinChatMessage(chatId, [options])](#TelegramBot+unpinChatMessage) ⇒ <code>Promise</code>
        * [.answerCallbackQuery(callbackQueryId, [options])](#TelegramBot+answerCallbackQuery) ⇒ <code>Promise</code>
        * [.editMessageText(text, [options])](#TelegramBot+editMessageText) ⇒ <code>Promise</code>
        * [.editMessageCaption(caption, [options])](#TelegramBot+editMessageCaption) ⇒ <code>Promise</code>
        * [.editMessageReplyMarkup(replyMarkup, [options])](#TelegramBot+editMessageReplyMarkup) ⇒ <code>Promise</code>
        * [.getUserProfilePhotos(userId, [options])](#TelegramBot+getUserProfilePhotos) ⇒ <code>Promise</code>
        * [.sendLocation(chatId, latitude, longitude, [options])](#TelegramBot+sendLocation) ⇒ <code>Promise</code>
        * [.editMessageLiveLocation(latitude, longitude, [options])](#TelegramBot+editMessageLiveLocation) ⇒ <code>Promise</code>
        * [.stopMessageLiveLocation([options])](#TelegramBot+stopMessageLiveLocation) ⇒ <code>Promise</code>
        * [.sendVenue(chatId, latitude, longitude, title, address, [options])](#TelegramBot+sendVenue) ⇒ <code>Promise</code>
        * [.sendContact(chatId, phoneNumber, firstName, [options])](#TelegramBot+sendContact) ⇒ <code>Promise</code>
        * [.getFile(fileId, [options])](#TelegramBot+getFile) ⇒ <code>Promise</code>
        * [.getFileLink(fileId, [options])](#TelegramBot+getFileLink) ⇒ <code>Promise</code>
        * [.getFileStream(fileId, [options])](#TelegramBot+getFileStream) ⇒ <code>stream.Readable</code>
        * [.downloadFile(fileId, downloadDir, [options])](#TelegramBot+downloadFile) ⇒ <code>Promise</code>
        * [.onText(regexp, callback)](#TelegramBot+onText)
        * [.removeTextListener(regexp)](#TelegramBot+removeTextListener) ⇒ <code>Object</code>
        * [.onReplyToMessage(chatId, messageId, callback)](#TelegramBot+onReplyToMessage) ⇒ <code>Number</code>
        * [.removeReplyListener(replyListenerId)](#TelegramBot+removeReplyListener) ⇒ <code>Object</code>
        * [.getChat(chatId, [options])](#TelegramBot+getChat) ⇒ <code>Promise</code>
        * [.getChatAdministrators(chatId, [options])](#TelegramBot+getChatAdministrators) ⇒ <code>Promise</code>
        * [.getChatMembersCount(chatId, [options])](#TelegramBot+getChatMembersCount) ⇒ <code>Promise</code>
        * [.getChatMember(chatId, userId, [options])](#TelegramBot+getChatMember) ⇒ <code>Promise</code>
        * [.leaveChat(chatId, [options])](#TelegramBot+leaveChat) ⇒ <code>Promise</code>
        * [.setChatStickerSet(chatId, stickerSetName, [options])](#TelegramBot+setChatStickerSet) ⇒ <code>Promise</code>
        * [.deleteChatStickerSet(chatId, [options])](#TelegramBot+deleteChatStickerSet) ⇒ <code>Promise</code>
        * [.sendGame(chatId, gameShortName, [options])](#TelegramBot+sendGame) ⇒ <code>Promise</code>
        * [.setGameScore(userId, score, [options])](#TelegramBot+setGameScore) ⇒ <code>Promise</code>
        * [.getGameHighScores(userId, [options])](#TelegramBot+getGameHighScores) ⇒ <code>Promise</code>
        * [.deleteMessage(chatId, messageId, [options])](#TelegramBot+deleteMessage) ⇒ <code>Promise</code>
        * [.sendInvoice(chatId, title, description, payload, providerToken, startParameter, currency, prices, [options])](#TelegramBot+sendInvoice) ⇒ <code>Promise</code>
        * [.answerShippingQuery(shippingQueryId, ok, [options])](#TelegramBot+answerShippingQuery) ⇒ <code>Promise</code>
        * [.answerPreCheckoutQuery(preCheckoutQueryId, ok, [options])](#TelegramBot+answerPreCheckoutQuery) ⇒ <code>Promise</code>
        * [.getStickerSet(name, [options])](#TelegramBot+getStickerSet) ⇒ <code>Promise</code>
        * [.uploadStickerFile(userId, pngSticker, [options], [fileOptions])](#TelegramBot+uploadStickerFile) ⇒ <code>Promise</code>
        * [.createNewStickerSet(userId, name, title, pngSticker, emojis, [options], [fileOptions])](#TelegramBot+createNewStickerSet) ⇒ <code>Promise</code>
        * [.addStickerToSet(userId, name, pngSticker, emojis, [options], [fileOptions])](#TelegramBot+addStickerToSet) ⇒ <code>Promise</code>
        * [.setStickerPositionInSet(sticker, position, [options])](#TelegramBot+setStickerPositionInSet) ⇒ <code>Promise</code>
        * [.deleteStickerFromSet(sticker, [options])](#TelegramBot+deleteStickerFromSet) ⇒ <code>Promise</code>
        * [.sendMediaGroup(chatId, media, [options])](#TelegramBot+sendMediaGroup) ⇒ <code>Promise</code>
    * _static_
        * [.errors](#TelegramBot.errors) : <code>Object</code>
        * [.messageTypes](#TelegramBot.messageTypes) : <code>Array.&lt;String&gt;</code>
        * [.Promise](#TelegramBot.Promise)

<a name="new_TelegramBot_new"></a>

### new TelegramBot(token, [options])
Both request method to obtain messages are implemented. To use standard polling, set `polling: true`
on `options`. Notice that [webHook](https://core.telegram.org/bots/api#setwebhook) will need a SSL certificate.
Emits `message` when a message arrives.


| Param | Type | Default | Description |
| --- | --- | --- | --- |
| token | <code>String</code> |  | Bot Token |
| [options] | <code>Object</code> |  |  |
| [options.polling] | <code>Boolean</code> \| <code>Object</code> | <code>false</code> | Set true to enable polling or set options.  If a WebHook has been set, it will be deleted automatically. |
| [options.polling.timeout] | <code>String</code> \| <code>Number</code> | <code>10</code> | *Deprecated. Use `options.polling.params` instead*.  Timeout in seconds for long polling. |
| [options.polling.interval] | <code>String</code> \| <code>Number</code> | <code>300</code> | Interval between requests in miliseconds |
| [options.polling.autoStart] | <code>Boolean</code> | <code>true</code> | Start polling immediately |
| [options.polling.params] | <code>Object</code> |  | Parameters to be used in polling API requests.  See https://core.telegram.org/bots/api#getupdates for more information. |
| [options.polling.params.timeout] | <code>Number</code> | <code>10</code> | Timeout in seconds for long polling. |
| [options.webHook] | <code>Boolean</code> \| <code>Object</code> | <code>false</code> | Set true to enable WebHook or set options |
| [options.webHook.host] | <code>String</code> | <code>&quot;0.0.0.0&quot;</code> | Host to bind to |
| [options.webHook.port] | <code>Number</code> | <code>8443</code> | Port to bind to |
| [options.webHook.key] | <code>String</code> |  | Path to file with PEM private key for webHook server.  The file is read **synchronously**! |
| [options.webHook.cert] | <code>String</code> |  | Path to file with PEM certificate (public) for webHook server.  The file is read **synchronously**! |
| [options.webHook.pfx] | <code>String</code> |  | Path to file with PFX private key and certificate chain for webHook server.  The file is read **synchronously**! |
| [options.webHook.autoOpen] | <code>Boolean</code> | <code>true</code> | Open webHook immediately |
| [options.webHook.https] | <code>Object</code> |  | Options to be passed to `https.createServer()`.  Note that `options.webHook.key`, `options.webHook.cert` and `options.webHook.pfx`, if provided, will be  used to override `key`, `cert` and `pfx` in this object, respectively.  See https://nodejs.org/api/https.html#https_https_createserver_options_requestlistener for more information. |
| [options.webHook.healthEndpoint] | <code>String</code> | <code>&quot;/healthz&quot;</code> | An endpoint for health checks that always responds with 200 OK |
| [options.onlyFirstMatch] | <code>Boolean</code> | <code>false</code> | Set to true to stop after first match. Otherwise, all regexps are executed |
| [options.request] | <code>Object</code> |  | Options which will be added for all requests to telegram api.  See https://github.com/request/request#requestoptions-callback for more information. |
| [options.baseApiUrl] | <code>String</code> | <code>&quot;https://api.telegram.org&quot;</code> | API Base URl; useful for proxying and testing |
| [options.filepath] | <code>Boolean</code> | <code>true</code> | Allow passing file-paths as arguments when sending files,  such as photos using `TelegramBot#sendPhoto()`. See [usage information][usage-sending-files-performance]  for more information on this option and its consequences. |
| [options.badRejection] | <code>Boolean</code> | <code>false</code> | Set to `true`  **if and only if** the Node.js version you're using terminates the  process on unhandled rejections. This option is only for  *forward-compatibility purposes*. |

<a name="TelegramBot+on"></a>

### telegramBot.on(event, listener)
Add listener for the specified [event](https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#events).
This is the usual `emitter.on()` method.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**

- [Available events](https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#events)
- https://nodejs.org/api/events.html#events_emitter_on_eventname_listener


| Param | Type |
| --- | --- |
| event | <code>String</code> | 
| listener | <code>function</code> | 

<a name="TelegramBot+startPolling"></a>

### telegramBot.startPolling([options]) ⇒ <code>Promise</code>
Start polling.
Rejects returned promise if a WebHook is being used by this instance.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [options] | <code>Object</code> |  |  |
| [options.restart] | <code>Boolean</code> | <code>true</code> | Consecutive calls to this method causes polling to be restarted |

<a name="TelegramBot+initPolling"></a>

### ~~telegramBot.initPolling([options]) ⇒ <code>Promise</code>~~
***Deprecated***

Alias of `TelegramBot#startPolling()`. This is **deprecated**.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  

| Param | Type |
| --- | --- |
| [options] | <code>Object</code> | 

<a name="TelegramBot+stopPolling"></a>

### telegramBot.stopPolling([options]) ⇒ <code>Promise</code>
Stops polling after the last polling request resolves.
Multiple invocations do nothing if polling is already stopped.
Returning the promise of the last polling request is **deprecated**.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Options |
| [options.cancel] | <code>Boolean</code> | Cancel current request |
| [options.reason] | <code>String</code> | Reason for stopping polling |

<a name="TelegramBot+isPolling"></a>

### telegramBot.isPolling() ⇒ <code>Boolean</code>
Return true if polling. Otherwise, false.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
<a name="TelegramBot+openWebHook"></a>

### telegramBot.openWebHook() ⇒ <code>Promise</code>
Open webhook.
Multiple invocations do nothing if webhook is already open.
Rejects returned promise if Polling is being used by this instance.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
<a name="TelegramBot+closeWebHook"></a>

### telegramBot.closeWebHook() ⇒ <code>Promise</code>
Close webhook after closing all current connections.
Multiple invocations do nothing if webhook is already closed.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**Returns**: <code>Promise</code> - promise  
<a name="TelegramBot+hasOpenWebHook"></a>

### telegramBot.hasOpenWebHook() ⇒ <code>Boolean</code>
Return true if using webhook and it is open i.e. accepts connections.
Otherwise, false.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
<a name="TelegramBot+getMe"></a>

### telegramBot.getMe([options]) ⇒ <code>Promise</code>
Returns basic information about the bot in form of a `User` object.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#getme  

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+setWebHook"></a>

### telegramBot.setWebHook(url, [options], [fileOptions]) ⇒ <code>Promise</code>
Specify an url to receive incoming updates via an outgoing webHook.
This method has an [older, compatible signature][setWebHook-v0.25.0]
that is being deprecated.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**

- https://core.telegram.org/bots/api#setwebhook
- https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#sending-files


| Param | Type | Description |
| --- | --- | --- |
| url | <code>String</code> | URL where Telegram will make HTTP Post. Leave empty to delete webHook. |
| [options] | <code>Object</code> | Additional Telegram query options |
| [options.certificate] | <code>String</code> \| <code>stream.Stream</code> | PEM certificate key (public). |
| [fileOptions] | <code>Object</code> | Optional file related meta-data |

<a name="TelegramBot+deleteWebHook"></a>

### telegramBot.deleteWebHook([options]) ⇒ <code>Promise</code>
Use this method to remove webhook integration if you decide to
switch back to getUpdates. Returns True on success.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#deletewebhook  

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getWebHookInfo"></a>

### telegramBot.getWebHookInfo([options]) ⇒ <code>Promise</code>
Use this method to get current webhook status.
On success, returns a [WebhookInfo](https://core.telegram.org/bots/api#webhookinfo) object.
If the bot is using getUpdates, will return an object with the
url field empty.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#getwebhookinfo  

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getUpdates"></a>

### telegramBot.getUpdates([options]) ⇒ <code>Promise</code>
Use this method to receive incoming updates using long polling.
This method has an [older, compatible signature][getUpdates-v0.25.0]
that is being deprecated.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#getupdates  

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+processUpdate"></a>

### telegramBot.processUpdate(update)
Process an update; emitting the proper events and executing regexp
callbacks. This method is useful should you be using a different
way to fetch updates, other than those provided by TelegramBot.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#update  

| Param | Type |
| --- | --- |
| update | <code>Object</code> | 

<a name="TelegramBot+sendMessage"></a>

### telegramBot.sendMessage(chatId, text, [options]) ⇒ <code>Promise</code>
Send text message.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#sendmessage  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> \| <code>String</code> | Unique identifier for the message recipient |
| text | <code>String</code> | Text of the message to be sent |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+answerInlineQuery"></a>

### telegramBot.answerInlineQuery(inlineQueryId, results, [options]) ⇒ <code>Promise</code>
Send answers to an inline query.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#answerinlinequery  

| Param | Type | Description |
| --- | --- | --- |
| inlineQueryId | <code>String</code> | Unique identifier of the query |
| results | <code>Array.&lt;InlineQueryResult&gt;</code> | An array of results for the inline query |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+forwardMessage"></a>

### telegramBot.forwardMessage(chatId, fromChatId, messageId, [options]) ⇒ <code>Promise</code>
Forward messages of any kind.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> \| <code>String</code> | Unique identifier for the message recipient |
| fromChatId | <code>Number</code> \| <code>String</code> | Unique identifier for the chat where the original message was sent |
| messageId | <code>Number</code> \| <code>String</code> | Unique message identifier |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+sendPhoto"></a>

### telegramBot.sendPhoto(chatId, photo, [options], [fileOptions]) ⇒ <code>Promise</code>
Send photo

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**

- https://core.telegram.org/bots/api#sendphoto
- https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#sending-files


| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> \| <code>String</code> | Unique identifier for the message recipient |
| photo | <code>String</code> \| <code>stream.Stream</code> \| <code>Buffer</code> | A file path or a Stream. Can also be a `file_id` previously uploaded |
| [options] | <code>Object</code> | Additional Telegram query options |
| [fileOptions] | <code>Object</code> | Optional file related meta-data |

<a name="TelegramBot+sendAudio"></a>

### telegramBot.sendAudio(chatId, audio, [options], [fileOptions]) ⇒ <code>Promise</code>
Send audio

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**

- https://core.telegram.org/bots/api#sendaudio
- https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#sending-files


| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> \| <code>String</code> | Unique identifier for the message recipient |
| audio | <code>String</code> \| <code>stream.Stream</code> \| <code>Buffer</code> | A file path, Stream or Buffer. Can also be a `file_id` previously uploaded. |
| [options] | <code>Object</code> | Additional Telegram query options |
| [fileOptions] | <code>Object</code> | Optional file related meta-data |

<a name="TelegramBot+sendDocument"></a>

### telegramBot.sendDocument(chatId, doc, [options], [fileOptions]) ⇒ <code>Promise</code>
Send Document

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**

- https://core.telegram.org/bots/api#sendDocument
- https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#sending-files


| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> \| <code>String</code> | Unique identifier for the message recipient |
| doc | <code>String</code> \| <code>stream.Stream</code> \| <code>Buffer</code> | A file path, Stream or Buffer. Can also be a `file_id` previously uploaded. |
| [options] | <code>Object</code> | Additional Telegram query options |
| [fileOptions] | <code>Object</code> | Optional file related meta-data |

<a name="TelegramBot+sendSticker"></a>

### telegramBot.sendSticker(chatId, sticker, [options], [fileOptions]) ⇒ <code>Promise</code>
Send .webp stickers.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#sendsticker  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> \| <code>String</code> | Unique identifier for the message recipient |
| sticker | <code>String</code> \| <code>stream.Stream</code> \| <code>Buffer</code> | A file path, Stream or Buffer. Can also be a `file_id` previously uploaded. Stickers are WebP format files. |
| [options] | <code>Object</code> | Additional Telegram query options |
| [fileOptions] | <code>Object</code> | Optional file related meta-data |

<a name="TelegramBot+sendVideo"></a>

### telegramBot.sendVideo(chatId, video, [options], [fileOptions]) ⇒ <code>Promise</code>
Use this method to send video files, Telegram clients support mp4 videos (other formats may be sent as Document).

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**

- https://core.telegram.org/bots/api#sendvideo
- https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#sending-files


| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> \| <code>String</code> | Unique identifier for the message recipient |
| video | <code>String</code> \| <code>stream.Stream</code> \| <code>Buffer</code> | A file path or Stream. Can also be a `file_id` previously uploaded. |
| [options] | <code>Object</code> | Additional Telegram query options |
| [fileOptions] | <code>Object</code> | Optional file related meta-data |

<a name="TelegramBot+sendVideoNote"></a>

### telegramBot.sendVideoNote(chatId, videoNote, [options], [fileOptions]) ⇒ <code>Promise</code>
Use this method to send rounded square videos of upto 1 minute long.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**Info**: The length parameter is actually optional. However, the API (at time of writing) requires you to always provide it until it is fixed.  
**See**

- https://core.telegram.org/bots/api#sendvideonote
- https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#sending-files


| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> \| <code>String</code> | Unique identifier for the message recipient |
| videoNote | <code>String</code> \| <code>stream.Stream</code> \| <code>Buffer</code> | A file path or Stream. Can also be a `file_id` previously uploaded. |
| [options] | <code>Object</code> | Additional Telegram query options |
| [fileOptions] | <code>Object</code> | Optional file related meta-data |

<a name="TelegramBot+sendVoice"></a>

### telegramBot.sendVoice(chatId, voice, [options], [fileOptions]) ⇒ <code>Promise</code>
Send voice

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**

- https://core.telegram.org/bots/api#sendvoice
- https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#sending-files


| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> \| <code>String</code> | Unique identifier for the message recipient |
| voice | <code>String</code> \| <code>stream.Stream</code> \| <code>Buffer</code> | A file path, Stream or Buffer. Can also be a `file_id` previously uploaded. |
| [options] | <code>Object</code> | Additional Telegram query options |
| [fileOptions] | <code>Object</code> | Optional file related meta-data |

<a name="TelegramBot+sendChatAction"></a>

### telegramBot.sendChatAction(chatId, action, [options]) ⇒ <code>Promise</code>
Send chat action.
`typing` for text messages,
`upload_photo` for photos, `record_video` or `upload_video` for videos,
`record_audio` or `upload_audio` for audio files, `upload_document` for general files,
`find_location` for location data.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#sendchataction  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> \| <code>String</code> | Unique identifier for the message recipient |
| action | <code>String</code> | Type of action to broadcast. |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+kickChatMember"></a>

### telegramBot.kickChatMember(chatId, userId, [options]) ⇒ <code>Promise</code>
Use this method to kick a user from a group or a supergroup.
In the case of supergroups, the user will not be able to return
to the group on their own using invite links, etc., unless unbanned
first. The bot must be an administrator in the group for this to work.
Returns True on success.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#kickchatmember  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> \| <code>String</code> | Unique identifier for the target group or username of the target supergroup |
| userId | <code>Number</code> | Unique identifier of the target user |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+unbanChatMember"></a>

### telegramBot.unbanChatMember(chatId, userId, [options]) ⇒ <code>Promise</code>
Use this method to unban a previously kicked user in a supergroup.
The user will not return to the group automatically, but will be
able to join via link, etc. The bot must be an administrator in
the group for this to work. Returns True on success.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#unbanchatmember  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> \| <code>String</code> | Unique identifier for the target group or username of the target supergroup |
| userId | <code>Number</code> | Unique identifier of the target user |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+restrictChatMember"></a>

### telegramBot.restrictChatMember(chatId, userId, [options]) ⇒ <code>Promise</code>
Use this method to restrict a user in a supergroup.
The bot must be an administrator in the supergroup for this to work
and must have the appropriate admin rights. Pass True for all boolean parameters
to lift restrictions from a user. Returns True on success.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#restrictchatmember  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> \| <code>String</code> | Unique identifier for the target chat or username of the target supergroup |
| userId | <code>Number</code> | Unique identifier of the target user |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+promoteChatMember"></a>

### telegramBot.promoteChatMember(chatId, userId, [options]) ⇒ <code>Promise</code>
Use this method to promote or demote a user in a supergroup or a channel.
The bot must be an administrator in the chat for this to work
and must have the appropriate admin rights. Pass False for all boolean parameters to demote a user.
Returns True on success.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#promotechatmember  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> \| <code>String</code> | Unique identifier for the target chat or username of the target supergroup |
| userId | <code>Number</code> |  |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+exportChatInviteLink"></a>

### telegramBot.exportChatInviteLink(chatId, [options]) ⇒ <code>Promise</code>
Use this method to export an invite link to a supergroup or a channel.
The bot must be an administrator in the chat for this to work and must have the appropriate admin rights.
Returns exported invite link as String on success.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#exportchatinvitelink  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> \| <code>String</code> | Unique identifier for the target chat or username of the target supergroup |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+setChatPhoto"></a>

### telegramBot.setChatPhoto(chatId, photo, [options], [fileOptions]) ⇒ <code>Promise</code>
Use this method to set a new profile photo for the chat. Photos can't be changed for private chats.
The bot must be an administrator in the chat for this to work and must have the appropriate admin rights.
Returns True on success.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#setchatphoto  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> \| <code>String</code> | Unique identifier for the message recipient |
| photo | <code>stream.Stream</code> \| <code>Buffer</code> | A file path or a Stream. |
| [options] | <code>Object</code> | Additional Telegram query options |
| [fileOptions] | <code>Object</code> | Optional file related meta-data |

<a name="TelegramBot+deleteChatPhoto"></a>

### telegramBot.deleteChatPhoto(chatId, [options]) ⇒ <code>Promise</code>
Use this method to delete a chat photo. Photos can't be changed for private chats.
The bot must be an administrator in the chat for this to work and must have the appropriate admin rights.
Returns True on success.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#deletechatphoto  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> \| <code>String</code> | Unique identifier for the message recipient |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+setChatTitle"></a>

### telegramBot.setChatTitle(chatId, title, [options]) ⇒ <code>Promise</code>
Use this method to change the title of a chat. Titles can't be changed for private chats.
The bot must be an administrator in the chat for this to work and must have the appropriate admin rights.
Returns True on success.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#setchattitle  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> \| <code>String</code> | Unique identifier for the message recipient |
| title | <code>String</code> | New chat title, 1-255 characters |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+setChatDescription"></a>

### telegramBot.setChatDescription(chatId, description, [options]) ⇒ <code>Promise</code>
Use this method to change the description of a supergroup or a channel.
The bot must be an administrator in the chat for this to work and must have the appropriate admin rights.
Returns True on success.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#setchatdescription  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> \| <code>String</code> | Unique identifier for the message recipient |
| description | <code>String</code> | New chat title, 1-255 characters |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+pinChatMessage"></a>

### telegramBot.pinChatMessage(chatId, messageId, [options]) ⇒ <code>Promise</code>
Use this method to pin a message in a supergroup.
The bot must be an administrator in the chat for this to work and must have the appropriate admin rights.
Returns True on success.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#pinchatmessage  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> \| <code>String</code> | Unique identifier for the message recipient |
| messageId | <code>String</code> | Identifier of a message to pin |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+unpinChatMessage"></a>

### telegramBot.unpinChatMessage(chatId, [options]) ⇒ <code>Promise</code>
Use this method to unpin a message in a supergroup chat.
The bot must be an administrator in the chat for this to work and must have the appropriate admin rights.
Returns True on success.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#unpinchatmessage  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> \| <code>String</code> | Unique identifier for the message recipient |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+answerCallbackQuery"></a>

### telegramBot.answerCallbackQuery(callbackQueryId, [options]) ⇒ <code>Promise</code>
Use this method to send answers to callback queries sent from
inline keyboards. The answer will be displayed to the user as
a notification at the top of the chat screen or as an alert.
On success, True is returned.

This method has **older, compatible signatures ([1][answerCallbackQuery-v0.27.1])([2][answerCallbackQuery-v0.29.0])**
that are being deprecated.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#answercallbackquery  

| Param | Type | Description |
| --- | --- | --- |
| callbackQueryId | <code>String</code> | Unique identifier for the query to be answered |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+editMessageText"></a>

### telegramBot.editMessageText(text, [options]) ⇒ <code>Promise</code>
Use this method to edit text messages sent by the bot or via
the bot (for inline bots). On success, the edited Message is
returned.

Note that you must provide one of chat_id, message_id, or
inline_message_id in your request.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
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

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
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

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
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

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#getuserprofilephotos  

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>Number</code> | Unique identifier of the target user |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+sendLocation"></a>

### telegramBot.sendLocation(chatId, latitude, longitude, [options]) ⇒ <code>Promise</code>
Send location.
Use this method to send point on the map.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#sendlocation  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> \| <code>String</code> | Unique identifier for the message recipient |
| latitude | <code>Float</code> | Latitude of location |
| longitude | <code>Float</code> | Longitude of location |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+editMessageLiveLocation"></a>

### telegramBot.editMessageLiveLocation(latitude, longitude, [options]) ⇒ <code>Promise</code>
Use this method to edit live location messages sent by
the bot or via the bot (for inline bots).

Note that you must provide one of chat_id, message_id, or
inline_message_id in your request.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#editmessagelivelocation  

| Param | Type | Description |
| --- | --- | --- |
| latitude | <code>Float</code> | Latitude of location |
| longitude | <code>Float</code> | Longitude of location |
| [options] | <code>Object</code> | Additional Telegram query options (provide either one of chat_id, message_id, or inline_message_id here) |

<a name="TelegramBot+stopMessageLiveLocation"></a>

### telegramBot.stopMessageLiveLocation([options]) ⇒ <code>Promise</code>
Use this method to stop updating a live location message sent by
the bot or via the bot (for inline bots) before live_period expires.

Note that you must provide one of chat_id, message_id, or
inline_message_id in your request.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#stopmessagelivelocation  

| Param | Type | Description |
| --- | --- | --- |
| [options] | <code>Object</code> | Additional Telegram query options (provide either one of chat_id, message_id, or inline_message_id here) |

<a name="TelegramBot+sendVenue"></a>

### telegramBot.sendVenue(chatId, latitude, longitude, title, address, [options]) ⇒ <code>Promise</code>
Send venue.
Use this method to send information about a venue.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#sendvenue  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> \| <code>String</code> | Unique identifier for the message recipient |
| latitude | <code>Float</code> | Latitude of location |
| longitude | <code>Float</code> | Longitude of location |
| title | <code>String</code> | Name of the venue |
| address | <code>String</code> | Address of the venue |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+sendContact"></a>

### telegramBot.sendContact(chatId, phoneNumber, firstName, [options]) ⇒ <code>Promise</code>
Send contact.
Use this method to send phone contacts.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#sendcontact  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> \| <code>String</code> | Unique identifier for the message recipient |
| phoneNumber | <code>String</code> | Contact's phone number |
| firstName | <code>String</code> | Contact's first name |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getFile"></a>

### telegramBot.getFile(fileId, [options]) ⇒ <code>Promise</code>
Get file.
Use this method to get basic info about a file and prepare it for downloading.
Attention: link will be valid for 1 hour.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#getfile  

| Param | Type | Description |
| --- | --- | --- |
| fileId | <code>String</code> | File identifier to get info about |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getFileLink"></a>

### telegramBot.getFileLink(fileId, [options]) ⇒ <code>Promise</code>
Get link for file.
Use this method to get link for file for subsequent use.
Attention: link will be valid for 1 hour.

This method is a sugar extension of the (getFile)[#getfilefileid] method,
which returns just path to file on remote server (you will have to manually build full uri after that).

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**Returns**: <code>Promise</code> - promise Promise which will have *fileURI* in resolve callback  
**See**: https://core.telegram.org/bots/api#getfile  

| Param | Type | Description |
| --- | --- | --- |
| fileId | <code>String</code> | File identifier to get info about |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getFileStream"></a>

### telegramBot.getFileStream(fileId, [options]) ⇒ <code>stream.Readable</code>
Return a readable stream for file.

`fileStream.path` is the specified file ID i.e. `fileId`.
`fileStream` emits event `info` passing a single argument i.e.
`info` with the interface `{ uri }` where `uri` is the URI of the
file on Telegram servers.

This method is a sugar extension of the [getFileLink](#TelegramBot+getFileLink) method,
which returns the full URI to the file on remote server.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**Returns**: <code>stream.Readable</code> - fileStream  

| Param | Type | Description |
| --- | --- | --- |
| fileId | <code>String</code> | File identifier to get info about |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+downloadFile"></a>

### telegramBot.downloadFile(fileId, downloadDir, [options]) ⇒ <code>Promise</code>
Downloads file in the specified folder.

This method is a sugar extension of the [getFileStream](#TelegramBot+getFileStream) method,
which returns a readable file stream.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**Returns**: <code>Promise</code> - promise Promise, which will have *filePath* of downloaded file in resolve callback  

| Param | Type | Description |
| --- | --- | --- |
| fileId | <code>String</code> | File identifier to get info about |
| downloadDir | <code>String</code> | Absolute path to the folder in which file will be saved |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+onText"></a>

### telegramBot.onText(regexp, callback)
Register a RegExp to test against an incomming text message.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  

| Param | Type | Description |
| --- | --- | --- |
| regexp | <code>RegExp</code> | RegExp to be executed with `exec`. |
| callback | <code>function</code> | Callback will be called with 2 parameters, the `msg` and the result of executing `regexp.exec` on message text. |

<a name="TelegramBot+removeTextListener"></a>

### telegramBot.removeTextListener(regexp) ⇒ <code>Object</code>
Remove a listener registered with `onText()`.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**Returns**: <code>Object</code> - deletedListener The removed reply listener if
  found. This object has `regexp` and `callback`
  properties. If not found, returns `null`.  

| Param | Type | Description |
| --- | --- | --- |
| regexp | <code>RegExp</code> | RegExp used previously in `onText()` |

<a name="TelegramBot+onReplyToMessage"></a>

### telegramBot.onReplyToMessage(chatId, messageId, callback) ⇒ <code>Number</code>
Register a reply to wait for a message response.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**Returns**: <code>Number</code> - id                    The ID of the inserted reply listener.  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> \| <code>String</code> | The chat id where the message cames from. |
| messageId | <code>Number</code> \| <code>String</code> | The message id to be replied. |
| callback | <code>function</code> | Callback will be called with the reply  message. |

<a name="TelegramBot+removeReplyListener"></a>

### telegramBot.removeReplyListener(replyListenerId) ⇒ <code>Object</code>
Removes a reply that has been prev. registered for a message response.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**Returns**: <code>Object</code> - deletedListener      The removed reply listener if
  found. This object has `id`, `chatId`, `messageId` and `callback`
  properties. If not found, returns `null`.  

| Param | Type | Description |
| --- | --- | --- |
| replyListenerId | <code>Number</code> | The ID of the reply listener. |

<a name="TelegramBot+getChat"></a>

### telegramBot.getChat(chatId, [options]) ⇒ <code>Promise</code>
Use this method to get up to date information about the chat
(current name of the user for one-on-one conversations, current
username of a user, group or channel, etc.).

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#getchat  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> \| <code>String</code> | Unique identifier for the target chat or username of the target supergroup or channel |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getChatAdministrators"></a>

### telegramBot.getChatAdministrators(chatId, [options]) ⇒ <code>Promise</code>
Returns the administrators in a chat in form of an Array of `ChatMember` objects.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#getchatadministrators  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> \| <code>String</code> | Unique identifier for the target group or username of the target supergroup |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getChatMembersCount"></a>

### telegramBot.getChatMembersCount(chatId, [options]) ⇒ <code>Promise</code>
Use this method to get the number of members in a chat.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#getchatmemberscount  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> \| <code>String</code> | Unique identifier for the target group or username of the target supergroup |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getChatMember"></a>

### telegramBot.getChatMember(chatId, userId, [options]) ⇒ <code>Promise</code>
Use this method to get information about a member of a chat.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#getchatmember  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> \| <code>String</code> | Unique identifier for the target group or username of the target supergroup |
| userId | <code>Number</code> | Unique identifier of the target user |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+leaveChat"></a>

### telegramBot.leaveChat(chatId, [options]) ⇒ <code>Promise</code>
Leave a group, supergroup or channel.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#leavechat  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> \| <code>String</code> | Unique identifier for the target group or username of the target supergroup (in the format @supergroupusername) |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+setChatStickerSet"></a>

### telegramBot.setChatStickerSet(chatId, stickerSetName, [options]) ⇒ <code>Promise</code>
Use this method to set a new group sticker set for a supergroup.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#setchatstickerset  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> \| <code>String</code> | Unique identifier for the target group or username of the target supergroup (in the format @supergroupusername) |
| stickerSetName | <code>String</code> | Name of the sticker set to be set as the group sticker set |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+deleteChatStickerSet"></a>

### telegramBot.deleteChatStickerSet(chatId, [options]) ⇒ <code>Promise</code>
Use this method to delete a group sticker set from a supergroup.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#deletechatstickerset  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> \| <code>String</code> | Unique identifier for the target group or username of the target supergroup (in the format @supergroupusername) |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+sendGame"></a>

### telegramBot.sendGame(chatId, gameShortName, [options]) ⇒ <code>Promise</code>
Use this method to send a game.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#sendgame  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> \| <code>String</code> | Unique identifier for the message recipient |
| gameShortName | <code>String</code> | name of the game to be sent. |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+setGameScore"></a>

### telegramBot.setGameScore(userId, score, [options]) ⇒ <code>Promise</code>
Use this method to set the score of the specified user in a game.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#setgamescore  

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>Number</code> | Unique identifier of the target user |
| score | <code>Number</code> | New score value. |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getGameHighScores"></a>

### telegramBot.getGameHighScores(userId, [options]) ⇒ <code>Promise</code>
Use this method to get data for high score table.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#getgamehighscores  

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>Number</code> | Unique identifier of the target user |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+deleteMessage"></a>

### telegramBot.deleteMessage(chatId, messageId, [options]) ⇒ <code>Promise</code>
Use this method to delete a message.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#deletemessage  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> \| <code>String</code> | Unique identifier of the target chat |
| messageId | <code>String</code> | Unique identifier of the target message |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+sendInvoice"></a>

### telegramBot.sendInvoice(chatId, title, description, payload, providerToken, startParameter, currency, prices, [options]) ⇒ <code>Promise</code>
Send invoice.
Use this method to send an invoice.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#sendinvoice  

| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>Number</code> \| <code>String</code> | Unique identifier for the message recipient |
| title | <code>String</code> | Product name |
| description | <code>String</code> | product description |
| payload | <code>String</code> | Bot defined invoice payload |
| providerToken | <code>String</code> | Payments provider token |
| startParameter | <code>String</code> | Deep-linking parameter |
| currency | <code>String</code> | Three-letter ISO 4217 currency code |
| prices | <code>Array</code> | Breakdown of prices |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+answerShippingQuery"></a>

### telegramBot.answerShippingQuery(shippingQueryId, ok, [options]) ⇒ <code>Promise</code>
Answer shipping query..
Use this method to reply to shipping queries.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#answershippingquery  

| Param | Type | Description |
| --- | --- | --- |
| shippingQueryId | <code>String</code> | Unique identifier for the query to be answered |
| ok | <code>Boolean</code> | Specify if delivery of the product is possible |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+answerPreCheckoutQuery"></a>

### telegramBot.answerPreCheckoutQuery(preCheckoutQueryId, ok, [options]) ⇒ <code>Promise</code>
Answer pre-checkout query.
Use this method to confirm shipping of a product.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#answerprecheckoutquery  

| Param | Type | Description |
| --- | --- | --- |
| preCheckoutQueryId | <code>String</code> | Unique identifier for the query to be answered |
| ok | <code>Boolean</code> | Specify if every order details are ok |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+getStickerSet"></a>

### telegramBot.getStickerSet(name, [options]) ⇒ <code>Promise</code>
Use this method to get a sticker set. On success, a [StickerSet](https://core.telegram.org/bots/api#stickerset) object is returned.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#getstickerset  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>String</code> | Name of the sticker set |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+uploadStickerFile"></a>

### telegramBot.uploadStickerFile(userId, pngSticker, [options], [fileOptions]) ⇒ <code>Promise</code>
Use this method to upload a .png file with a sticker for later use in *createNewStickerSet* and *addStickerToSet* methods (can be used multiple
times). Returns the uploaded [File](https://core.telegram.org/bots/api#file) on success.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#uploadstickerfile  

| Param | Type | Description |
| --- | --- | --- |
| userId | <code>Number</code> | User identifier of sticker file owner |
| pngSticker | <code>String</code> \| <code>stream.Stream</code> \| <code>Buffer</code> | A file path or a Stream. Can also be a `file_id` previously uploaded. **Png** image with the  sticker, must be up to 512 kilobytes in size, dimensions must not exceed 512px, and either width or height must be exactly 512px. |
| [options] | <code>Object</code> | Additional Telegram query options |
| [fileOptions] | <code>Object</code> | Optional file related meta-data |

<a name="TelegramBot+createNewStickerSet"></a>

### telegramBot.createNewStickerSet(userId, name, title, pngSticker, emojis, [options], [fileOptions]) ⇒ <code>Promise</code>
Use this method to create new sticker set owned by a user.
The bot will be able to edit the created sticker set.
Returns True on success.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#createnewstickerset  
**Todo**

- [ ] Add tests for this method!


| Param | Type | Description |
| --- | --- | --- |
| userId | <code>Number</code> | User identifier of created sticker set owner |
| name | <code>String</code> | Short name of sticker set, to be used in `t.me/addstickers/` URLs (e.g., *animals*) |
| title | <code>String</code> | Sticker set title, 1-64 characters |
| pngSticker | <code>String</code> \| <code>stream.Stream</code> \| <code>Buffer</code> | Png image with the sticker, must be up to 512 kilobytes in size,  dimensions must not exceed 512px, and either width or height must be exactly 512px. |
| emojis | <code>String</code> | One or more emoji corresponding to the sticker |
| [options] | <code>Object</code> | Additional Telegram query options |
| [fileOptions] | <code>Object</code> | Optional file related meta-data |

<a name="TelegramBot+addStickerToSet"></a>

### telegramBot.addStickerToSet(userId, name, pngSticker, emojis, [options], [fileOptions]) ⇒ <code>Promise</code>
Use this method to add a new sticker to a set created by the bot.
Returns True on success.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#addstickertoset  
**Todo**

- [ ] Add tests for this method!


| Param | Type | Description |
| --- | --- | --- |
| userId | <code>Number</code> | User identifier of sticker set owner |
| name | <code>String</code> | Sticker set name |
| pngSticker | <code>String</code> \| <code>stream.Stream</code> \| <code>Buffer</code> | Png image with the sticker, must be up to 512 kilobytes in size,  dimensions must not exceed 512px, and either width or height must be exactly 512px |
| emojis | <code>String</code> | One or more emoji corresponding to the sticker |
| [options] | <code>Object</code> | Additional Telegram query options |
| [fileOptions] | <code>Object</code> | Optional file related meta-data |

<a name="TelegramBot+setStickerPositionInSet"></a>

### telegramBot.setStickerPositionInSet(sticker, position, [options]) ⇒ <code>Promise</code>
Use this method to move a sticker in a set created by the bot to a specific position.
Returns True on success.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#setstickerpositioninset  
**Todo**

- [ ] Add tests for this method!


| Param | Type | Description |
| --- | --- | --- |
| sticker | <code>String</code> | File identifier of the sticker |
| position | <code>Number</code> | New sticker position in the set, zero-based |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+deleteStickerFromSet"></a>

### telegramBot.deleteStickerFromSet(sticker, [options]) ⇒ <code>Promise</code>
Use this method to delete a sticker from a set created by the bot.
Returns True on success.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**: https://core.telegram.org/bots/api#deletestickerfromset  
**Todo**

- [ ] Add tests for this method!


| Param | Type | Description |
| --- | --- | --- |
| sticker | <code>String</code> | File identifier of the sticker |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot+sendMediaGroup"></a>

### telegramBot.sendMediaGroup(chatId, media, [options]) ⇒ <code>Promise</code>
Use this method to send a group of photos or videos as an album.
On success, an array of the sent [Messages](https://core.telegram.org/bots/api#message)
is returned.

If you wish to [specify file options](https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#sending-files),
add a `fileOptions` property to the target input in `media`.

**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)  
**See**

- https://core.telegram.org/bots/api#sendmediagroup
- https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#sending-files


| Param | Type | Description |
| --- | --- | --- |
| chatId | <code>String</code> | Unique identifier for the target chat or username of the target channel (in the format `@channelusername`) |
| media | <code>Array</code> | A JSON-serialized array describing photos and videos to be sent, must include 2–10 items |
| [options] | <code>Object</code> | Additional Telegram query options |

<a name="TelegramBot.errors"></a>

### TelegramBot.errors : <code>Object</code>
The different errors the library uses.

**Kind**: static property of [<code>TelegramBot</code>](#TelegramBot)  
<a name="TelegramBot.messageTypes"></a>

### TelegramBot.messageTypes : <code>Array.&lt;String&gt;</code>
The types of message updates the library handles.

**Kind**: static property of [<code>TelegramBot</code>](#TelegramBot)  
<a name="TelegramBot.Promise"></a>

### TelegramBot.Promise
Change Promise library used internally, for all existing and new
instances.

**Kind**: static property of [<code>TelegramBot</code>](#TelegramBot)  

| Param | Type |
| --- | --- |
| customPromise | <code>function</code> | 

**Example**  
```js
const TelegramBot = require('node-telegram-bot-api');
TelegramBot.Promise = myPromise;
```
* * *


[usage-sending-files-performance]:https://github.com/yagop/node-telegram-bot-api/tree/master/doc/usage.md#sending-files-performance
[setWebHook-v0.25.0]:https://github.com/yagop/node-telegram-bot-api/tree/4e5a493cadfaad5589a8d79e55d9e0d103000ce4#telegrambotsetwebhookurl-cert
[getUpdates-v0.25.0]:https://github.com/yagop/node-telegram-bot-api/tree/4e5a493cadfaad5589a8d79e55d9e0d103000ce4#TelegramBot+getUpdates
[getUserProfilePhotos-v0.25.0]:https://github.com/yagop/node-telegram-bot-api/tree/4e5a493cadfaad5589a8d79e55d9e0d103000ce4#TelegramBot+getUserProfilePhotos
[answerCallbackQuery-v0.27.1]:https://github.com/yagop/node-telegram-bot-api/blob/v0.27.1/doc/api.md#TelegramBot+answerCallbackQuery
[answerCallbackQuery-v0.29.0]:https://github.com/yagop/node-telegram-bot-api/blob/v0.29.0/doc/api.md#TelegramBot+answerCallbackQuery
