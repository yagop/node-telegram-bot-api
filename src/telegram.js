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
  'text',
  'animation',
  'audio',
  'channel_chat_created',
  'contact',
  'delete_chat_photo',
  'dice',
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
  'passport_data',
  'photo',
  'pinned_message',
  'poll',
  'sticker',
  'successful_payment',
  'supergroup_chat_created',
  'video',
  'video_note',
  'voice',
  'video_chat_started',
  'video_chat_ended',
  'video_chat_participants_invited',
  'video_chat_scheduled',
  'message_auto_delete_timer_changed',
  'chat_invite_link',
  'chat_member_updated',
  'web_app_data',
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


/**
 * JSON-serialize data. If the provided data is already a String,
 * return it as is.
 * @private
 * @param  {*} data
 * @return {String}
 */
function stringify(data) {
  if (typeof data === 'string') {
    return data;
  }
  return JSON.stringify(data);
}


class TelegramBot extends EventEmitter {
  /**
   * The different errors the library uses.
   * @type {Object}
   */
  static get errors() {
    return errors;
  }

  /**
   * The types of message updates the library handles.
   * @type {String[]}
   */
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

  /**
   * Add listener for the specified [event](https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#events).
   * This is the usual `emitter.on()` method.
   * @param  {String} event
   * @param  {Function} listener
   * @see {@link https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#events|Available events}
   * @see https://nodejs.org/api/events.html#events_emitter_on_eventname_listener
   */
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
   * @param {String} [options.webHook.host="0.0.0.0"] Host to bind to
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
   * @param {String} [options.webHook.healthEndpoint="/healthz"] An endpoint for health checks that always responds with 200 OK
   * @param {Boolean} [options.onlyFirstMatch=false] Set to true to stop after first match. Otherwise, all regexps are executed
   * @param {Object} [options.request] Options which will be added for all requests to telegram api.
   *  See https://github.com/request/request#requestoptions-callback for more information.
   * @param {String} [options.baseApiUrl="https://api.telegram.org"] API Base URl; useful for proxying and testing
   * @param {Boolean} [options.filepath=true] Allow passing file-paths as arguments when sending files,
   *  such as photos using `TelegramBot#sendPhoto()`. See [usage information][usage-sending-files-performance]
   *  for more information on this option and its consequences.
   * @param {Boolean} [options.badRejection=false] Set to `true`
   *  **if and only if** the Node.js version you're using terminates the
   *  process on unhandled rejections. This option is only for
   *  *forward-compatibility purposes*.
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
    this.options.badRejection = (typeof options.badRejection === 'undefined') ? false : options.badRejection;
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
      obj.reply_markup = stringify(replyMarkup);
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
          throw new errors.ParseError(`Error parsing response: ${resp.body}`, resp);
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
   * @param  {Object} fileOptions File options
   * @param  {String} [fileOptions.filename] File name
   * @param  {String} [fileOptions.contentType] Content type (i.e. MIME)
   * @return {Array} formatted
   * @return {Object} formatted[0] formData
   * @return {String} formatted[1] fileId
   * @throws Error if Buffer file type is not supported.
   * @see https://npmjs.com/package/file-type
   * @private
   */
  _formatSendData(type, data, fileOptions = {}) {
    const deprecationMessage =
      'See https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#sending-files' +
      ' for more information on how sending files has been improved and' +
      ' on how to disable this deprecation message altogether.';
    let filedata = data;
    let filename = fileOptions.filename;
    let contentType = fileOptions.contentType;

    if (data instanceof stream.Stream) {
      if (!filename && data.path) {
        // Will be 'null' if could not be parsed.
        // For example, 'data.path' === '/?id=123' from 'request("https://example.com/?id=123")'
        const url = URL.parse(path.basename(data.path.toString()));
        if (url.pathname) {
          filename = qs.unescape(url.pathname);
        }
      }
    } else if (Buffer.isBuffer(data)) {
      if (!filename && !process.env.NTBA_FIX_350) {
        deprecate(`Buffers will have their filenames default to "filename" instead of "data". ${deprecationMessage}`);
        filename = 'data';
      }
      if (!contentType) {
        const filetype = fileType(data);
        if (filetype) {
          contentType = filetype.mime;
          const ext = filetype.ext;
          if (ext && !process.env.NTBA_FIX_350) {
            filename = `${filename}.${ext}`;
          }
        } else if (!process.env.NTBA_FIX_350) {
          deprecate(`An error will no longer be thrown if file-type of buffer could not be detected. ${deprecationMessage}`);
          throw new errors.FatalError('Unsupported Buffer file-type');
        }
      }
    } else if (data) {
      if (this.options.filepath && fs.existsSync(data)) {
        filedata = fs.createReadStream(data);
        if (!filename) {
          filename = path.basename(data);
        }
      } else {
        return [null, data];
      }
    } else {
      return [null, data];
    }

    filename = filename || 'filename';
    contentType = contentType || mime.lookup(filename);
    if (process.env.NTBA_FIX_350) {
      contentType = contentType || 'application/octet-stream';
    } else {
      deprecate(`In the future, content-type of files you send will default to "application/octet-stream". ${deprecationMessage}`);
    }

    // TODO: Add missing file extension.

    return [{
      [type]: {
        value: filedata,
        options: {
          filename,
          contentType,
        },
      },
    }, null];
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
    deprecate('TelegramBot#initPolling() is deprecated. Use TelegramBot#startPolling() instead.');
    return this.startPolling();
  }

