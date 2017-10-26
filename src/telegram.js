// shims
require('array.prototype.findindex').shim(); // for Node.js v0.x

const errors = require('./errors');
const TelegramBotWebHook = require('./telegramWebHook');
const TelegramBotPolling = require('./telegramPolling');
const debug = require('debug')('node-telegram-bot-api');
const EventEmitter = require('eventemitter3');
const fileType = require('file-type');
const request = require('request-promise');
const streamedRequest = require('request');
const qs = require('querystring');
const stream = require('stream');
const mime = require('mime');
const path = require('path');
const URL = require('url');
const fs = require('fs');
const pump = require('pump');
const deprecate = require('depd')('node-telegram-bot-api');
let Promise = require('bluebird');

const _messageTypes = [
  'audio',
  'channel_chat_created',
  'contact',
  'delete_chat_photo',
  'document',
  'game',
  'group_chat_created',
  'invoice',
  'left_chat_member',
  'location',
  'migrate_from_chat_id',
  'migrate_to_chat_id',
  'new_chat_members',
  'new_chat_photo',
  'new_chat_title',
  'photo',
  'pinned_message',
  'sticker',
  'successful_payment',
  'supergroup_chat_created',
  'text',
  'video',
  'video_note',
  'voice',
];
const _deprecatedMessageTypes = [
  'new_chat_participant', 'left_chat_participant'
];


if (!process.env.NTBA_FIX_319) {
  // Enable Promise cancellation.
  try {
    const msg =
      'Automatic enabling of cancellation of promises is deprecated.\n' +
      'In the future, you will have to enable it yourself.\n' +
      'See https://github.com/yagop/node-telegram-bot-api/issues/319.';
    deprecate(msg);
    Promise.config({
      cancellation: true,
    });
  } catch (ex) {
    /* eslint-disable no-console */
    const msg =
      'error: Enabling Promise cancellation failed.\n' +
      '       Temporary fix is to load/require this library as early as possible before using any Promises.';
    console.error(msg);
    throw ex;
    /* eslint-enable no-console */
  }
}


class TelegramBot extends EventEmitter {

  static get errors() {
    return errors;
  }

  static get messageTypes() {
    return _messageTypes;
  }

  /**
   * Change Promise library used internally, for all existing and new
   * instances.
   * @param  {Function} customPromise
   *
   * @example
   * const TelegramBot = require('node-telegram-bot-api');
   * TelegramBot.Promise = myPromise;
   */
  static set Promise(customPromise) {
    Promise = customPromise;
  }

  on(event, listener) {
    if (_deprecatedMessageTypes.indexOf(event) !== -1) {
      const url = 'https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#events';
      deprecate(`Events ${_deprecatedMessageTypes.join(',')} are deprecated. See the updated list of events: ${url}`);
    }
    super.on(event, listener);
  }

  /**
   * Both request method to obtain messages are implemented. To use standard polling, set `polling: true`
   * on `options`. Notice that [webHook](https://core.telegram.org/bots/api#setwebhook) will need a SSL certificate.
   * Emits `message` when a message arrives.
   *
   * @class TelegramBot
   * @constructor
   * @param {String} token Bot Token
   * @param {Object} [options]
   * @param {Boolean|Object} [options.polling=false] Set true to enable polling or set options.
   *  If a WebHook has been set, it will be deleted automatically.
   * @param {String|Number} [options.polling.timeout=10] *Deprecated. Use `options.polling.params` instead*.
   *  Timeout in seconds for long polling.
   * @param {String|Number} [options.polling.interval=300] Interval between requests in miliseconds
   * @param {Boolean} [options.polling.autoStart=true] Start polling immediately
   * @param {Object} [options.polling.params] Parameters to be used in polling API requests.
   *  See https://core.telegram.org/bots/api#getupdates for more information.
   * @param  {Number} [options.polling.params.timeout=10] Timeout in seconds for long polling.
   * @param {Boolean|Object} [options.webHook=false] Set true to enable WebHook or set options
   * @param {String} [options.webHook.host=0.0.0.0] Host to bind to
   * @param {Number} [options.webHook.port=8443] Port to bind to
   * @param {String} [options.webHook.key] Path to file with PEM private key for webHook server.
   *  The file is read **synchronously**!
   * @param {String} [options.webHook.cert] Path to file with PEM certificate (public) for webHook server.
   *  The file is read **synchronously**!
   * @param {String} [options.webHook.pfx] Path to file with PFX private key and certificate chain for webHook server.
   *  The file is read **synchronously**!
   * @param {Boolean} [options.webHook.autoOpen=true] Open webHook immediately
   * @param {Object} [options.webHook.https] Options to be passed to `https.createServer()`.
   *  Note that `options.webHook.key`, `options.webHook.cert` and `options.webHook.pfx`, if provided, will be
   *  used to override `key`, `cert` and `pfx` in this object, respectively.
   *  See https://nodejs.org/api/https.html#https_https_createserver_options_requestlistener for more information.
   * @param {String} [options.webHook.healthEndpoint=/healthz] An endpoint for health checks that always responds with 200 OK
   * @param {Boolean} [options.onlyFirstMatch=false] Set to true to stop after first match. Otherwise, all regexps are executed
   * @param {Object} [options.request] Options which will be added for all requests to telegram api.
   *  See https://github.com/request/request#requestoptions-callback for more information.
   * @param {String} [options.baseApiUrl=https://api.telegram.org] API Base URl; useful for proxying and testing
   * @param {Boolean} [options.filepath=true] Allow passing file-paths as arguments when sending files,
   *  such as photos using `TelegramBot#sendPhoto()`. See [usage information][usage-sending-files-performance]
   *  for more information on this option and its consequences.
   * @see https://core.telegram.org/bots/api
   */
  constructor(token, options = {}) {
    super();
    this.token = token;
    this.options = options;
    this.options.polling = (typeof options.polling === 'undefined') ? false : options.polling;
    this.options.webHook = (typeof options.webHook === 'undefined') ? false : options.webHook;
    this.options.baseApiUrl = options.baseApiUrl || 'https://api.telegram.org';
    this.options.filepath = (typeof options.filepath === 'undefined') ? true : options.filepath;
    this._textRegexpCallbacks = [];
    this._replyListenerId = 0;
    this._replyListeners = [];
    this._polling = null;
    this._webHook = null;

    if (options.polling) {
      const autoStart = options.polling.autoStart;
      if (typeof autoStart === 'undefined' || autoStart === true) {
        this.startPolling();
      }
    }

    if (options.webHook) {
      const autoOpen = options.webHook.autoOpen;
      if (typeof autoOpen === 'undefined' || autoOpen === true) {
        this.openWebHook();
      }
    }
  }

