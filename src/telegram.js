'use strict';

var TelegramBotWebHook = require('./telegramWebHook');
var TelegramBotPolling = require('./telegramPolling');
var debug = require('debug')('node-telegram-bot-api');
var EventEmitter = require('events').EventEmitter;
var fileType = require('file-type');
var Promise = require('bluebird');
var request = require('request');
var qs = require('querystring');
var stream = require('stream');
var util = require('util');
var mime = require('mime');
var path = require('path');
var URL = require('url');
var fs = require('fs');

var requestPromise = Promise.promisify(request);

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
var TelegramBot = function (token, options) {
  options = options || {};
  this.options = options;
  this.token = token;
  this.messageTypes = [
    'text', 'audio', 'document', 'photo', 'sticker', 'video', 'voice', 'contact',
    'location', 'new_chat_participant', 'left_chat_participant', 'new_chat_title',
    'new_chat_photo', 'delete_chat_photo', 'group_chat_created'
  ]; // Telegram message events
  this.textRegexpCallbacks = [];
  this.onReplyToMessages = [];

  this.processUpdate = this._processUpdate.bind(this);

  if (options.polling) {
    this.initPolling();
  }

  if (options.webHook) {
    this._WebHook = new TelegramBotWebHook(token, options.webHook, this.processUpdate);
  }
};

util.inherits(TelegramBot, EventEmitter);

TelegramBot.prototype.initPolling = function() {
  if (this._polling) {
    this._polling.abort = true;
    this._polling.lastRequest.cancel('Polling restart');
  }
  this._polling = new TelegramBotPolling(this.token, this.options.polling, this.processUpdate);
};