  /**
   * Stops polling after the last polling request resolves.
   * Multiple invocations do nothing if polling is already stopped.
   * Returning the promise of the last polling request is **deprecated**.
   * @param  {Object} [options] Options
   * @param  {Boolean} [options.cancel] Cancel current request
   * @param  {String} [options.reason] Reason for stopping polling
   * @return {Promise}
   */
  stopPolling(options) {
    if (!this._polling) {
      return Promise.resolve();
    }
    return this._polling.stop(options);
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
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#getme
   */
  getMe(form = {}) {
    return this._request('getMe', { form });
  }

  /**
   * This method log out your bot from the cloud Bot API server before launching the bot locally.
   * You must log out the bot before running it locally, otherwise there is no guarantee that the bot will receive updates.
   * After a successful call, you will not be able to log in again using the same token for 10 minutes.
   * Returns True on success.
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#logout
   */
  logOut(form = {}) {
    return this._request('logOut', { form });
  }

  /**
   * This method close the bot instance before moving it from one local server to another.
   * This method will return error 429 in the first 10 minutes after the bot is launched.
   * Returns True on success.
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#close
   */
  close(form = {}) {
    return this._request('close', { form });
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
   * @param  {Object} [fileOptions] Optional file related meta-data
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#setwebhook
   * @see https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#sending-files
   */
  setWebHook(url, options = {}, fileOptions = {}) {
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
        const sendData = this._formatSendData('certificate', cert, fileOptions);
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
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#deletewebhook
   */
  deleteWebHook(form = {}) {
    return this._request('deleteWebhook', { form });
  }

  /**
   * Use this method to get current webhook status.
   * On success, returns a [WebhookInfo](https://core.telegram.org/bots/api#webhookinfo) object.
   * If the bot is using getUpdates, will return an object with the
   * url field empty.
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#getwebhookinfo
   */
  getWebHookInfo(form = {}) {
    return this._request('getWebhookInfo', { form });
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
    const poll = update.poll;
    const pollAnswer = update.poll_answer;
    const chatMember = update.chat_member;
    const myChatMember = update.my_chat_member;
    const chatJoinRequest = update.chat_join_request;

    if (message) {
      debug('Process Update message %j', message);
      const metadata = {};
      metadata.type = TelegramBot.messageTypes.find((messageType) => {
        return message[messageType];
      });
      this.emit('message', message, metadata);
      if (metadata.type) {
        debug('Emitting %s: %j', metadata.type, message);
        this.emit(metadata.type, message, metadata);
      }
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
    } else if (poll) {
      debug('Process Update poll %j', poll);
      this.emit('poll', poll);
    } else if (pollAnswer) {
      debug('Process Update poll_answer %j', pollAnswer);
      this.emit('poll_answer', pollAnswer);
    } else if (chatMember) {
      debug('Process Update chat_member %j', chatMember);
      this.emit('chat_member', chatMember);
    } else if (myChatMember) {
      debug('Process Update my_chat_member %j', myChatMember);
      this.emit('my_chat_member', myChatMember);
    } else if (chatJoinRequest) {
      debug('Process Update my_chat_member %j', chatJoinRequest);
      this.emit('chat_join_request', chatJoinRequest);
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
    form.results = stringify(results);
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
   * @see https://core.telegram.org/bots/api#forwardmessage
   */
  forwardMessage(chatId, fromChatId, messageId, form = {}) {
    form.chat_id = chatId;
    form.from_chat_id = fromChatId;
    form.message_id = messageId;
    return this._request('forwardMessage', { form });
  }

  /**
   * Copy messages of any kind.
   * The method is analogous to the method forwardMessages, but the copied message doesn't
   * have a link to the original message.
   * Returns the MessageId of the sent message on success.
   * @param  {Number|String} chatId     Unique identifier for the message recipient
   * @param  {Number|String} fromChatId Unique identifier for the chat where the
   * original message was sent
   * @param  {Number|String} messageId  Unique message identifier
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#copymessage
   */
  copyMessage(chatId, fromChatId, messageId, form = {}) {
    form.chat_id = chatId;
    form.from_chat_id = fromChatId;
    form.message_id = messageId;
    return this._request('copyMessage', { form });
  }

  /**
   * Send photo
   * @param  {Number|String} chatId  Unique identifier for the message recipient
   * @param  {String|stream.Stream|Buffer} photo A file path or a Stream. Can
   * also be a `file_id` previously uploaded
   * @param  {Object} [options] Additional Telegram query options
   * @param  {Object} [fileOptions] Optional file related meta-data
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#sendphoto
   * @see https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#sending-files
   */
  sendPhoto(chatId, photo, options = {}, fileOptions = {}) {
    const opts = {
      qs: options,
    };
    opts.qs.chat_id = chatId;
    try {
      const sendData = this._formatSendData('photo', photo, fileOptions);
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
   * @param  {Object} [fileOptions] Optional file related meta-data
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#sendaudio
   * @see https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#sending-files
   */
  sendAudio(chatId, audio, options = {}, fileOptions = {}) {
    const opts = {
      qs: options
    };
    opts.qs.chat_id = chatId;
    try {
      const sendData = this._formatSendData('audio', audio, fileOptions);
      opts.formData = sendData[0];
      opts.qs.audio = sendData[1];
    } catch (ex) {
      return Promise.reject(ex);
    }
    return this._request('sendAudio', opts);
  }

  /**
   * Send Dice
   * Use this method to send a dice.
   * @param  {Number|String} chatId  Unique identifier for the message recipient
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#senddice
   */
  sendDice(chatId, options = {}) {
    const opts = {
      qs: options,
    };
    opts.qs.chat_id = chatId;
    try {
      const sendData = this._formatSendData('dice');
      opts.formData = sendData[0];
    } catch (ex) {
      return Promise.reject(ex);
    }
    return this._request('sendDice', opts);
  }

  /**
   * Send Document
   * @param  {Number|String} chatId  Unique identifier for the message recipient
   * @param  {String|stream.Stream|Buffer} doc A file path, Stream or Buffer.
   * Can also be a `file_id` previously uploaded.
   * @param  {Object} [options] Additional Telegram query options
   * @param  {Object} [fileOptions] Optional file related meta-data
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#sendDocument
   * @see https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#sending-files
   */
  sendDocument(chatId, doc, options = {}, fileOptions = {}) {
    const opts = {
      qs: options
    };
    opts.qs.chat_id = chatId;
    try {
      const sendData = this._formatSendData('document', doc, fileOptions);
      opts.formData = sendData[0];
      opts.qs.document = sendData[1];
    } catch (ex) {
      return Promise.reject(ex);
    }
    return this._request('sendDocument', opts);
  }

  /**
   * Send .webp stickers.
   * @param  {Number|String} chatId  Unique identifier for the message recipient
   * @param  {String|stream.Stream|Buffer} sticker A file path, Stream or Buffer.
   * Can also be a `file_id` previously uploaded. Stickers are WebP format files.
   * @param  {Object} [options] Additional Telegram query options
   * @param  {Object} [fileOptions] Optional file related meta-data
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#sendsticker
   */
  sendSticker(chatId, sticker, options = {}, fileOptions = {}) {
    const opts = {
      qs: options
    };
    opts.qs.chat_id = chatId;
    try {
      const sendData = this._formatSendData('sticker', sticker, fileOptions);
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
   * @param  {Object} [fileOptions] Optional file related meta-data
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#sendvideo
   * @see https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#sending-files
   */
  sendVideo(chatId, video, options = {}, fileOptions = {}) {
    const opts = {
      qs: options
    };
    opts.qs.chat_id = chatId;
    try {
      const sendData = this._formatSendData('video', video, fileOptions);
      opts.formData = sendData[0];
      opts.qs.video = sendData[1];
    } catch (ex) {
      return Promise.reject(ex);
    }
    return this._request('sendVideo', opts);
  }

  /**
   * Use this method to send animation files (GIF or H.264/MPEG-4 AVC video without sound).
   * @param  {Number|String} chatId  Unique identifier for the message recipient
   * @param  {String|stream.Stream|Buffer} animation A file path, Stream or Buffer.
   * Can also be a `file_id` previously uploaded.
   * @param  {Object} [options] Additional Telegram query options
   * @param  {Object} [fileOptions] Optional file related meta-data
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#sendanimation
   * @see https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#sending-files
   */
  sendAnimation(chatId, animation, options = {}, fileOptions = {}) {
    const opts = {
      qs: options
    };
    opts.qs.chat_id = chatId;
    try {
      const sendData = this._formatSendData('animation', animation, fileOptions);
      opts.formData = sendData[0];
      opts.qs.animation = sendData[1];
    } catch (ex) {
      return Promise.reject(ex);
    }
    return this._request('sendAnimation', opts);
  }

  /**
   * Use this method to send rounded square videos of upto 1 minute long.
   * @param  {Number|String} chatId  Unique identifier for the message recipient
   * @param  {String|stream.Stream|Buffer} videoNote A file path or Stream.
   * Can also be a `file_id` previously uploaded.
   * @param  {Object} [options] Additional Telegram query options
   * @param  {Object} [fileOptions] Optional file related meta-data
   * @return {Promise}
   * @info The length parameter is actually optional. However, the API (at time of writing) requires you to always provide it until it is fixed.
   * @see https://core.telegram.org/bots/api#sendvideonote
   * @see https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#sending-files
   */
  sendVideoNote(chatId, videoNote, options = {}, fileOptions = {}) {
    const opts = {
      qs: options
    };
    opts.qs.chat_id = chatId;
    try {
      const sendData = this._formatSendData('video_note', videoNote, fileOptions);
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
   * @param  {Object} [fileOptions] Optional file related meta-data
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#sendvoice
   * @see https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#sending-files
   */
  sendVoice(chatId, voice, options = {}, fileOptions = {}) {
    const opts = {
      qs: options
    };
    opts.qs.chat_id = chatId;
    try {
      const sendData = this._formatSendData('voice', voice, fileOptions);
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
   * `record_voice` or `upload_voice` for audio files, `upload_document` for general files,
   * `choose_sticker` for stickers, `find_location` for location data,
   * `record_video_note` or `upload_video_note` for video notes.
   *
   * @param  {Number|String} chatId  Unique identifier for the message recipient
   * @param  {String} action Type of action to broadcast.
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#sendchataction
   */
  sendChatAction(chatId, action, form = {}) {
    form.chat_id = chatId;
    form.action = action;
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
   * @param  {Number} userId  Unique identifier of the target user
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#kickchatmember
   * @deprecated Deprecated since Telegram Bot API v5.3, replace with "banChatMember"
   */
  kickChatMember(chatId, userId, form = {}) {
    deprecate('The method kickChatMembet is deprecated since Telegram Bot API v5.3, replace it with "banChatMember"');
    form.chat_id = chatId;
    form.user_id = userId;
    return this._request('kickChatMember', { form });
  }

  /**
  * Use this method to ban a user in a group, a supergroup or a channel.
  * In the case of supergroups and channels, the user will not be able to
  * return to the chat on their own using invite links, etc., unless unbanned first..
  * The bot must be an administrator in the group for this to work.
  * Returns True on success.
  *
  * @param  {Number|String} chatId  Unique identifier for the target group or username of the target supergroup
  * @param  {Number} userId  Unique identifier of the target user
  * @param  {Object} [options] Additional Telegram query options
  * @return {Promise}
  * @see https://core.telegram.org/bots/api#banchatmember
  */
  banChatMember(chatId, userId, form = {}) {
    form.chat_id = chatId;
    form.user_id = userId;
    return this._request('banChatMember', { form });
  }

  /**
   * Use this method to unban a previously kicked user in a supergroup.
   * The user will not return to the group automatically, but will be
   * able to join via link, etc. The bot must be an administrator in
   * the group for this to work. Returns True on success.
   *
   * @param  {Number|String} chatId  Unique identifier for the target group or username of the target supergroup
   * @param  {Number} userId  Unique identifier of the target user
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#unbanchatmember
   */
  unbanChatMember(chatId, userId, form = {}) {
    form.chat_id = chatId;
    form.user_id = userId;
    return this._request('unbanChatMember', { form });
  }

  /**
   * Use this method to restrict a user in a supergroup.
   * The bot must be an administrator in the supergroup for this to work
   * and must have the appropriate admin rights. Pass True for all boolean parameters
   * to lift restrictions from a user. Returns True on success.
   *
   * @param  {Number|String} chatId Unique identifier for the target chat or username of the target supergroup
   * @param  {Number} userId Unique identifier of the target user
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
   * @param  {Number} userId
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
   * Use this method to set a custom title for an administrator in a supergroup promoted by the bot.
   * Returns True on success.
   *
   * @param  {Number|String} chatId  Unique identifier for the message recipient
   * @param  {Number} userId Unique identifier of the target user
   * @param  {String} customTitle New custom title for the administrator; 0-16 characters, emoji are not allowed
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#setchatadministratorcustomtitle
   */
  setChatAdministratorCustomTitle(chatId, userId, customTitle, form = {}) {
    form.chat_id = chatId;
    form.user_id = userId;
    form.custom_title = customTitle;
    return this._request('setChatAdministratorCustomTitle', { form });
  }


  /**
   * Use this method to ban a channel chat in a supergroup or a channel.
   * The owner of the chat will not be able to send messages and join live streams
   * on behalf of the chat, unless it is unbanned first.
   * The bot must be an administrator in the supergroup or channel for this to work
   * and must have the appropriate administrator rights.
   * Returns True on success.
   *
   * @param  {Number|String} chatId  Unique identifier for the target group or username of the target supergroup
   * @param  {Number} senderChatId  Unique identifier of the target user
   * @param  {Object} [options] Additional Telegram query options
   * @return {Boolean}
   * @see https://core.telegram.org/bots/api#banchatsenderchat
   */
  banChatSenderChat(chatId, senderChatId, form = {}) {
    form.chat_id = chatId;
    form.sender_chat_id = senderChatId;
    return this._request('banChatSenderChat', { form });
  }

  /**
  * Use this method to unban a previously banned channel chat in a supergroup or channel.
  * The bot must be an administrator for this to work and must have the appropriate administrator rights.
  * Returns True on success.
  *
  * @param  {Number|String} chatId  Unique identifier for the target group or username of the target supergroup
  * @param  {Number} senderChatId  Unique identifier of the target user
  * @param  {Object} [options] Additional Telegram query options
  * @return {Boolean}
  * @see https://core.telegram.org/bots/api#unbanchatsenderchat
  */
  unbanChatSenderChat(chatId, senderChatId, form = {}) {
    form.chat_id = chatId;
    form.sender_chat_id = senderChatId;
    return this._request('unbanChatSenderChat', { form });
  }

  /**
   * Use this method to set default chat permissions for all members.
   * The bot must be an administrator in the group or a supergroup for this to
   * work and must have the can_restrict_members admin rights.
   * Returns True on success.
   *
   * @param  {Number|String} chatId  Unique identifier for the message recipient
   * @param  {Array} chatPermissions New default chat permissions
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#setchatpermissions
   */
  setChatPermissions(chatId, chatPermissions, form = {}) {
    form.chat_id = chatId;
    form.permissions = JSON.stringify(chatPermissions);
    return this._request('setChatPermissions', { form });
  }

  /**
   * Use this method to export an invite link to a supergroup or a channel.
   * The bot must be an administrator in the chat for this to work and must have the appropriate admin rights.
   * Returns exported invite link as String on success.
   *
   * @param  {Number|String} chatId Unique identifier for the target chat or username of the target supergroup
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#exportchatinvitelink
   */
  exportChatInviteLink(chatId, form = {}) {
    form.chat_id = chatId;
    return this._request('exportChatInviteLink', { form });
  }

  /**
   * Use this method to create an additional invite link for a chat.
   * The bot must be an administrator in the chat for this to work and must have the appropriate admin rights.
   * Returns the new invite link as ChatInviteLink object.
   *
   * @param  {Number|String} chatId Unique identifier for the target chat or username of the target supergroup
   * @param  {Object} [options] Additional Telegram query options
   * @return {Object} ChatInviteLink
   * @see https://core.telegram.org/bots/api#createchatinvitelink
   */
  createChatInviteLink(chatId, form = {}) {
    form.chat_id = chatId;
    return this._request('createChatInviteLink', { form });
  }

  /**
   * Use this method to edit a non-primary invite link created by the bot.
   * The bot must be an administrator in the chat for this to work and must have the appropriate admin rights.
   * Returns the edited invite link as a ChatInviteLink object.
   *
   * @param  {Number|String} chatId Unique identifier for the target chat or username of the target supergroup
   * @param  {String} inviteLink Text with the invite link to edit
   * @param  {Object} [options] Additional Telegram query options
   * @return {Object} ChatInviteLink
   * @see https://core.telegram.org/bots/api#editchatinvitelink
   */
  editChatInviteLink(chatId, inviteLink, form = {}) {
    form.chat_id = chatId;
    form.invite_link = inviteLink;
    return this._request('editChatInviteLink', { form });
  }

  /**
   * Use this method to revoke an invite link created by the bot.
   * Note: If the primary link is revoked, a new link is automatically generated
   * The bot must be an administrator in the chat for this to work and must have the appropriate admin rights.
   * Returns the revoked invite link as ChatInviteLink object.
   *
   * @param  {Number|String} chatId Unique identifier for the target chat or username of the target supergroup
   * @param  {Object} [options] Additional Telegram query options
   * @return {Object} ChatInviteLink
   * @see https://core.telegram.org/bots/api#revokechatinvitelink
   */
  revokeChatInviteLink(chatId, inviteLink, form = {}) {
    form.chat_id = chatId;
    form.invite_link = inviteLink;
    return this._request('revokeChatInviteLink', { form });
  }

  /**
   * Use this method to approve a chat join request.
   * The bot must be an administrator in the chat for this to work and must have the can_invite_users administrator right.
   * Returns True on success.
   *
   * @param  {Number|String} chatId Unique identifier for the target chat or username of the target supergroup
   * @param  {Number} userId  Unique identifier of the target user
   * @param  {Object} [options] Additional Telegram query options
   * @return {Boolean} True on success
   * @see https://core.telegram.org/bots/api#approvechatjoinrequest
   */
  approveChatJoinRequest(chatId, userId, form = {}) {
    form.chat_id = chatId;
    form.user_id = userId;
    return this._request('approveChatJoinRequest', { form });
  }

  /**
   * Use this method to decline a chat join request.
   * The bot must be an administrator in the chat for this to work and must have the can_invite_users administrator right.
   * Returns True on success.
   *
   * @param  {Number|String} chatId Unique identifier for the target chat or username of the target supergroup
   * @param  {Number} userId  Unique identifier of the target user
   * @param  {Object} [options] Additional Telegram query options
   * @return {Boolean} True on success
   * @see https://core.telegram.org/bots/api#declinechatjoinrequest
   */
  declineChatJoinRequest(chatId, userId, form = {}) {
    form.chat_id = chatId;
    form.user_id = userId;
    return this._request('declineChatJoinRequest', { form });
  }


  /**
   * Use this method to set a new profile photo for the chat. Photos can't be changed for private chats.
   * The bot must be an administrator in the chat for this to work and must have the appropriate admin rights.
   * Returns True on success.
   *
   * @param  {Number|String} chatId  Unique identifier for the message recipient
   * @param  {stream.Stream|Buffer} photo A file path or a Stream.
   * @param  {Object} [options] Additional Telegram query options
   * @param  {Object} [fileOptions] Optional file related meta-data
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#setchatphoto
   */
  setChatPhoto(chatId, photo, options = {}, fileOptions = {}) {
    const opts = {
      qs: options,
    };
    opts.qs.chat_id = chatId;
    try {
      const sendData = this._formatSendData('photo', photo, fileOptions);
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
   * @param  {Object} [options] Additional Telegram query options
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
   * @param  {Object} [options] Additional Telegram query options
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
   * @param  {Object} [options] Additional Telegram query options
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
   * @param  {Number} messageId Identifier of a message to pin
   * @param  {Object} [options] Additional Telegram query options
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
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#unpinchatmessage
   */
  unpinChatMessage(chatId, form = {}) {
    form.chat_id = chatId;
    return this._request('unpinChatMessage', { form });
  }

  /**
  * Use this method to clear the list of pinned messages in a chat
  * The bot must be an administrator in the chat for this to work and must have the appropriate admin rights.
  * Returns True on success.
  *
  * @param  {Number|String} chatId  Unique identifier for the message recipient
  * @param  {Object} [options] Additional Telegram query options
  * @return {Promise}
  * @see https://core.telegram.org/bots/api#unpinallchatmessages
  */
  unpinAllChatMessages(chatId, form = {}) {
    form.chat_id = chatId;
    return this._request('unpinAllChatMessages', { form });
  }

  /**
   * Use this method to send answers to callback queries sent from
   * inline keyboards. The answer will be displayed to the user as
   * a notification at the top of the chat screen or as an alert.
   * On success, True is returned.
   *
   * This method has **older, compatible signatures ([1][answerCallbackQuery-v0.27.1])([2][answerCallbackQuery-v0.29.0])**
   * that are being deprecated.
   *
   * @param  {String} callbackQueryId Unique identifier for the query to be answered
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#answercallbackquery
   */
  answerCallbackQuery(callbackQueryId, form = {}) {
    /* The older method signature (in/before v0.27.1) was answerCallbackQuery(callbackQueryId, text, showAlert).
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
    /* The older method signature (in/before v0.29.0) was answerCallbackQuery([options]).
     * We need to ensure backwards-compatibility while maintaining
     * consistency of the method signatures throughout the library. */
    if (typeof callbackQueryId === 'object') {
      /* eslint-disable no-param-reassign, prefer-rest-params */
      deprecate('The method signature answerCallbackQuery([options]) has been deprecated since v0.29.0');
      form = callbackQueryId;
      /* eslint-enable no-param-reassign, prefer-rest-params */
    } else {
      form.callback_query_id = callbackQueryId;
    }
    return this._request('answerCallbackQuery', { form });
  }

  /**
   * Use this method to set the result of an interaction with a Web App and send a corresponding message on behalf of the user to the chat from which the query originated.
   * On success, a SentWebAppMessage object is returned.
   *
   * @param  {String} webAppQueryId Unique identifier for the query to be answered
   * @param  {InlineQueryResult} result object that represents one result of an inline query
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#answercallbackquery
   */
  answerWebAppQuery(webAppQueryId, result, form = {}) {
    form.web_app_query_id = webAppQueryId;
    form.result = stringify(result);
    return this._request('answerCallbackQuery', { form });
  }


  /**
  * Use this method to change the list of the bot's commands.
  * Returns True on success.
  * @param  {Array} commands Poll options, between 2-10 options
  * @param  {Object} [options] Additional Telegram query options
  * @return {Promise}
  * @see https://core.telegram.org/bots/api#setmycommands
  */
  setMyCommands(commands, form = {}) {
    form.commands = stringify(commands);
    return this._request('setMyCommands', { form });
  }

  /**
  * Use this method to get the current list of the bot's commands for the given scope and user language.
  * Returns Array of BotCommand on success. If commands aren't set, an empty list is returned.
  * @param  {Object} [options] Additional Telegram query options
  * @return {Promise}
  * @see https://core.telegram.org/bots/api#getmycommands
  */
  getMyCommands(form = {}) {
    return this._request('getMyCommands', { form });
  }

  /**
  * Use this method to change the bot's menu button in a private chat, or the default menu button.
  * Returns True on success.
  * @param  {Object} [options] Additional Telegram query options
  * @return {Promise}
  * @see https://core.telegram.org/bots/api#setchatmenubutton
  */
  setChatMenuButton(form = {}) {
    return this._request('setChatMenuButton', { form });
  }

  /**
  * Use this method to get the current value of the bot's menu button in a private chat, or the default menu button.
  * Returns MenuButton on success.
  * @param  {Object} [options] Additional Telegram query options
  * @return {Promise}
  * @see https://core.telegram.org/bots/api#getchatmenubutton
  */
  getChatMenuButton(form = {}) {
    return this._request('getChatMenuButton', { form });
  }

  /**
  * Use this method to change the default administrator rights requested by the bot when it's added as an administrator to groups or channels.
  * These rights will be suggested to users, but they are are free to modify the list before adding the bot.
  * Returns True on success.
  * @param  {Object} [options] Additional Telegram query options
  * @return {Promise}
  * @see https://core.telegram.org/bots/api#getchatmenubutton
  */
  setMyDefaultAdministratorRights(form = {}) {
    return this._request('setMyDefaultAdministratorRights', { form });
  }

  /**
  * Use this method to get the current default administrator rights of the bot.
  * Returns ChatAdministratorRights on success.
  * @param  {Object} [options] Additional Telegram query options
  * @return {Promise}
  * @see https://core.telegram.org/bots/api#getmydefaultadministratorrights
  */
  getMyDefaultAdministratorRights(form = {}) {
    return this._request('getMyDefaultAdministratorRights', { form });
  }

  /**
  * Returns True on success.
  * Use this method to delete the list of the bot's commands for the given scope and user language.
  * @param  {Object} [options] Additional Telegram query options
  * @return {Promise}
  * @see https://core.telegram.org/bots/api#deletemycommands
  */
  deleteMyCommands(form = {}) {
    return this._request('deleteMyCommands', { form });
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
   * Use this method to edit audio, document, photo, or video messages.
   * If a message is a part of a message album, then it can be edited only to a photo or a video.
   * Otherwise, message type can be changed arbitrarily. When inline message is edited, new file can't be uploaded.
   * Use previously uploaded file via its file_id or specify a URL.
   * On success, the edited Message is returned.
   *
   * Note that you must provide one of chat_id, message_id, or inline_message_id in your request.
   *
   * @param  {Object} media  A JSON-serialized object for a new media content of the message
   * @param  {Object} [options] Additional Telegram query options (provide either one of chat_id, message_id, or inline_message_id here)
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#editmessagemedia
   */
  editMessageMedia(media, form = {}) {
    const regexAttach = /attach:\/\/.+/;

    if (typeof media.media === 'string' && regexAttach.test(media.media)) {
      const opts = {
        qs: form,
      };

      opts.formData = {};

      const payload = Object.assign({}, media);
      delete payload.media;

      try {
        const attachName = String(0);
        const [formData] = this._formatSendData(
          attachName,
          media.media.replace('attach://', ''),
          media.fileOptions
        );

        if (formData) {
          opts.formData[attachName] = formData[attachName];
          payload.media = `attach://${attachName}`;
        } else {
          throw new errors.FatalError(`Failed to process the replacement action for your ${media.type}`);
        }
      } catch (ex) {
        return Promise.reject(ex);
      }

      opts.qs.media = JSON.stringify(payload);

      return this._request('editMessageMedia', opts);
    }

    form.media = stringify(media);

    return this._request('editMessageMedia', { form });
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
   * @param  {Number} userId  Unique identifier of the target user
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
   * Use this method to edit live location messages sent by
   * the bot or via the bot (for inline bots).
   *
   * Note that you must provide one of chat_id, message_id, or
   * inline_message_id in your request.
   *
   * @param  {Float} latitude Latitude of location
   * @param  {Float} longitude Longitude of location
   * @param  {Object} [options] Additional Telegram query options (provide either one of chat_id, message_id, or inline_message_id here)
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#editmessagelivelocation
   */
  editMessageLiveLocation(latitude, longitude, form = {}) {
    form.latitude = latitude;
    form.longitude = longitude;
    return this._request('editMessageLiveLocation', { form });
  }

  /**
   * Use this method to stop updating a live location message sent by
   * the bot or via the bot (for inline bots) before live_period expires.
   *
   * Note that you must provide one of chat_id, message_id, or
   * inline_message_id in your request.
   *
   * @param  {Object} [options] Additional Telegram query options (provide either one of chat_id, message_id, or inline_message_id here)
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#stopmessagelivelocation
   */
  stopMessageLiveLocation(form = {}) {
    return this._request('stopMessageLiveLocation', { form });
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
   * Send poll.
   * Use this method to send a native poll.
   *
   * @param  {Number|String} chatId  Unique identifier for the group/channel
   * @param  {String} question Poll question, 255 char limit
   * @param  {Array} pollOptions Poll options, between 2-10 options
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#sendpoll
   */
  sendPoll(chatId, question, pollOptions, form = {}) {
    form.chat_id = chatId;
    form.question = question;
    form.options = stringify(pollOptions);
    return this._request('sendPoll', { form });
  }

  /**
   * Stop poll.
   * Use this method to stop a native poll.
   *
   * @param  {Number|String} chatId  Unique identifier for the group/channel
   * @param  {Number} pollId Identifier of the original message with the poll
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#stoppoll
   */
  stopPoll(chatId, pollId, form = {}) {
    form.chat_id = chatId;
    form.message_id = pollId;
    return this._request('stopPoll', { form });
  }

  /**
   * Get file.
   * Use this method to get basic info about a file and prepare it for downloading.
   * Attention: link will be valid for 1 hour.
   *
   * @param  {String} fileId  File identifier to get info about
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#getfile
   */
  getFile(fileId, form = {}) {
    form.file_id = fileId;
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
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise} promise Promise which will have *fileURI* in resolve callback
   * @see https://core.telegram.org/bots/api#getfile
   */
  getFileLink(fileId, form = {}) {
    return this.getFile(fileId, form)
      .then(resp => `${this.options.baseApiUrl}/file/bot${this.token}/${resp.file_path}`);
  }

  /**
   * Return a readable stream for file.
   *
   * `fileStream.path` is the specified file ID i.e. `fileId`.
   * `fileStream` emits event `info` passing a single argument i.e.
   * `info` with the interface `{ uri }` where `uri` is the URI of the
   * file on Telegram servers.
   *
   * This method is a sugar extension of the [getFileLink](#TelegramBot+getFileLink) method,
   * which returns the full URI to the file on remote server.
   *
   * @param  {String} fileId File identifier to get info about
   * @param  {Object} [options] Additional Telegram query options
   * @return {stream.Readable} fileStream
   */
  getFileStream(fileId, form = {}) {
    const fileStream = new stream.PassThrough();
    fileStream.path = fileId;
    this.getFileLink(fileId, form)
      .then((fileURI) => {
        fileStream.emit('info', {
          uri: fileURI,
        });
        pump(streamedRequest(Object.assign({ uri: fileURI }, this.options.request)), fileStream);
      })
      .catch((error) => {
        fileStream.emit('error', error);
      });
    return fileStream;
  }

  /**
   * Downloads file in the specified folder.
   *
   * This method is a sugar extension of the [getFileStream](#TelegramBot+getFileStream) method,
   * which returns a readable file stream.
   *
   * @param  {String} fileId  File identifier to get info about
   * @param  {String} downloadDir Absolute path to the folder in which file will be saved
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise} promise Promise, which will have *filePath* of downloaded file in resolve callback
   */
  downloadFile(fileId, downloadDir, form = {}) {
    let resolve;
    let reject;
    const promise = new Promise((a, b) => {
      resolve = a;
      reject = b;
    });
    const fileStream = this.getFileStream(fileId, form);
    fileStream.on('info', (info) => {
      const fileName = info.uri.slice(info.uri.lastIndexOf('/') + 1);
      // TODO: Ensure fileName doesn't contains slashes
      const filePath = path.join(downloadDir, fileName);
      pump(fileStream, fs.createWriteStream(filePath), (error) => {
        if (error) { return reject(error); }
        return resolve(filePath);
      });
    });
    fileStream.on('error', (err) => {
      reject(err);
    });
    return promise;
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
      return String(textListener.regexp) === String(regexp);
    });
    if (index === -1) {
      return null;
    }
    return this._textRegexpCallbacks.splice(index, 1)[0];
  }

  /**
   * Remove all listeners registered with `onText()`.
   */
  clearTextListeners() {
    this._textRegexpCallbacks = [];
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
   * Removes all replies that have been prev. registered for a message response.
   */
  clearReplyListeners() {
    this._replyListeners = [];
  }

  /**
   * Use this method to get up to date information about the chat
   * (current name of the user for one-on-one conversations, current
   * username of a user, group or channel, etc.).
   * @param  {Number|String} chatId Unique identifier for the target chat or username of the target supergroup or channel
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#getchat
   */
  getChat(chatId, form = {}) {
    form.chat_id = chatId;
    return this._request('getChat', { form });
  }

  /**
   * Returns the administrators in a chat in form of an Array of `ChatMember` objects.
   * @param  {Number|String} chatId  Unique identifier for the target group or username of the target supergroup
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#getchatadministrators
   */
  getChatAdministrators(chatId, form = {}) {
    form.chat_id = chatId;
    return this._request('getChatAdministrators', { form });
  }

  /**
   * Use this method to get the number of members in a chat.
   * Returns Int on success.
   * @param  {Number|String} chatId  Unique identifier for the target group or username of the target supergroup
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#getchatmemberscount
   * @deprecated Deprecated since Telegram Bot API v5.3, replace it with "getChatMembersCount"
   */
  getChatMembersCount(chatId, form = {}) {
    deprecate('The method "getChatMembersCount" is deprecated since Telegram Bot API v5.3, replace it with "getChatMemberCount"');

    form.chat_id = chatId;
    return this._request('getChatMembersCount', { form });
  }

  /**
   * Use this method to get the number of members in a chat.
   * Returns Int on success
   * @param  {Number|String} chatId  Unique identifier for the target group or username of the target supergroup
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#getchatmembercount
   */
  getChatMemberCount(chatId, form = {}) {
    form.chat_id = chatId;
    return this._request('getChatMemberCount', { form });
  }

  /**
   * Use this method to get information about a member of a chat.
   * @param  {Number|String} chatId  Unique identifier for the target group or username of the target supergroup
   * @param  {Number} userId  Unique identifier of the target user
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#getchatmember
   */
  getChatMember(chatId, userId, form = {}) {
    form.chat_id = chatId;
    form.user_id = userId;
    return this._request('getChatMember', { form });
  }

  /**
   * Leave a group, supergroup or channel.
   * @param  {Number|String} chatId Unique identifier for the target group or username of the target supergroup (in the format @supergroupusername)
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#leavechat
   */
  leaveChat(chatId, form = {}) {
    form.chat_id = chatId;
    return this._request('leaveChat', { form });
  }

  /**
   * Use this method to set a new group sticker set for a supergroup.
   * @param  {Number|String} chatId Unique identifier for the target group or username of the target supergroup (in the format @supergroupusername)
   * @param  {String} stickerSetName Name of the sticker set to be set as the group sticker set
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#setchatstickerset
   */
  setChatStickerSet(chatId, stickerSetName, form = {}) {
    form.chat_id = chatId;
    form.sticker_set_name = stickerSetName;
    return this._request('setChatStickerSet', { form });
  }

  /**
   * Use this method to delete a group sticker set from a supergroup.
   * @param  {Number|String} chatId Unique identifier for the target group or username of the target supergroup (in the format @supergroupusername)
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#deletechatstickerset
   */
  deleteChatStickerSet(chatId, form = {}) {
    form.chat_id = chatId;
    return this._request('deleteChatStickerSet', { form });
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
   * @param  {Number} userId  Unique identifier of the target user
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
   * @param  {Number} userId  Unique identifier of the target user
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
   * @param  {Number|String} chatId  Unique identifier of the target chat
   * @param  {Number} messageId  Unique identifier of the target message
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
    form.prices = stringify(prices);
    form.provider_data = stringify(form.provider_data);
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
    form.shipping_options = stringify(form.shipping_options);
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
   * @param  {Object} [fileOptions] Optional file related meta-data
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#uploadstickerfile
   */
  uploadStickerFile(userId, pngSticker, options = {}, fileOptions = {}) {
    const opts = {
      qs: options,
    };
    opts.qs.user_id = userId;
    try {
      const sendData = this._formatSendData('png_sticker', pngSticker, fileOptions);
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
   * @param  {Object} [fileOptions] Optional file related meta-data
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#createnewstickerset
   * @todo Add tests for this method!
   */
  createNewStickerSet(userId, name, title, pngSticker, emojis, options = {}, fileOptions = {}) {
    const opts = {
      qs: options,
    };
    opts.qs.user_id = userId;
    opts.qs.name = name;
    opts.qs.title = title;
    opts.qs.emojis = emojis;
    opts.qs.mask_position = stringify(options.mask_position);
    try {
      const sendData = this._formatSendData('png_sticker', pngSticker, fileOptions);
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
   * @param  {Object} [fileOptions] Optional file related meta-data
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#addstickertoset
   * @todo Add tests for this method!
   */
  addStickerToSet(userId, name, pngSticker, emojis, options = {}, fileOptions = {}) {
    const opts = {
      qs: options,
    };
    opts.qs.user_id = userId;
    opts.qs.name = name;
    opts.qs.emojis = emojis;
    opts.qs.mask_position = stringify(options.mask_position);
    try {
      const sendData = this._formatSendData('png_sticker', pngSticker, fileOptions);
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
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#setstickerpositioninset
   * @todo Add tests for this method!
   */
  setStickerPositionInSet(sticker, position, form = {}) {
    form.sticker = sticker;
    form.position = position;
    return this._request('setStickerPositionInSet', { form });
  }

  /**
   * Use this method to delete a sticker from a set created by the bot.
   * Returns True on success.
   *
   * @param  {String} sticker File identifier of the sticker
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#deletestickerfromset
   * @todo Add tests for this method!
   */
  deleteStickerFromSet(sticker, form = {}) {
    form.sticker = sticker;
    return this._request('deleteStickerFromSet', { form });
  }

  /**
   * Use this method to send a group of photos or videos as an album.
   * On success, an array of the sent [Messages](https://core.telegram.org/bots/api#message)
   * is returned.
   *
   * If you wish to [specify file options](https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#sending-files),
   * add a `fileOptions` property to the target input in `media`.
   *
   * @param  {String} chatId Unique identifier for the target chat or username of the target channel (in the format `@channelusername`)
   * @param  {Array} media A JSON-serialized array describing photos and videos to be sent, must include 2–10 items
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#sendmediagroup
   * @see https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#sending-files
   */
  sendMediaGroup(chatId, media, options = {}) {
    const opts = {
      qs: options,
    };
    opts.qs.chat_id = chatId;

    opts.formData = {};
    const inputMedia = [];
    let index = 0;
    for (const input of media) {
      const payload = Object.assign({}, input);
      delete payload.media;
      delete payload.fileOptions;
      try {
        const attachName = String(index);
        const [formData, fileId] = this._formatSendData(attachName, input.media, input.fileOptions);
        if (formData) {
          opts.formData[attachName] = formData[attachName];
          payload.media = `attach://${attachName}`;
        } else {
          payload.media = fileId;
        }
      } catch (ex) {
        return Promise.reject(ex);
      }
      inputMedia.push(payload);
      index++;
    }
    opts.qs.media = JSON.stringify(inputMedia);

    return this._request('sendMediaGroup', opts);
  }
}

module.exports = TelegramBot;