  /**
   * Generates url with bot token and provided path/method you want to be got/executed by bot
   * @param  {String} path
   * @return {String} url
   * @private
   * @see https://core.telegram.org/bots/api#making-requests
   */
  _buildURL(_path) {
    return `${this.options.baseApiUrl}/bot${this.token}/${_path}`;
  }

  /**
   * Fix 'reply_markup' parameter by making it JSON-serialized, as
   * required by the Telegram Bot API
   * @param {Object} obj Object; either 'form' or 'qs'
   * @private
   * @see https://core.telegram.org/bots/api#sendmessage
   */
  _fixReplyMarkup(obj) {
    const replyMarkup = obj.reply_markup;
    if (replyMarkup && typeof replyMarkup !== 'string') {
      obj.reply_markup = JSON.stringify(replyMarkup);
    }
  }

  /**
   * Make request against the API
   * @param  {String} _path API endpoint
   * @param  {Object} [options]
   * @private
   * @return {Promise}
   */
  _request(_path, options = {}) {
    if (!this.token) {
      return Promise.reject(new errors.FatalError('Telegram Bot Token not provided!'));
    }

    if (this.options.request) {
      Object.assign(options, this.options.request);
    }

    if (options.form) {
      this._fixReplyMarkup(options.form);
    }
    if (options.qs) {
      this._fixReplyMarkup(options.qs);
    }

    options.method = 'POST';
    options.url = this._buildURL(_path);
    options.simple = false;
    options.resolveWithFullResponse = true;
    options.forever = true;
    debug('HTTP request: %j', options);
    return request(options)
      .then(resp => {
        let data;
        try {
          data = resp.body = JSON.parse(resp.body);
        } catch (err) {
          throw new errors.ParseError(`Error parsing Telegram response: ${resp.body}`, resp);
        }

        if (data.ok) {
          return data.result;
        }

        throw new errors.TelegramError(`${data.error_code} ${data.description}`, resp);
      }).catch(error => {
        // TODO: why can't we do `error instanceof errors.BaseError`?
        if (error.response) throw error;
        throw new errors.FatalError(error);
      });
  }

  /**
   * Format data to be uploaded; handles file paths, streams and buffers
   * @param  {String} type
   * @param  {String|stream.Stream|Buffer} data
   * @return {Array} formatted
   * @return {Object} formatted[0] formData
   * @return {String} formatted[1] fileId
   * @throws Error if Buffer file type is not supported.
   * @see https://npmjs.com/package/file-type
   * @private
   */
  _formatSendData(type, data) {
    let formData;
    let fileName;
    let fileId;
    if (data instanceof stream.Stream) {
      // Will be 'null' if could not be parsed. Default to 'filename'.
      // For example, 'data.path' === '/?id=123' from 'request("https://example.com/?id=123")'
      fileName = URL.parse(path.basename(data.path.toString())).pathname || 'filename';
      formData = {};
      formData[type] = {
        value: data,
        options: {
          filename: qs.unescape(fileName),
          contentType: mime.lookup(fileName)
        }
      };
    } else if (Buffer.isBuffer(data)) {
      const filetype = fileType(data);
      if (!filetype) {
        throw new errors.FatalError('Unsupported Buffer file type');
      }
      formData = {};
      formData[type] = {
        value: data,
        options: {
          filename: `data.${filetype.ext}`,
          contentType: filetype.mime
        }
      };
    } else if (!this.options.filepath) {
      /**
       * When the constructor option 'filepath' is set to
       * 'false', we do not support passing file-paths.
       */
      fileId = data;
    } else if (fs.existsSync(data)) {
      fileName = path.basename(data);
      formData = {};
      formData[type] = {
        value: fs.createReadStream(data),
        options: {
          filename: fileName,
          contentType: mime.lookup(fileName)
        }
      };
    } else {
      fileId = data;
    }
    return [formData, fileId];
  }

  /**
   * Start polling.
   * Rejects returned promise if a WebHook is being used by this instance.
   * @param  {Object} [options]
   * @param  {Boolean} [options.restart=true] Consecutive calls to this method causes polling to be restarted
   * @return {Promise}
   */
  startPolling(options = {}) {
    if (this.hasOpenWebHook()) {
      return Promise.reject(new errors.FatalError('Polling and WebHook are mutually exclusive'));
    }
    options.restart = typeof options.restart === 'undefined' ? true : options.restart;
    if (!this._polling) {
      this._polling = new TelegramBotPolling(this);
    }
    return this._polling.start(options);
  }

  /**
   * Alias of `TelegramBot#startPolling()`. This is **deprecated**.
   * @param  {Object} [options]
   * @return {Promise}
   * @deprecated
   */
  initPolling() {
    deprecate('TelegramBot#initPolling() is deprecated');
    return this.startPolling();
  }

  /**
   * Stops polling after the last polling request resolves.
   * Multiple invocations do nothing if polling is already stopped.
   * Returning the promise of the last polling request is **deprecated**.
   * @return {Promise}
   */
  stopPolling() {
    if (!this._polling) {
      return Promise.resolve();
    }
    return this._polling.stop();
  }

  /**
   * Return true if polling. Otherwise, false.
   * @return {Boolean}
   */
  isPolling() {
    return this._polling ? this._polling.isPolling() : false;
  }

  /**
   * Open webhook.
   * Multiple invocations do nothing if webhook is already open.
   * Rejects returned promise if Polling is being used by this instance.
   * @return {Promise}
   */
  openWebHook() {
    if (this.isPolling()) {
      return Promise.reject(new errors.FatalError('WebHook and Polling are mutually exclusive'));
    }
    if (!this._webHook) {
      this._webHook = new TelegramBotWebHook(this);
    }
    return this._webHook.open();
  }

  /**
   * Close webhook after closing all current connections.
   * Multiple invocations do nothing if webhook is already closed.
   * @return {Promise} promise
   */
  closeWebHook() {
    if (!this._webHook) {
      return Promise.resolve();
    }
    return this._webHook.close();
  }

