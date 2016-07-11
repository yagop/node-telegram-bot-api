const TelegramBotWebHook = require('./telegramWebHook');
const TelegramBotPolling = require('./telegramPolling');
const debug = require('debug')('node-telegram-bot-api');
const EventEmitter = require('eventemitter3');
const fileType = require('file-type');
const Promise = require('bluebird');
const request = require('request-promise');
const streamedRequest = require('request');
const qs = require('querystring');
const stream = require('stream');
const mime = require('mime');
const path = require('path');
const URL = require('url');
const fs = require('fs');
const pump = require('pump');

const _messageTypes = [
  'text', 'audio', 'document', 'photo', 'sticker', 'video', 'voice', 'contact',
  'location', 'new_chat_participant', 'left_chat_participant', 'new_chat_title',
  'new_chat_photo', 'delete_chat_photo', 'group_chat_created'
];

class TelegramBot extends EventEmitter {

  static get messageTypes() {
    return _messageTypes;
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
   * @param {Boolean|Object} [options.polling=false] Set true to enable polling or set options
   * @param {String|Number} [options.polling.timeout=10] Polling time in seconds
   * @param {String|Number} [options.polling.interval=2000] Interval between requests in miliseconds
   * @param {Boolean|Object} [options.webHook=false] Set true to enable WebHook or set options
   * @param {String} [options.webHook.key] PEM private key to webHook server.
   * @param {String} [options.webHook.cert] PEM certificate (public) to webHook server.
   * @see https://core.telegram.org/bots/api
   */
  constructor(token, options = {}) {
    super();
    this.options = options;
    this.token = token;
    this.textRegexpCallbacks = [];
    this.onReplyToMessages = [];

    if (options.polling) {
      this.initPolling();
    }

    if (options.webHook) {
      this._WebHook = new TelegramBotWebHook(token, options.webHook, this.processUpdate.bind(this));
    }
  }

  initPolling() {
    if (this._polling) {
      this._polling.abort = true;
      this._polling.lastRequest.cancel('Polling restart');
    }
    this._polling = new TelegramBotPolling(this.token, this.options.polling, this.processUpdate.bind(this));
  }

  /**
   * Stops polling after the last polling request resolves
   *
   * @return {Promise} promise Promise, of last polling request
   */
  stopPolling() {
    if (this._polling) {
      return this._polling.stopPolling();
    }
    return Promise.resolve();
  }

  processUpdate(update) {
    debug('Process Update %j', update);
    const message = update.message;
    const inlineQuery = update.inline_query;
    const chosenInlineResult = update.chosen_inline_result;
    const callbackQuery = update.callback_query;

    if (message) {
      debug('Process Update message %j', message);
      this.emit('message', message);
      const processMessageType = messageType => {
        if (message[messageType]) {
          debug('Emtting %s: %j', messageType, message);
          this.emit(messageType, message);
        }
      };
      TelegramBot.messageTypes.forEach(processMessageType);
      if (message.text) {
        debug('Text message');
        this.textRegexpCallbacks.forEach(reg => {
          debug('Matching %s whith', message.text, reg.regexp);
          const result = reg.regexp.exec(message.text);
          if (result) {
            debug('Matches', reg.regexp);
            reg.callback(message, result);
          }
        });
      }
      if (message.reply_to_message) {
        // Only callbacks waiting for this message
        this.onReplyToMessages.forEach(reply => {
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
    } else if (inlineQuery) {
      debug('Process Update inline_query %j', inlineQuery);
      this.emit('inline_query', inlineQuery);
    } else if (chosenInlineResult) {
      debug('Process Update chosen_inline_result %j', chosenInlineResult);
      this.emit('chosen_inline_result', chosenInlineResult);
    } else if (callbackQuery) {
      debug('Process Update callback_query %j', callbackQuery);
      this.emit('callback_query', callbackQuery);
    }
  }

  // used so that other funcs are not non-optimizable
  _safeParse(json) {
    try {
      return JSON.parse(json);
    } catch (err) {
      throw new Error(`Error parsing Telegram response: ${String(json)}`);
    }
  }

  // request-promise
  _request(_path, options = {}) {
    if (!this.token) {
      throw new Error('Telegram Bot Token not provided!');
    }

    if (options.form) {
      const replyMarkup = options.form.reply_markup;
      if (replyMarkup && typeof replyMarkup !== 'string') {
        // reply_markup must be passed as JSON stringified to Telegram
        options.form.reply_markup = JSON.stringify(replyMarkup);
      }
    }
    options.url = this._buildURL(_path);
    options.simple = false;
    options.resolveWithFullResponse = true;
    debug('HTTP request: %j', options);
    return request(options)
      .then(resp => {
        if (resp.statusCode !== 200) {
          throw new Error(`${resp.statusCode} ${resp.body}`);
        }

        const data = this._safeParse(resp.body);
        if (data.ok) {
          return data.result;
        }

        throw new Error(`${data.error_code} ${data.description}`);
      });
  }

  /**
   * Generates url with bot token and provided path/method you want to be got/executed by bot
   * @return {String} url
   * @param {String} path
   * @private
   * @see https://core.telegram.org/bots/api#making-requests
   */
  _buildURL(_path) {
    return URL.format({
      protocol: 'https',
      host: 'api.telegram.org',
      pathname: `/bot${this.token}/${_path}`
    });
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
   * @param {String} url URL where Telegram will make HTTP Post. Leave empty to
   * delete webHook.
   * @param {String|stream.Stream} [cert] PEM certificate key (public).
   * @see https://core.telegram.org/bots/api#setwebhook
   */
  setWebHook(url, cert) {
    const _path = 'setWebHook';
    const opts = { qs: { url } };

    if (cert) {
      const [formData, certificate] = this._formatSendData('certificate', cert);
      opts.formData = formData;
      opts.qs.certificate = certificate;
    }

    return this._request(_path, opts)
      .then(resp => {
        if (!resp) {
          throw new Error(resp);
        }

        return resp;
      });
  }

  /**
   * Use this method to receive incoming updates using long polling
   * @param  {Number|String} [timeout] Timeout in seconds for long polling.
   * @param  {Number|String} [limit] Limits the number of updates to be retrieved.
   * @param  {Number|String} [offset] Identifier of the first update to be returned.
   * @return {Promise} Updates
   * @see https://core.telegram.org/bots/api#getupdates
   */
  getUpdates(timeout, limit, offset) {
    const form = {
      offset,
      limit,
      timeout,
    };

    return this._request('getUpdates', { form });
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
   * @return {Promise}
   */
  forwardMessage(chatId, fromChatId, messageId) {
    const form = {
      chat_id: chatId,
      from_chat_id: fromChatId,
      message_id: messageId
    };

    return this._request('forwardMessage', { form });
  }

  _formatSendData(type, data) {
    let formData;
    let fileName;
    let fileId;
    if (data instanceof stream.Stream) {
      fileName = URL.parse(path.basename(data.path)).pathname;
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
        throw new Error('Unsupported Buffer file type');
      }
      formData = {};
      formData[type] = {
        value: data,
        options: {
          filename: `data.${filetype.ext}`,
          contentType: filetype.mime
        }
      };
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
    const content = this._formatSendData('photo', photo);
    opts.formData = content[0];
    opts.qs.photo = content[1];
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
    const content = this._formatSendData('audio', audio);
    opts.formData = content[0];
    opts.qs.audio = content[1];
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
    const content = this._formatSendData('document', doc);
    opts.formData = content[0];
    opts.qs.document = content[1];
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
    const content = this._formatSendData('sticker', sticker);
    opts.formData = content[0];
    opts.qs.sticker = content[1];
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
    const content = this._formatSendData('video', video);
    opts.formData = content[0];
    opts.qs.video = content[1];
    return this._request('sendVideo', opts);
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
    const content = this._formatSendData('voice', voice);
    opts.formData = content[0];
    opts.qs.voice = content[1];
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
      action: action,
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
   * Use this method to send answers to callback queries sent from
   * inline keyboards. The answer will be displayed to the user as
   * a notification at the top of the chat screen or as an alert.
   * On success, True is returned.
   *
   * @param  {Number|String} callbackQueryId  Unique identifier for the query to be answered
   * @param  {String} text  Text of the notification. If not specified, nothing will be shown to the user
   * @param  {Boolean} showAlert  Whether to show an alert or a notification at the top of the screen
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#answercallbackquery
   */
  answerCallbackQuery(callbackQueryId, text, showAlert, form = {}) {
    form.callback_query_id = callbackQueryId;
    form.text = text;
    form.show_alert = showAlert;
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
   *
   * @param  {Number|String} userId  Unique identifier of the target user
   * @param  {Number} [offset] Sequential number of the first photo to be returned. By default, all photos are returned.
   * @param  {Number} [limit] Limits the number of photos to be retrieved. Values between 1—100 are accepted. Defaults to 100.
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#getuserprofilephotos
   */
  getUserProfilePhotos(userId, offset, limit) {
    const form = {
      user_id: userId,
      offset,
      limit
    };
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
   * Send Venue.
   * Use this method to send Venue infomration
   *
   * @param  {Number|String} chatId  Unique identifier for the message recipient
   * @param  {Float} latitude Latitude of venue
   * @param  {Float} longitude Longitude of venue
   * @param  {String} title Title of venue
   * @param  {String} address Address of venue
   * @param  {Object} [options] Additional Telegram query options
   * @return {Promise}
   * @see https://core.telegram.org/bots/api#sendlocation
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
      .then(resp => URL.format({
        protocol: 'https',
        host: 'api.telegram.org',
        pathname: `/file/bot${this.token}/${resp.file_path}`
      }));
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
        const filePath = `${downloadDir}/${fileName}`;

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
    this.textRegexpCallbacks.push({ regexp, callback });
  }

  /**
   * Register a reply to wait for a message response.
   * @param  {Number|String}   chatId       The chat id where the message cames from.
   * @param  {Number|String}   messageId    The message id to be replied.
   * @param  {Function} callback     Callback will be called with the reply
   * message.
   */
  onReplyToMessage(chatId, messageId, callback) {
    this.onReplyToMessages.push({
      chatId,
      messageId,
      callback
    });
  }
}

module.exports = TelegramBot;