TelegramBot.prototype._processUpdate = function (update) {
  debug('Process Update %j', update);
  var message = update.message;
  var inline_query = update.inline_query;
  var chosen_inline_result = update.chosen_inline_result;

  if (message) {
    debug('Process Update message %j', message);
    this.emit('message', message);
    var processMessageType = function (messageType) {
      if (message[messageType]) {
        debug('Emtting %s: %j', messageType, message);
        this.emit(messageType, message);
      }
    };
    this.messageTypes.forEach(processMessageType.bind(this));
    if (message.text) {
      debug('Text message');
      this.textRegexpCallbacks.forEach(function (reg) {
        debug('Matching %s whith', message.text, reg.regexp);
        var result = reg.regexp.exec(message.text);
        if (result) {
          debug('Matches', reg.regexp);
          reg.callback(message, result);
        }
      });
    }
    if (message.reply_to_message) {
      // Only callbacks waiting for this message
      this.onReplyToMessages.forEach(function (reply) {
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
  } else if (inline_query) {
    debug('Process Update inline_query %j', inline_query);
    this.emit('inline_query', inline_query);
  } else if (chosen_inline_result) {
    debug('Process Update chosen_inline_result %j', chosen_inline_result);
    this.emit('chosen_inline_result', chosen_inline_result);
  }
};

TelegramBot.prototype._request = function (path, options) {
  if (!this.token) {
    throw new Error('Telegram Bot Token not provided!');
  }
  options = options || {};
  if (options.form) {
    var replyMarkup = options.form.reply_markup;
    if (replyMarkup && typeof replyMarkup !== 'string') {
      // reply_markup must be passed as JSON stringified to Telegram
      options.form.reply_markup = JSON.stringify(replyMarkup);
    }
  }
  options.url = this._buildURL(path);
  debug('HTTP request: %j', options);
  return requestPromise(options)
    .then(function (resp) {
      if (resp[0].statusCode !== 200) {
        throw new Error(resp[0].statusCode+' '+resp[0].body);
      }
      var data;
      try {
        data = JSON.parse(resp[0].body);
      } catch (err) {
        throw new Error('Error parsing Telegram response: %s', resp[0].body);
      }
      if (data.ok) {
        return data.result;
      } else {
        throw new Error(data.error_code+' '+data.description);
      }
    });
};

/**
 * Generates url with bot token and provided path/method you want to be got/executed by bot
 * @return {String} url
 * @param {String} path
 * @private
 * @see https://core.telegram.org/bots/api#making-requests
 */
TelegramBot.prototype._buildURL = function(path) {
  return URL.format({
    protocol: 'https',
    host: 'api.telegram.org',
    pathname: '/bot' + this.token + '/' + path
  });
};

/**
 * Returns basic information about the bot in form of a `User` object.
 * @return {Promise}
 * @see https://core.telegram.org/bots/api#getme
 */
TelegramBot.prototype.getMe = function () {
  var path = 'getMe';
  return this._request(path);
};

/**
 * Specify an url to receive incoming updates via an outgoing webHook.
 * @param {String} url URL where Telegram will make HTTP Post. Leave empty to
 * delete webHook.
 * @param {String|stream.Stream} [cert] PEM certificate key (public).
 * @see https://core.telegram.org/bots/api#setwebhook
 */
TelegramBot.prototype.setWebHook = function (url, cert) {
  var path = 'setWebHook';
  var opts = {
    qs: {url: url}
  };

  if (cert) {
    var content = this._formatSendData('certificate', cert);
    opts.formData = content[0];
    opts.qs.certificate = content[1];
  }

  return this._request(path, opts)
    .then(function (resp) {
      if (!resp) {
        throw new Error(resp);
      }
      return resp;
    });
};

/**
 * Use this method to receive incoming updates using long polling
 * @param  {Number|String} [timeout] Timeout in seconds for long polling.
 * @param  {Number|String} [limit] Limits the number of updates to be retrieved.
 * @param  {Number|String} [offset] Identifier of the first update to be returned.
 * @return {Promise} Updates
 * @see https://core.telegram.org/bots/api#getupdates
 */
TelegramBot.prototype.getUpdates = function (timeout, limit, offset) {
  var form = {
    offset: offset,
    limit: limit,
    timeout: timeout
  };

  return this._request('getUpdates', {form: form});
};

/**
 * Send text message.
 * @param  {Number|String} chatId Unique identifier for the message recipient
 * @param  {String} text Text of the message to be sent
 * @param  {Object} [options] Additional Telegram query options
 * @return {Promise}
 * @see https://core.telegram.org/bots/api#sendmessage
 */
TelegramBot.prototype.sendMessage = function (chatId, text, options) {
  var form = options || {};
  form.chat_id = chatId;
  form.text = text;
  return this._request('sendMessage', {form: form});
};

/**
 * Send answers to an inline query.
 * @param  {String} inlineQueryId Unique identifier of the query
 * @param  {InlineQueryResult[]} results An array of results for the inline query
 * @param  {Object} [options] Additional Telegram query options
 * @return {Promise}
 * @see https://core.telegram.org/bots/api#answerinlinequery
 */
TelegramBot.prototype.answerInlineQuery = function (inlineQueryId, results, options) {
  var form = options || {};
  form.inline_query_id = inlineQueryId;
  form.results = JSON.stringify(results);
  return this._request('answerInlineQuery', {form: form});
};


/**
 * Forward messages of any kind.
 * @param  {Number|String} chatId     Unique identifier for the message recipient
 * @param  {Number|String} fromChatId Unique identifier for the chat where the
 * original message was sent
 * @param  {Number|String} messageId  Unique message identifier
 * @return {Promise}
 */
TelegramBot.prototype.forwardMessage = function (chatId, fromChatId, messageId) {
  var form = {
    chat_id: chatId,
    from_chat_id: fromChatId,
    message_id: messageId
  };
  return this._request('forwardMessage', {form: form});
};

TelegramBot.prototype._formatSendData = function (type, data) {
  var formData;
  var fileName;
  var fileId;
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
    var filetype = fileType(data);
    if (!filetype) {
      throw new Error('Unsupported Buffer file type');
    }
    formData = {};
    formData[type] = {
      value: data,
      options: {
        filename: 'data.' + filetype.ext,
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
};

/**
 * Send photo
 * @param  {Number|String} chatId  Unique identifier for the message recipient
 * @param  {String|stream.Stream|Buffer} photo A file path or a Stream. Can
 * also be a `file_id` previously uploaded
 * @param  {Object} [options] Additional Telegram query options
 * @return {Promise}
 * @see https://core.telegram.org/bots/api#sendphoto
 */
TelegramBot.prototype.sendPhoto = function (chatId, photo, options) {
  var opts = {
    qs: options || {}
  };
  opts.qs.chat_id = chatId;
  var content = this._formatSendData('photo', photo);
  opts.formData = content[0];
  opts.qs.photo = content[1];
  return this._request('sendPhoto', opts);
};

/**
 * Send audio
 * @param  {Number|String} chatId  Unique identifier for the message recipient
 * @param  {String|stream.Stream|Buffer} audio A file path, Stream or Buffer.
 * Can also be a `file_id` previously uploaded.
 * @param  {Object} [options] Additional Telegram query options
 * @return {Promise}
 * @see https://core.telegram.org/bots/api#sendaudio
 */
TelegramBot.prototype.sendAudio = function (chatId, audio, options) {
  var opts = {
    qs: options || {}
  };
  opts.qs.chat_id = chatId;
  var content = this._formatSendData('audio', audio);
  opts.formData = content[0];
  opts.qs.audio = content[1];
  return this._request('sendAudio', opts);
};

/**
 * Send Document
 * @param  {Number|String} chatId  Unique identifier for the message recipient
 * @param  {String|stream.Stream|Buffer} doc A file path, Stream or Buffer.
 * Can also be a `file_id` previously uploaded.
 * @param  {Object} [options] Additional Telegram query options
 * @return {Promise}
 * @see https://core.telegram.org/bots/api#sendDocument
 */
TelegramBot.prototype.sendDocument = function (chatId, doc, options) {
  var opts = {
    qs: options || {}
  };
  opts.qs.chat_id = chatId;
  var content = this._formatSendData('document', doc);
  opts.formData = content[0];
  opts.qs.document = content[1];
  return this._request('sendDocument', opts);
};

/**
 * Send .webp stickers.
 * @param  {Number|String} chatId  Unique identifier for the message recipient
 * @param  {String|stream.Stream|Buffer} sticker A file path, Stream or Buffer.
 * Can also be a `file_id` previously uploaded. Stickers are WebP format files.
 * @param  {Object} [options] Additional Telegram query options
 * @return {Promise}
 * @see https://core.telegram.org/bots/api#sendsticker
 */
TelegramBot.prototype.sendSticker = function (chatId, sticker, options) {
  var opts = {
    qs: options || {}
  };
  opts.qs.chat_id = chatId;
  var content = this._formatSendData('sticker', sticker);
  opts.formData = content[0];
  opts.qs.sticker = content[1];
  return this._request('sendSticker', opts);
};

/**
 * Use this method to send video files, Telegram clients support mp4 videos (other formats may be sent as Document).
 * @param  {Number|String} chatId  Unique identifier for the message recipient
 * @param  {String|stream.Stream|Buffer} video A file path or Stream.
 * Can also be a `file_id` previously uploaded.
 * @param  {Object} [options] Additional Telegram query options
 * @return {Promise}
 * @see https://core.telegram.org/bots/api#sendvideo
 */
TelegramBot.prototype.sendVideo = function (chatId, video, options) {
  var opts = {
    qs: options || {}
  };
  opts.qs.chat_id = chatId;
  var content = this._formatSendData('video', video);
  opts.formData = content[0];
  opts.qs.video = content[1];
  return this._request('sendVideo', opts);
};

/**
 * Send voice
 * @param  {Number|String} chatId  Unique identifier for the message recipient
 * @param  {String|stream.Stream|Buffer} voice A file path, Stream or Buffer.
 * Can also be a `file_id` previously uploaded.
 * @param  {Object} [options] Additional Telegram query options
 * @return {Promise}
 * @see https://core.telegram.org/bots/api#sendvoice
 */
TelegramBot.prototype.sendVoice = function (chatId, voice, options) {
  var opts = {
    qs: options || {}
  };
  opts.qs.chat_id = chatId;
  var content = this._formatSendData('voice', voice);
  opts.formData = content[0];
  opts.qs.voice = content[1];
  return this._request('sendVoice', opts);
};


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
TelegramBot.prototype.sendChatAction = function (chatId, action) {
  var form = {
    chat_id: chatId,
    action: action
  };
  return this._request('sendChatAction', {form: form});
};

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
TelegramBot.prototype.getUserProfilePhotos = function (userId, offset, limit) {
  var form = {
    user_id: userId,
    offset: offset,
    limit: limit
  };
  return this._request('getUserProfilePhotos', {form: form});
};

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
TelegramBot.prototype.sendLocation = function (chatId, latitude, longitude, options) {
  var form = options || {};
  form.chat_id = chatId;
  form.latitude = latitude;
  form.longitude = longitude;
  return this._request('sendLocation', {form: form});
};

/**
 * Get file.
 * Use this method to get basic info about a file and prepare it for downloading.
 * Attention: link will be valid for 1 hour.
 *
 * @param  {String} fileId  File identifier to get info about
 * @return {Promise}
 * @see https://core.telegram.org/bots/api#getfile
 */
TelegramBot.prototype.getFile = function(fileId) {
  var form = {file_id: fileId};
  return this._request('getFile', {form: form});
};

/**
 * Get link for file.
 * Use this method to get link for file for subsequent use.
 * Attention: link will be valid for 1 hour.
 *
 * This method is a sugar extension of the (getFile)[#getfilefileid] method, which returns just path to file on remote server (you will have to manually build full uri after that).
 *
 * @param  {String} fileId  File identifier to get info about
 * @return {Promise} promise Promise which will have *fileURI* in resolve callback
 * @see https://core.telegram.org/bots/api#getfile
 */
TelegramBot.prototype.getFileLink = function(fileId) {
  return this.getFile(fileId)
    .then(function (resp) {
      return URL.format({
        protocol: 'https',
        host: 'api.telegram.org',
        pathname: '/file/bot' + this.token + '/' + resp.file_path
      });
    }.bind(this));
};

/**
 * Downloads file in the specified folder.
 * This is just a sugar for (getFile)[#getfilefiled] method
 *
 * @param  {String} fileId  File identifier to get info about
 * @param  {String} downloadDir Absolute path to the folder in which file will be saved
 * @return {Promise} promise Promise, which will have *filePath* of downloaded file in resolve callback
 */
TelegramBot.prototype.downloadFile = function(fileId, downloadDir) {

  return this.getFileLink(fileId).then(function (fileURI) {
    var fileName = fileURI.slice(fileURI.lastIndexOf('/') + 1);
    // TODO: Ensure fileName doesn't contains slashes
    var filePath = downloadDir + '/' + fileName;
    return new Promise(function (resolve, reject) {
      request({uri: fileURI})
        .pipe(fs.createWriteStream(filePath))
        .on('error', reject)
        .on('close', function() {
          resolve(filePath);
        });
    });
  });

};

/**
 * Register a RegExp to test against an incomming text message.
 * @param  {RegExp}   regexp       RegExp to be executed with `exec`.
 * @param  {Function} callback     Callback will be called with 2 parameters,
 * the `msg` and the result of executing `regexp.exec` on message text.
 */
TelegramBot.prototype.onText = function (regexp, callback) {
  this.textRegexpCallbacks.push({regexp: regexp, callback: callback});
};

/**
 * Register a reply to wait for a message response.
 * @param  {Number|String}   chatId       The chat id where the message cames from.
 * @param  {Number|String}   messageId    The message id to be replied.
 * @param  {Function} callback     Callback will be called with the reply 
 * message.
 */
TelegramBot.prototype.onReplyToMessage = function (chatId, messageId, callback) {
  this.onReplyToMessages.push({
    chatId: chatId,
    messageId: messageId,
    callback: callback
  });
};

module.exports = TelegramBot;