  /**
   * Return true if using webhook and it is open i.e. accepts connections.
   * Otherwise, false.
   * @return {Boolean}
   */
  hasOpenWebHook() {
    return this._webHook ? this._webHook.isOpen() : false;
  }

  /**
   * Returns basic information about the bot in form of a `User` object.
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#getme
   */
  getMe() {
    const _path = 'getMe';
    return this._request(_path);
  }

  /**
   * Specify an url to receive incoming updates via an outgoing webHook.
   * This method has an [older, compatible signature][setWebHook-v0.25.0]
   * that is being deprecated.
   *
   * @param  {String} url URL where Telegram will make HTTP Post. Leave empty to
   * delete webHook.
   * @param  {Object} [options] Additional Telegram query options
   * @param  {String|stream.Stream} [options.certificate] PEM certificate key (public).
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#setwebhook
   */
  setWebHook(url, options = {}) {
    /* The older method signature was setWebHook(url, cert).
     * We need to ensure backwards-compatibility while maintaining
     * consistency of the method signatures throughout the library */
    let cert;
    // Note: 'options' could be an object, if a stream was provided (in place of 'cert')
    if (typeof options !== 'object' || options instanceof stream.Stream) {
      deprecate('The method signature setWebHook(url, cert) has been deprecated since v0.25.0');
      cert = options;
      options = {}; // eslint-disable-line no-param-reassign
    } else {
      cert = options.certificate;
    }

    const opts = {
      qs: options,
    };
    opts.qs.url = url;

    if (cert) {
      try {
        const sendData = this._formatSendData('certificate', cert);
        opts.formData = sendData[0];
        opts.qs.certificate = sendData[1];
      } catch (ex) {
        return Promise.reject(ex);
      }
    }

    return this._request('setWebHook', opts);
  }

  /**
   * Use this method to remove webhook integration if you decide to
   * switch back to getUpdates. Returns True on success.
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#deletewebhook
   */
  deleteWebHook() {
    return this._request('deleteWebhook');
  }

  /**
   * Use this method to get current webhook status.
   * On success, returns a [WebhookInfo](https://core.telegram.org/bots/api#webhookinfo) object.
   * If the bot is using getUpdates, will return an object with the
   * url field empty.
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#getwebhookinfo
   */
  getWebHookInfo() {
    return this._request('getWebhookInfo');
  }

  /**
   * Use this method to receive incoming updates using long polling.
   * This method has an [older, compatible signature][getUpdates-v0.25.0]
   * that is being deprecated.
   *
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#getupdates
   */
  getUpdates(form = {}) {
    /* The older method signature was getUpdates(timeout, limit, offset).
     * We need to ensure backwards-compatibility while maintaining
     * consistency of the method signatures throughout the library */
    if (typeof form !== 'object') {
      /* eslint-disable no-param-reassign, prefer-rest-params */
      deprecate('The method signature getUpdates(timeout, limit, offset) has been deprecated since v0.25.0');
      form = {
        timeout: arguments[0],
        limit: arguments[1],
        offset: arguments[2],
      };
      /* eslint-enable no-param-reassign, prefer-rest-params */
    }

    return this._request('getUpdates', { form });
  }

  /**
   * Process an update; emitting the proper events and executing regexp
   * callbacks. This method is useful should you be using a different
   * way to fetch updates, other than those provided by TelegramBot.
   * @param  {Object} update
   * @see https://core.telegram.org/bots/api#update
   */
  processUpdate(update) {
    debug('Process Update %j', update);
    const message = update.message;
    const editedMessage = update.edited_message;
    const channelPost = update.channel_post;
    const editedChannelPost = update.edited_channel_post;
    const inlineQuery = update.inline_query;
    const chosenInlineResult = update.chosen_inline_result;
    const callbackQuery = update.callback_query;
    const shippingQuery = update.shipping_query;
    const preCheckoutQuery = update.pre_checkout_query;

    if (message) {
      debug('Process Update message %j', message);
      this.emit('message', message);
      const processMessageType = messageType => {
        if (message[messageType]) {
          debug('Emitting %s: %j', messageType, message);
          this.emit(messageType, message);
        }
      };
      TelegramBot.messageTypes.forEach(processMessageType);
      if (message.text) {
        debug('Text message');
        this._textRegexpCallbacks.some(reg => {
          debug('Matching %s with %s', message.text, reg.regexp);
          const result = reg.regexp.exec(message.text);
          if (!result) {
            return false;
          }
          // reset index so we start at the beginning of the regex each time
          reg.regexp.lastIndex = 0;
          debug('Matches %s', reg.regexp);
          reg.callback(message, result);
          // returning truthy value exits .some
          return this.options.onlyFirstMatch;
        });
      }
      if (message.reply_to_message) {
        // Only callbacks waiting for this message
        this._replyListeners.forEach(reply => {
          // Message from the same chat
          if (reply.chatId === message.chat.id) {
            // Responding to that message
            if (reply.messageId === message.reply_to_message.message_id) {
              // Resolve the promise
              reply.callback(message);
            }
          }
        });
      }
    } else if (editedMessage) {
      debug('Process Update edited_message %j', editedMessage);
      this.emit('edited_message', editedMessage);
      if (editedMessage.text) {
        this.emit('edited_message_text', editedMessage);
      }
      if (editedMessage.caption) {
        this.emit('edited_message_caption', editedMessage);
      }
    } else if (channelPost) {
      debug('Process Update channel_post %j', channelPost);
      this.emit('channel_post', channelPost);
    } else if (editedChannelPost) {
      debug('Process Update edited_channel_post %j', editedChannelPost);
      this.emit('edited_channel_post', editedChannelPost);
      if (editedChannelPost.text) {
        this.emit('edited_channel_post_text', editedChannelPost);
      }
      if (editedChannelPost.caption) {
        this.emit('edited_channel_post_caption', editedChannelPost);
      }
    } else if (inlineQuery) {
      debug('Process Update inline_query %j', inlineQuery);
      this.emit('inline_query', inlineQuery);
    } else if (chosenInlineResult) {
      debug('Process Update chosen_inline_result %j', chosenInlineResult);
      this.emit('chosen_inline_result', chosenInlineResult);
    } else if (callbackQuery) {
      debug('Process Update callback_query %j', callbackQuery);
      this.emit('callback_query', callbackQuery);
    } else if (shippingQuery) {
      debug('Process Update shipping_query %j', shippingQuery);
      this.emit('shipping_query', shippingQuery);
    } else if (preCheckoutQuery) {
      debug('Process Update pre_checkout_query %j', preCheckoutQuery);
      this.emit('pre_checkout_query', preCheckoutQuery);
    }
  }

