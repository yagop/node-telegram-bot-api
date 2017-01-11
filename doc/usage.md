# Usage

1. [Events](#events)
1. [WebHooks](#WebHooks)
1. [Sending files](#sending-files)


* * *


<a name="events"></a>
## Events

*TelegramBot* is an event-emitter that emits the following events:

1. `message`: Received a new incoming [Message][message] of any kind
  1. Depending on the properties of the [Message][message], one of these
     events will **ALSO** be emitted: `text`, `audio`, `document`, `photo`,
     `sticker`, `video`, `voice`, `contact`, `location`,
     `new_chat_participant`, `left_chat_participant`, `new_chat_title`,
     `new_chat_photo`, `delete_chat_photo`, `group_chat_created`
1. `callback_query`: Received a new incoming [Callback Query][callback-query]
1. `inline_query`: Received a new incoming [Inline Query][inline-query]
1. `chosen_inline_result`: Received result of an inline query i.e. [ChosenInlineResult][chosen-inline-result]
1. `channel_post`: Received a new incoming channel post of any kind
1. `edited_message`: Received a new version of a message that is known to the bot and was edited
  1. `edited_message_text`
  1. `edited_message_caption`
1. `edited_channel_post`: Received a new version of a channel post that is known to the bot and was edited
  1. `edited_channel_post_text`
  1. `edited_channel_post_caption`

**Tip:** Its much better to listen a specific event rather than on
`message` in order to stay safe from the content.

**Tip:** Bot must be enabled on [inline mode][inline-mode] for receive some
messages.

[update]:https://core.telegram.org/bots/api#update
[message]:https://core.telegram.org/bots/api#message
[callback-query]:https://core.telegram.org/bots/api#callbackquery
[inline-query]:https://core.telegram.org/bots/api#inlinequery
[chosen-inline-result]:https://core.telegram.org/bots/api#choseninlineresult
[inline-mode]:https://core.telegram.org/bots/api#inline-mode


* * *


<a name="webhooks"></a>
## WebHooks

Telegram only supports HTTPS connections to WebHooks.
Therefore, in order to set a WebHook, you will need a SSL certificate.
Since August 29, 2015 Telegram supports self-signed ones, thus, you can
generate them:

```bash
# Our private cert will be key.pem, keep this file private
$ openssl genrsa -out key.pem 2048

# Our public certificate will be crt.pem
$ openssl req -new -sha256 -key key.pem -out crt.pem
```

Once they are generated, the `crt.pem` should be uploaded, when setting up
your webhook. For example,

```js
bot.setWebHook("public-url.com", {
  certificate: "path/to/crt.pem", // Path to your crt.pem
});
```

**Note:** If you encounter an error, like
`Error: error:0906D06C:PEM routines:PEM_read_bio:no start line`,
you may want to proceed to [this issue][issue-63] for more information.

[issue-63]:https://github.com/yagop/node-telegram-bot-api/issues/63


* * *


<a name="sending-files"></a>
## Sending files

The library makes it easy to get started sending files. *By default*, you
may provide a **file-path** and the library will handle reading it for you.
For example,

```js
bot.sendAudio(chatId, "path/to/audio.mp3");
```

You may also pass in a **Readable Stream** from which data will be piped.
For example,

```js
const stream = fs.createReadStream("path/to/audio.mp3");
bot.sendAudio(chatId, stream);
```

You may also pass in a **Buffer** containing the contents of your file.
For example,

```js
const buffer = fs.readFileSync("path/to/audio.mp3"); // sync! that's sad! :-( Just making a point!
bot.sendAudio(chatId, buffer);
```

If you already have a **File ID**, you earlier retrieved from Telegram,
you may pass it in, for example:

```js
const fileId = getFileIdSomehow();
bot.sendAudio(chatId, fileId);
```

Some API methods, such as *SendPhoto*, allow passing a **HTTP URL**, that
the Telegram servers will use to download the file. For example,

```js
const url = "https://telegram.org/img/t_logo.png";
bot.sendPhoto(chatId, url);
```

<a name="sending-files-performance"></a>
### Performance Issue:

To support providing file-paths to methods that send files involves
performing a file operation, i.e. *fs.existsSync()*, that checks for
the existence of the file at the provided path. While the cost of
this operation *might* be negligible in most use cases, if you want
to squeeze the best performance out of this library, you may wish to
disable this behavior.

This will mean that you will **NOT** be able to pass in file-paths.
You will have to use Streams or Buffers to provide the file contents.

Disabling this behavior:

```js
const bot = new TelegramBot(token, {
  filepath: false,
});
```
