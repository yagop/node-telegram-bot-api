[![Build Status](https://travis-ci.org/yagop/telegram-bot-api.svg?branch=master)](https://travis-ci.org/yagop/telegram-bot-api) [![Coverage Status](https://coveralls.io/repos/yagop/telegram-bot-api/badge.svg?branch=develop)](https://coveralls.io/r/yagop/telegram-bot-api?branch=develop)

* * *

## Class: TelegramBot
NodeJS class for Telegram Bot API.

Support for WebHooks and long polling. Emits `message` when message arrives.

### TelegramBot.getMe()

Returns basic information about the bot in form of a `User` object.

**Returns**: `Promise`

### TelegramBot.setWebHook(url)

Specify a url to receive incoming updates via an outgoing webHook.

**Parameters**

**url**: `String`, URL


### TelegramBot.getUpdates(timeout, limit, offset)

Use this method to receive incoming updates using long polling

**Parameters**

**timeout**: `Number | String`, Timeout in seconds for long polling.

**limit**: `Number | String`, Limits the number of updates to be retrieved.

**offset**: `Number | String`, Identifier of the first update to be returned.

**Returns**: `Promise`, Updates

### TelegramBot.sendMessage(chatId, text, options)

Send text message.

**Parameters**

**chatId**: `Number | String`, Unique identifier for the message recipient

**text**: `Sting`, Text of the message to be sent

**options**: `Object`, Additional Telegram query options

**Returns**: `Promise`

### TelegramBot.forwardMessage(chatId, fromChatId, messageId)

Forward messages of any kind.

**Parameters**

**chatId**: `Number | String`, Unique identifier for the message recipient

**fromChatId**: `Number | String`, Unique identifier for the chat where the
original message was sent

**messageId**: `Number | String`, Unique message identifier

**Returns**: `Promise`

### TelegramBot.sendPhoto(chatId, photo, options)

Send photo

**Parameters**

**chatId**: `Number | String`, Unique identifier for the message recipient

**photo**: `String | stream.Stream`, A file path or a Stream. Can
also be a `file_id` previously uploaded

**options**: `Object`, Additional Telegram query options

**Returns**: `Promise`

### TelegramBot.sendAudio(chatId, audio, options)

Send audio

**Parameters**

**chatId**: `Number | String`, Unique identifier for the message recipient

**audio**: `String | stream.Stream`, A file path or a Stream. Can
also be a `file_id` previously uploaded.

**options**: `Object`, Additional Telegram query options

**Returns**: `Promise`



* * *