  /**
   * Send text message.
   * @param  {Number|String} chatId Unique identifier for the message recipient
   * @param  {String} text Text of the message to be sent
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#sendmessage
   */
  sendMessage(chatId, text, form = {}) {
    form.chat_id = chatId;
    form.text = text;
    return this._request('sendMessage', { form });
  }

  /**
   * Send answers to an inline query.
   * @param  {String} inlineQueryId Unique identifier of the query
   * @param  {InlineQueryResult[]} results An array of results for the inline query
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#answerinlinequery
   */
  answerInlineQuery(inlineQueryId, results, form = {}) {
    form.inline_query_id = inlineQueryId;
    form.results = JSON.stringify(results);
    return this._request('answerInlineQuery', { form });
  }

  /**
   * Forward messages of any kind.
   * @param  {Number|String} chatId     Unique identifier for the message recipient
   * @param  {Number|String} fromChatId Unique identifier for the chat where the
   * original message was sent
   * @param  {Number|String} messageId  Unique message identifier
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   */
  forwardMessage(chatId, fromChatId, messageId, form = {}) {
    form.chat_id = chatId;
    form.from_chat_id = fromChatId;
    form.message_id = messageId;
    return this._request('forwardMessage', { form });
  }

  /**
   * Send photo
   * @param  {Number|String} chatId  Unique identifier for the message recipient
   * @param  {String|stream.Stream|Buffer} photo A file path or a Stream. Can
   * also be a `file_id` previously uploaded
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#sendphoto
   */
  sendPhoto(chatId, photo, options = {}) {
    const opts = {
      qs: options,
    };
    opts.qs.chat_id = chatId;
    try {
      const sendData = this._formatSendData('photo', photo);
      opts.formData = sendData[0];
      opts.qs.photo = sendData[1];
    } catch (ex) {
      return Promise.reject(ex);
    }
    return this._request('sendPhoto', opts);
  }

  /**
   * Send audio
   * @param  {Number|String} chatId  Unique identifier for the message recipient
   * @param  {String|stream.Stream|Buffer} audio A file path, Stream or Buffer.
   * Can also be a `file_id` previously uploaded.
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#sendaudio
   */
  sendAudio(chatId, audio, options = {}) {
    const opts = {
      qs: options
    };
    opts.qs.chat_id = chatId;
    try {
      const sendData = this._formatSendData('audio', audio);
      opts.formData = sendData[0];
      opts.qs.audio = sendData[1];
    } catch (ex) {
      return Promise.reject(ex);
    }
    return this._request('sendAudio', opts);
  }

  /**
   * Send Document
   * @param  {Number|String} chatId  Unique identifier for the message recipient
   * @param  {String|stream.Stream|Buffer} doc A file path, Stream or Buffer.
   * Can also be a `file_id` previously uploaded.
   * @param  {Object} [options] Additional Telegram query options
   * @param  {Object} [fileOpts] Optional file related meta-data
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#sendDocument
   */
  sendDocument(chatId, doc, options = {}, fileOpts = {}) {
    const opts = {
      qs: options
    };
    opts.qs.chat_id = chatId;
    try {
      const sendData = this._formatSendData('document', doc);
      opts.formData = sendData[0];
      opts.qs.document = sendData[1];
    } catch (ex) {
      return Promise.reject(ex);
    }
    if (opts.formData && Object.keys(fileOpts).length) {
      opts.formData.document.options = fileOpts;
    }
    return this._request('sendDocument', opts);
  }

  /**
   * Send .webp stickers.
   * @param  {Number|String} chatId  Unique identifier for the message recipient
   * @param  {String|stream.Stream|Buffer} sticker A file path, Stream or Buffer.
   * Can also be a `file_id` previously uploaded. Stickers are WebP format files.
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#sendsticker
   */
  sendSticker(chatId, sticker, options = {}) {
    const opts = {
      qs: options
    };
    opts.qs.chat_id = chatId;
    try {
      const sendData = this._formatSendData('sticker', sticker);
      opts.formData = sendData[0];
      opts.qs.sticker = sendData[1];
    } catch (ex) {
      return Promise.reject(ex);
    }
    return this._request('sendSticker', opts);
  }

  /**
   * Use this method to send video files, Telegram clients support mp4 videos (other formats may be sent as Document).
   * @param  {Number|String} chatId  Unique identifier for the message recipient
   * @param  {String|stream.Stream|Buffer} video A file path or Stream.
   * Can also be a `file_id` previously uploaded.
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#sendvideo
   */
  sendVideo(chatId, video, options = {}) {
    const opts = {
      qs: options
    };
    opts.qs.chat_id = chatId;
    try {
      const sendData = this._formatSendData('video', video);
      opts.formData = sendData[0];
      opts.qs.video = sendData[1];
    } catch (ex) {
      return Promise.reject(ex);
    }
    return this._request('sendVideo', opts);
  }

  /**
   * Use this method to send rounded square videos of upto 1 minute long.
   * @param  {Number|String} chatId  Unique identifier for the message recipient
   * @param  {String|stream.Stream|Buffer} videoNote A file path or Stream.
   * Can also be a `file_id` previously uploaded.
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @info The length parameter is actually optional. However, the API (at time of writing) requires you to always provide it until it is fixed.
   * @see https://core.telegram.org/bots/api#sendvideonote
   */
  sendVideoNote(chatId, videoNote, options = {}) {
    const opts = {
      qs: options
    };
    opts.qs.chat_id = chatId;
    try {
      const sendData = this._formatSendData('video_note', videoNote);
      opts.formData = sendData[0];
      opts.qs.video_note = sendData[1];
    } catch (ex) {
      return Promise.reject(ex);
    }
    return this._request('sendVideoNote', opts);
  }

  /**
   * Send voice
   * @param  {Number|String} chatId  Unique identifier for the message recipient
   * @param  {String|stream.Stream|Buffer} voice A file path, Stream or Buffer.
   * Can also be a `file_id` previously uploaded.
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#sendvoice
   */
  sendVoice(chatId, voice, options = {}) {
    const opts = {
      qs: options
    };
    opts.qs.chat_id = chatId;
    try {
      const sendData = this._formatSendData('voice', voice);
      opts.formData = sendData[0];
      opts.qs.voice = sendData[1];
    } catch (ex) {
      return Promise.reject(ex);
    }
    return this._request('sendVoice', opts);
  }


  /**
   * Send chat action.
   * `typing` for text messages,
   * `upload_photo` for photos, `record_video` or `upload_video` for videos,
   * `record_audio` or `upload_audio` for audio files, `upload_document` for general files,
   * `find_location` for location data.
   *
   * @param  {Number|String} chatId  Unique identifier for the message recipient
   * @param  {String} action Type of action to broadcast.
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#sendchataction
   */
  sendChatAction(chatId, action) {
    const form = {
      action,
      chat_id: chatId
    };
    return this._request('sendChatAction', { form });
  }

  /**
   * Use this method to kick a user from a group or a supergroup.
   * In the case of supergroups, the user will not be able to return
   * to the group on their own using invite links, etc., unless unbanned
   * first. The bot must be an administrator in the group for this to work.
   * Returns True on success.
   *
   * @param  {Number|String} chatId  Unique identifier for the target group or username of the target supergroup
   * @param  {String} userId  Unique identifier of the target user
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#kickchatmember
   */
  kickChatMember(chatId, userId) {
    const form = {
      chat_id: chatId,
      user_id: userId
    };
    return this._request('kickChatMember', { form });
  }

  /**
   * Use this method to unban a previously kicked user in a supergroup.
   * The user will not return to the group automatically, but will be
   * able to join via link, etc. The bot must be an administrator in
   * the group for this to work. Returns True on success.
   *
   * @param  {Number|String} chatId  Unique identifier for the target group or username of the target supergroup
   * @param  {String} userId  Unique identifier of the target user
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#unbanchatmember
   */
  unbanChatMember(chatId, userId) {
    const form = {
      chat_id: chatId,
      user_id: userId
    };
    return this._request('unbanChatMember', { form });
  }

  /**
   * Use this method to restrict a user in a supergroup.
   * The bot must be an administrator in the supergroup for this to work
   * and must have the appropriate admin rights. Pass True for all boolean parameters
   * to lift restrictions from a user. Returns True on success.
   *
   * @param  {Number|String} chatId Unique identifier for the target chat or username of the target supergroup
   * @param  {String} userId Unique identifier of the target user
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#restrictchatmember
   */
  restrictChatMember(chatId, userId, form = {}) {
    form.chat_id = chatId;
    form.user_id = userId;
    return this._request('restrictChatMember', { form });
  }

  /**
   * Use this method to promote or demote a user in a supergroup or a channel.
   * The bot must be an administrator in the chat for this to work
   * and must have the appropriate admin rights. Pass False for all boolean parameters to demote a user.
   * Returns True on success.
   *
   * @param  {Number|String} chatId Unique identifier for the target chat or username of the target supergroup
   * @param  {String} userId
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#promotechatmember
   */
  promoteChatMember(chatId, userId, form = {}) {
    form.chat_id = chatId;
    form.user_id = userId;
    return this._request('promoteChatMember', { form });
  }

  /**
   * Use this method to export an invite link to a supergroup or a channel.
   * The bot must be an administrator in the chat for this to work and must have the appropriate admin rights.
   * Returns exported invite link as String on success.
   *
   * @param  {Number|String} chatId Unique identifier for the target chat or username of the target supergroup
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#exportchatinvitelink
   */
  exportChatInviteLink(chatId, form = {}) {
    form.chat_id = chatId;
    return this._request('exportChatInviteLink', { form });
  }

  /**
   * Use this method to set a new profile photo for the chat. Photos can't be changed for private chats.
   * The bot must be an administrator in the chat for this to work and must have the appropriate admin rights.
   * Returns True on success.
   *
   * @param  {Number|String} chatId  Unique identifier for the message recipient
   * @param  {stream.Stream|Buffer} photo A file path or a Stream.
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#setchatphoto
   */
  setChatPhoto(chatId, photo, options = {}) {
    const opts = {
      qs: options,
    };
    opts.qs.chat_id = chatId;
    try {
      const sendData = this._formatSendData('photo', photo);
      opts.formData = sendData[0];
      opts.qs.photo = sendData[1];
    } catch (ex) {
      return Promise.reject(ex);
    }
    return this._request('setChatPhoto', opts);
  }

  /**
   * Use this method to delete a chat photo. Photos can't be changed for private chats.
   * The bot must be an administrator in the chat for this to work and must have the appropriate admin rights.
   * Returns True on success.
   *
   * @param  {Number|String} chatId  Unique identifier for the message recipient
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#deletechatphoto
   */
  deleteChatPhoto(chatId, form = {}) {
    form.chat_id = chatId;
    return this._request('deleteChatPhoto', { form });
  }

  /**
   * Use this method to change the title of a chat. Titles can't be changed for private chats.
   * The bot must be an administrator in the chat for this to work and must have the appropriate admin rights.
   * Returns True on success.
   *
   * @param  {Number|String} chatId  Unique identifier for the message recipient
   * @param  {String} title New chat title, 1-255 characters
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#setchattitle
   */
  setChatTitle(chatId, title, form = {}) {
    form.chat_id = chatId;
    form.title = title;
    return this._request('setChatTitle', { form });
  }

  /**
   * Use this method to change the description of a supergroup or a channel.
   * The bot must be an administrator in the chat for this to work and must have the appropriate admin rights.
   * Returns True on success.
   *
   * @param  {Number|String} chatId  Unique identifier for the message recipient
   * @param  {String} description New chat title, 1-255 characters
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#setchatdescription
   */
  setChatDescription(chatId, description, form = {}) {
    form.chat_id = chatId;
    form.description = description;
    return this._request('setChatDescription', { form });
  }

  /**
   * Use this method to pin a message in a supergroup.
   * The bot must be an administrator in the chat for this to work and must have the appropriate admin rights.
   * Returns True on success.
   *
   * @param  {Number|String} chatId  Unique identifier for the message recipient
   * @param  {String} messageId Identifier of a message to pin
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#pinchatmessage
   */
  pinChatMessage(chatId, messageId, form = {}) {
    form.chat_id = chatId;
    form.message_id = messageId;
    return this._request('pinChatMessage', { form });
  }

  /**
   * Use this method to unpin a message in a supergroup chat.
   * The bot must be an administrator in the chat for this to work and must have the appropriate admin rights.
   * Returns True on success.
   *
   * @param  {Number|String} chatId  Unique identifier for the message recipient
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#unpinchatmessage
   */
  unpinChatMessage(chatId, form = {}) {
    form.chat_id = chatId;
    return this._request('unpinChatMessage', { form });
  }

  /**
   * Use this method to send answers to callback queries sent from
   * inline keyboards. The answer will be displayed to the user as
   * a notification at the top of the chat screen or as an alert.
   * On success, True is returned.
   *
   * This method has an [older, compatible signature][answerCallbackQuery-v0.27.1]
   * that is being deprecated.
   *
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#answercallbackquery
   */
  answerCallbackQuery(form = {}) {
    /* The older method signature was answerCallbackQuery(callbackQueryId, text, showAlert).
     * We need to ensure backwards-compatibility while maintaining
     * consistency of the method signatures throughout the library */
    if (typeof form !== 'object') {
      /* eslint-disable no-param-reassign, prefer-rest-params */
      deprecate('The method signature answerCallbackQuery(callbackQueryId, text, showAlert) has been deprecated since v0.27.1');
      form = {
        callback_query_id: arguments[0],
        text: arguments[1],
        show_alert: arguments[2],
      };
      /* eslint-enable no-param-reassign, prefer-rest-params */
    }
    return this._request('answerCallbackQuery', { form });
  }

  /**
   * Use this method to edit text messages sent by the bot or via
   * the bot (for inline bots). On success, the edited Message is
   * returned.
   *
   * Note that you must provide one of chat_id, message_id, or
   * inline_message_id in your request.
   *
   * @param  {String} text  New text of the message
   * @param  {Object} [options] Additional Telegram query options (provide either one of chat_id, message_id, or inline_message_id here)
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#editmessagetext
   */
  editMessageText(text, form = {}) {
    form.text = text;
    return this._request('editMessageText', { form });
  }

  /**
   * Use this method to edit captions of messages sent by the
   * bot or via the bot (for inline bots). On success, the
   * edited Message is returned.
   *
   * Note that you must provide one of chat_id, message_id, or
   * inline_message_id in your request.
   *
   * @param  {String} caption  New caption of the message
   * @param  {Object} [options] Additional Telegram query options (provide either one of chat_id, message_id, or inline_message_id here)
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#editmessagecaption
   */
  editMessageCaption(caption, form = {}) {
    form.caption = caption;
    return this._request('editMessageCaption', { form });
  }

  /**
   * Use this method to edit only the reply markup of messages
   * sent by the bot or via the bot (for inline bots).
   * On success, the edited Message is returned.
   *
   * Note that you must provide one of chat_id, message_id, or
   * inline_message_id in your request.
   *
   * @param  {Object} replyMarkup  A JSON-serialized object for an inline keyboard.
   * @param  {Object} [options] Additional Telegram query options (provide either one of chat_id, message_id, or inline_message_id here)
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#editmessagetext
   */
  editMessageReplyMarkup(replyMarkup, form = {}) {
    form.reply_markup = replyMarkup;
    return this._request('editMessageReplyMarkup', { form });
  }

  /**
   * Use this method to get a list of profile pictures for a user.
   * Returns a [UserProfilePhotos](https://core.telegram.org/bots/api#userprofilephotos) object.
   * This method has an [older, compatible signature][getUserProfilePhotos-v0.25.0]
   * that is being deprecated.
   *
   * @param  {Number|String} userId  Unique identifier of the target user
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#getuserprofilephotos
   */
  getUserProfilePhotos(userId, form = {}) {
    /* The older method signature was getUserProfilePhotos(userId, offset, limit).
     * We need to ensure backwards-compatibility while maintaining
     * consistency of the method signatures throughout the library */
    if (typeof form !== 'object') {
      /* eslint-disable no-param-reassign, prefer-rest-params */
      deprecate('The method signature getUserProfilePhotos(userId, offset, limit) has been deprecated since v0.25.0');
      form = {
        offset: arguments[1],
        limit: arguments[2],
      };
      /* eslint-enable no-param-reassign, prefer-rest-params */
    }
    form.user_id = userId;
    return this._request('getUserProfilePhotos', { form });
  }

  /**
   * Send location.
   * Use this method to send point on the map.
   *
   * @param  {Number|String} chatId  Unique identifier for the message recipient
   * @param  {Float} latitude Latitude of location
   * @param  {Float} longitude Longitude of location
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#sendlocation
   */
  sendLocation(chatId, latitude, longitude, form = {}) {
    form.chat_id = chatId;
    form.latitude = latitude;
    form.longitude = longitude;
    return this._request('sendLocation', { form });
  }

  /**
   * Send venue.
   * Use this method to send information about a venue.
   *
   * @param  {Number|String} chatId  Unique identifier for the message recipient
   * @param  {Float} latitude Latitude of location
   * @param  {Float} longitude Longitude of location
   * @param  {String} title Name of the venue
   * @param  {String} address Address of the venue
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#sendvenue
   */
  sendVenue(chatId, latitude, longitude, title, address, form = {}) {
    form.chat_id = chatId;
    form.latitude = latitude;
    form.longitude = longitude;
    form.title = title;
    form.address = address;
    return this._request('sendVenue', { form });
  }

  /**
   * Send contact.
   * Use this method to send phone contacts.
   *
   * @param  {Number|String} chatId  Unique identifier for the message recipient
   * @param  {String} phoneNumber Contact's phone number
   * @param  {String} firstName Contact's first name
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#sendcontact
   */
  sendContact(chatId, phoneNumber, firstName, form = {}) {
    form.chat_id = chatId;
    form.phone_number = phoneNumber;
    form.first_name = firstName;
    return this._request('sendContact', { form });
  }


  /**
   * Get file.
   * Use this method to get basic info about a file and prepare it for downloading.
   * Attention: link will be valid for 1 hour.
   *
   * @param  {String} fileId  File identifier to get info about
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#getfile
   */
  getFile(fileId) {
    const form = { file_id: fileId };
    return this._request('getFile', { form });
  }

  /**
   * Get link for file.
   * Use this method to get link for file for subsequent use.
   * Attention: link will be valid for 1 hour.
   *
   * This method is a sugar extension of the (getFile)[#getfilefileid] method,
   * which returns just path to file on remote server (you will have to manually build full uri after that).
   *
   * @param  {String} fileId  File identifier to get info about
   * @return {Promise} promise Promise which will have *fileURI* in resolve callback
   * @see https://core.telegram.org/bots/api#getfile
   */
  getFileLink(fileId) {
    return this.getFile(fileId)
      .then(resp => `${this.options.baseApiUrl}/file/bot${this.token}/${resp.file_path}`);
  }

  /**
   * Downloads file in the specified folder.
   * This is just a sugar for (getFile)[#getfilefiled] method
   *
   * @param  {String} fileId  File identifier to get info about
   * @param  {String} downloadDir Absolute path to the folder in which file will be saved
   * @return {Promise} promise Promise, which will have *filePath* of downloaded file in resolve callback
   */
  downloadFile(fileId, downloadDir) {
    return this
      .getFileLink(fileId)
      .then(fileURI => {
        const fileName = fileURI.slice(fileURI.lastIndexOf('/') + 1);
        // TODO: Ensure fileName doesn't contains slashes
        const filePath = path.join(downloadDir, fileName);

        // properly handles errors and closes all streams
        return Promise
          .fromCallback(next => {
            pump(streamedRequest({ uri: fileURI }), fs.createWriteStream(filePath), next);
          })
          .return(filePath);
      });
  }

  /**
   * Register a RegExp to test against an incomming text message.
   * @param  {RegExp}   regexp       RegExp to be executed with `exec`.
   * @param  {Function} callback     Callback will be called with 2 parameters,
   * the `msg` and the result of executing `regexp.exec` on message text.
   */
  onText(regexp, callback) {
    this._textRegexpCallbacks.push({ regexp, callback });
  }

  /**
   * Remove a listener registered with `onText()`.
   * @param  {RegExp} regexp RegExp used previously in `onText()`
   * @return {Object} deletedListener The removed reply listener if
   *   found. This object has `regexp` and `callback`
   *   properties. If not found, returns `null`.
   */
  removeTextListener(regexp) {
    const index = this._textRegexpCallbacks.findIndex((textListener) => {
      return textListener.regexp === regexp;
    });
    if (index === -1) {
      return null;
    }
    return this._textRegexpCallbacks.splice(index, 1)[0];
  }

  /**
   * Register a reply to wait for a message response.
   * @param  {Number|String}   chatId       The chat id where the message cames from.
   * @param  {Number|String}   messageId    The message id to be replied.
   * @param  {Function} callback     Callback will be called with the reply
   *  message.
   * @return {Number} id                    The ID of the inserted reply listener.
   */
  onReplyToMessage(chatId, messageId, callback) {
    const id = ++this._replyListenerId;
    this._replyListeners.push({
      id,
      chatId,
      messageId,
      callback
    });
    return id;
  }

  /**
   * Removes a reply that has been prev. registered for a message response.
   * @param   {Number} replyListenerId      The ID of the reply listener.
   * @return  {Object} deletedListener      The removed reply listener if
   *   found. This object has `id`, `chatId`, `messageId` and `callback`
   *   properties. If not found, returns `null`.
   */
  removeReplyListener(replyListenerId) {
    const index = this._replyListeners.findIndex((replyListener) => {
      return replyListener.id === replyListenerId;
    });
    if (index === -1) {
      return null;
    }
    return this._replyListeners.splice(index, 1)[0];
  }

  /**
   * Use this method to get up to date information about the chat
   * (current name of the user for one-on-one conversations, current
   * username of a user, group or channel, etc.).
   * @param  {Number|String} chatId Unique identifier for the target chat or username of the target supergroup or channel
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#getchat
   */
  getChat(chatId) {
    const form = {
      chat_id: chatId
    };
    return this._request('getChat', { form });
  }

  /**
   * Returns the administrators in a chat in form of an Array of `ChatMember` objects.
   * @param  {Number|String} chatId  Unique identifier for the target group or username of the target supergroup
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#getchatadministrators
   */
  getChatAdministrators(chatId) {
    const form = {
      chat_id: chatId
    };
    return this._request('getChatAdministrators', { form });
  }

  /**
   * Use this method to get the number of members in a chat.
   * @param  {Number|String} chatId  Unique identifier for the target group or username of the target supergroup
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#getchatmemberscount
   */
  getChatMembersCount(chatId) {
    const form = {
      chat_id: chatId
    };
    return this._request('getChatMembersCount', { form });
  }

  /**
   * Use this method to get information about a member of a chat.
   * @param  {Number|String} chatId  Unique identifier for the target group or username of the target supergroup
   * @param  {String} userId  Unique identifier of the target user
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#getchatmember
   */
  getChatMember(chatId, userId) {
    const form = {
      chat_id: chatId,
      user_id: userId
    };
    return this._request('getChatMember', { form });
  }

  /**
   * Leave a group, supergroup or channel.
   * @param  {Number|String} chatId Unique identifier for the target group or username of the target supergroup (in the format @supergroupusername)
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#leavechat
   */
  leaveChat(chatId) {
    const form = {
      chat_id: chatId
    };
    return this._request('leaveChat', { form });
  }

  /**
   * Use this method to send a game.
   * @param  {Number|String} chatId Unique identifier for the message recipient
   * @param  {String} gameShortName name of the game to be sent.
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#sendgame
   */
  sendGame(chatId, gameShortName, form = {}) {
    form.chat_id = chatId;
    form.game_short_name = gameShortName;
    return this._request('sendGame', { form });
  }

  /**
   * Use this method to set the score of the specified user in a game.
   * @param  {String} userId  Unique identifier of the target user
   * @param  {Number} score New score value.
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#setgamescore
   */
  setGameScore(userId, score, form = {}) {
    form.user_id = userId;
    form.score = score;
    return this._request('setGameScore', { form });
  }

  /**
   * Use this method to get data for high score table.
   * @param  {String} userId  Unique identifier of the target user
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#getgamehighscores
   */
  getGameHighScores(userId, form = {}) {
    form.user_id = userId;
    return this._request('getGameHighScores', { form });
  }

  /**
   * Use this method to delete a message.
   * @param  {String} chatId  Unique identifier of the target chat
   * @param  {String} messageId  Unique identifier of the target message
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#deletemessage
   */
  deleteMessage(chatId, messageId, form = {}) {
    form.chat_id = chatId;
    form.message_id = messageId;
    return this._request('deleteMessage', { form });
  }

  /**
   * Send invoice.
   * Use this method to send an invoice.
   *
   * @param  {Number|String} chatId  Unique identifier for the message recipient
   * @param  {String} title Product name
   * @param  {String} description product description
   * @param  {String} payload Bot defined invoice payload
   * @param  {String} providerToken Payments provider token
   * @param  {String} startParameter Deep-linking parameter
   * @param  {String} currency Three-letter ISO 4217 currency code
   * @param  {Array} prices Breakdown of prices
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#sendinvoice
   */
  sendInvoice(chatId, title, description, payload, providerToken, startParameter, currency, prices, form = {}) {
    form.chat_id = chatId;
    form.title = title;
    form.description = description;
    form.payload = payload;
    form.provider_token = providerToken;
    form.start_parameter = startParameter;
    form.currency = currency;
    form.prices = JSON.stringify(prices);
    return this._request('sendInvoice', { form });
  }

  /**
   * Answer shipping query..
   * Use this method to reply to shipping queries.
   *
   * @param  {String} shippingQueryId  Unique identifier for the query to be answered
   * @param  {Boolean} ok Specify if delivery of the product is possible
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#answershippingquery
   */
  answerShippingQuery(shippingQueryId, ok, form = {}) {
    form.shipping_query_id = shippingQueryId;
    form.ok = ok;
    return this._request('answerShippingQuery', { form });
  }

  /**
   * Answer pre-checkout query.
   * Use this method to confirm shipping of a product.
   *
   * @param  {String} preCheckoutQueryId  Unique identifier for the query to be answered
   * @param  {Boolean} ok Specify if every order details are ok
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#answerprecheckoutquery
   */
  answerPreCheckoutQuery(preCheckoutQueryId, ok, form = {}) {
    form.pre_checkout_query_id = preCheckoutQueryId;
    form.ok = ok;
    return this._request('answerPreCheckoutQuery', { form });
  }

  /**
   * Use this method to get a sticker set. On success, a [StickerSet](https://core.telegram.org/bots/api#stickerset) object is returned.
   *
   * @param  {String} name Name of the sticker set
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#getstickerset
   */
  getStickerSet(name, form = {}) {
    form.name = name;
    return this._request('getStickerSet', { form });
  }

  /**
   * Use this method to upload a .png file with a sticker for later use in *createNewStickerSet* and *addStickerToSet* methods (can be used multiple
   * times). Returns the uploaded [File](https://core.telegram.org/bots/api#file) on success.
   *
   * @param  {Number} userId User identifier of sticker file owner
   * @param  {String|stream.Stream|Buffer} pngSticker A file path or a Stream. Can also be a `file_id` previously uploaded. **Png** image with the
   *  sticker, must be up to 512 kilobytes in size, dimensions must not exceed 512px, and either width or height must be exactly 512px.
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#uploadstickerfile
   */
  uploadStickerFile(userId, pngSticker, options = {}) {
    const opts = {
      qs: options,
    };
    opts.qs.user_id = userId;
    try {
      const sendData = this._formatSendData('png_sticker', pngSticker);
      opts.formData = sendData[0];
      opts.qs.png_sticker = sendData[1];
    } catch (ex) {
      return Promise.reject(ex);
    }
    return this._request('uploadStickerFile', opts);
  }

  /**
   * Use this method to create new sticker set owned by a user.
   * The bot will be able to edit the created sticker set.
   * Returns True on success.
   *
   * @param  {Number} userId User identifier of created sticker set owner
   * @param  {String} name Short name of sticker set, to be used in `t.me/addstickers/` URLs (e.g., *animals*)
   * @param  {String} title Sticker set title, 1-64 characters
   * @param  {String|stream.Stream|Buffer} pngSticker Png image with the sticker, must be up to 512 kilobytes in size,
   *  dimensions must not exceed 512px, and either width or height must be exactly 512px.
   * @param  {String} emojis One or more emoji corresponding to the sticker
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#createnewstickerset
   * @todo Add tests for this method!
   */
  createNewStickerSet(userId, name, title, pngSticker, emojis, options = {}) {
    const opts = {
      qs: options,
    };
    opts.qs.user_id = userId;
    opts.qs.name = name;
    opts.qs.title = title;
    opts.qs.emojis = emojis;
    try {
      const sendData = this._formatSendData('png_sticker', pngSticker);
      opts.formData = sendData[0];
      opts.qs.png_sticker = sendData[1];
    } catch (ex) {
      return Promise.reject(ex);
    }
    return this._request('createNewStickerSet', opts);
  }

  /**
   * Use this method to add a new sticker to a set created by the bot.
   * Returns True on success.
   *
   * @param  {Number} userId User identifier of sticker set owner
   * @param  {String} name Sticker set name
   * @param  {String|stream.Stream|Buffer} pngSticker Png image with the sticker, must be up to 512 kilobytes in size,
   *  dimensions must not exceed 512px, and either width or height must be exactly 512px
   * @param  {String} emojis One or more emoji corresponding to the sticker
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#addstickertoset
   * @todo Add tests for this method!
   */
  addStickerToSet(userId, name, pngSticker, emojis, options = {}) {
    const opts = {
      qs: options,
    };
    opts.qs.user_id = userId;
    opts.qs.name = name;
    opts.qs.emojis = emojis;
    try {
      const sendData = this._formatSendData('png_sticker', pngSticker);
      opts.formData = sendData[0];
      opts.qs.png_sticker = sendData[1];
    } catch (ex) {
      return Promise.reject(ex);
    }
    return this._request('addStickerToSet', opts);
  }

  /**
   * Use this method to move a sticker in a set created by the bot to a specific position.
   * Returns True on success.
   *
   * @param  {String} sticker File identifier of the sticker
   * @param  {Number} position New sticker position in the set, zero-based
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#setstickerpositioninset
   * @todo Add tests for this method!
   */
  setStickerPositionInSet(sticker, position) {
    const form = {
      sticker,
      position,
    };
    return this._request('setStickerPositionInSet', { form });
  }

  /**
   * Use this method to delete a sticker from a set created by the bot.
   * Returns True on success.
   *
   * @param  {String} sticker File identifier of the sticker
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#deletestickerfromset
   * @todo Add tests for this method!
   */
  deleteStickerFromSet(sticker) {
    const form = {
      sticker,
    };
    return this._request('deleteStickerFromSet', { form });
  }
}

module.exports = TelegramBot;
