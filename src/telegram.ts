/// <reference types="node" />

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { URL } from 'url';
import * as stream from 'stream';
import * as qs from 'querystring';
import * as debug from 'debug';
import fetch from 'node-fetch';
import { fileTypeFromBuffer } from 'file-type';

import { TelegramBotWebHook } from './telegramWebHook';
import { TelegramBotPolling } from './telegramPolling';
import { errors } from './errors';
import { deprecateFunction } from './utils';
import * as TelegramTypes from './types/telegram-types';
import * as BotTypes from './types/bot-types';
import { GetUpdatesOptions } from './types/bot-types';

const debugLog = debug.default('node-telegram-bot-api');

const _messageTypes: BotTypes.MessageType[] = [
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
  'message_reaction',
];

const _deprecatedMessageTypes = ['new_chat_participant', 'left_chat_participant'];

/**
 * JSON-serialize data. If the provided data is already a String,
 * return it as is.
 * @private
 * @param data
 * @return string
 */
function stringify(data: unknown): string {
  if (typeof data === 'string') {
    return data;
  }
  return JSON.stringify(data);
}

export class TelegramBot extends EventEmitter {
  public readonly token: string;
  public readonly options: BotTypes.TelegramBotOptions;

  private _textRegexpCallbacks: Array<{
    regexp: RegExp;
    callback: (msg: TelegramTypes.Message, match: RegExpMatchArray | null) => void;
  }> = [];
  private _replyListenerId = 0;
  private _replyListeners: Array<{
    id: number;
    chatId: number | string;
    messageId: number;
    callback: (msg: TelegramTypes.Message) => void;
  }> = [];
  private _polling: TelegramBotPolling | null = null;
  private _webHook: TelegramBotWebHook | null = null;

  /**
   * The different errors the library uses.
   */
  static get errors() {
    return errors;
  }

  /**
   * The types of message updates the library handles.
   */
  static get messageTypes(): BotTypes.MessageType[] {
    return _messageTypes;
  }

  /**
   * Add listener for the specified event.
   * This is the usual `emitter.on()` method.
   * @param event
   * @param listener
   */
  on(event: string | symbol, listener: (...args: unknown[]) => void): this {
    if (typeof event === 'string' && _deprecatedMessageTypes.indexOf(event) !== -1) {
      const url = 'https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#events';
      deprecateFunction(
        `Events ${_deprecatedMessageTypes.join(',')} are deprecated. See the updated list of events: ${url}`
      );
    }
    return super.on(event, listener);
  }

  /**
   * Both request method to obtain messages are implemented. To use standard polling, set `polling: true`
   * on `options`. Notice that webHook will need a SSL certificate.
   * Emits `message` when a message arrives.
   *
   * @param token Bot Token
   * @param options
   */
  constructor(token: string, options: BotTypes.TelegramBotOptions = {}) {
    super();
    this.token = token;
    this.options = {
      polling: false,
      webHook: false,
      baseApiUrl: 'https://api.telegram.org',
      filepath: true,
      badRejection: false,
      ...options,
    };

    if (this.options.polling) {
      const autoStart = typeof this.options.polling === 'object' && this.options.polling.autoStart;
      if (typeof autoStart === 'undefined' || autoStart === true) {
        this.startPolling();
      }
    }

    if (this.options.webHook) {
      const autoOpen = typeof this.options.webHook === 'object' && this.options.webHook.autoOpen;
      if (typeof autoOpen === 'undefined' || autoOpen === true) {
        this.openWebHook();
      }
    }
  }

  /**
   * Generates url with bot token and provided path/method you want to be got/executed by bot
   * @param _path
   * @return url
   * @private
   */
  private _buildURL(_path: string): string {
    return `${this.options.baseApiUrl}/bot${this.token}${this.options.testEnvironment ? '/test' : ''}/${_path}`;
  }

  /**
   * Fix 'reply_markup' parameter by making it JSON-serialized, as
   * required by the Telegram Bot API
   * @param obj Object; either 'form' or 'qs'
   * @private
   */
  private _fixReplyMarkup(obj: Record<string, unknown>): void {
    const replyMarkup = obj.reply_markup;
    if (replyMarkup && typeof replyMarkup !== 'string') {
      obj.reply_markup = stringify(replyMarkup);
    }
  }

  /**
   * Fix 'entities' or 'caption_entities' or 'explanation_entities' parameter by making it JSON-serialized, as
   * required by the Telegram Bot API
   * @param obj Object
   * @private
   */
  private _fixEntitiesField(obj: Record<string, unknown>): void {
    const entities = obj.entities;
    const captionEntities = obj.caption_entities;
    const explanationEntities = obj.explanation_entities;
    if (entities && typeof entities !== 'string') {
      obj.entities = stringify(entities);
    }

    if (captionEntities && typeof captionEntities !== 'string') {
      obj.caption_entities = stringify(captionEntities);
    }

    if (explanationEntities && typeof explanationEntities !== 'string') {
      obj.explanation_entities = stringify(explanationEntities);
    }
  }

  private async _fixAddFileThumbnail(
    options: { thumb?: string },
    opts: { formData: Record<string, unknown> | null; qs: Record<string, unknown> }
  ): Promise<void> {
    if (options.thumb) {
      if (opts.formData === null) {
        opts.formData = {};
      }

      const attachName = 'photo';
      const [formData] = await this._formatSendData(
        attachName,
        options.thumb.replace('attach://', '')
      );

      if (formData) {
        opts.formData[attachName] = formData[attachName];
        opts.qs.thumbnail = `attach://${attachName}`;
      }
    }
  }

  /**
   * Fix 'reply_parameters' parameter by making it JSON-serialized, as
   * required by the Telegram Bot API
   * @param obj Object; either 'form' or 'qs'
   * @private
   */
  private _fixReplyParameters(obj: Record<string, unknown>): void {
    if ('reply_parameters' in obj && typeof obj.reply_parameters !== 'string') {
      obj.reply_parameters = stringify(obj.reply_parameters);
    }
  }

  /**
   * Make request against the API
   * @param _path API endpoint
   * @param options
   * @private
   * @return Promise
   */
  private async _request(_path: string, options: Record<string, unknown> = {}): Promise<unknown> {
    if (!this.token) {
      throw new errors.FatalError('Telegram Bot Token not provided!');
    }

    if (this.options.request) {
      Object.assign(options, this.options.request);
    }

    if (options.form) {
      this._fixReplyMarkup(options.form as Record<string, unknown>);
      this._fixEntitiesField(options.form as Record<string, unknown>);
      this._fixReplyParameters(options.form as Record<string, unknown>);
    }
    if (options.qs) {
      this._fixReplyMarkup(options.qs as Record<string, unknown>);
      this._fixReplyParameters(options.qs as Record<string, unknown>);
    }

    const url = this._buildURL(_path);
    const method = 'POST';

    // Build FormData for form submissions
    let body: FormData | URLSearchParams | string | undefined;
    const headers: Record<string, string> = {};

    if (options.form) {
      const formData = new FormData();
      for (const [key, value] of Object.entries(options.form)) {
        if (value !== undefined && value !== null) {
          if (typeof value === 'object' && value !== null && 'value' in value) {
            // File upload
            const fileValue = value as { value: unknown; options?: { filename?: string } };
            formData.append(
              key,
              fileValue.value as string | Buffer | NodeJS.ReadableStream,
              fileValue.options?.filename
            );
          } else {
            formData.append(key, String(value));
          }
        }
      }
      body = formData;
    } else if (options.qs) {
      body = new URLSearchParams();
      for (const [key, value] of Object.entries(options.qs)) {
        if (value !== undefined && value !== null) {
          (body as URLSearchParams).append(key, String(value));
        }
      }
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    debugLog('HTTP request: %s %j', method, { url, body: body ? '[FORM DATA]' : undefined });
    try {
      const response = await fetch(url, {
        method,
        body,
        headers,
        // Note: fetch doesn't have direct equivalents for 'simple' and 'resolveWithFullResponse'
        // but we handle the response parsing below
      });

      let data;
      const responseText = await response.text();
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new errors.ParseError(`Error parsing response: ${responseText}`, response);
      }

      if (data.ok) {
        return data.result;
      }

      throw new errors.TelegramError(`${data.error_code} ${data.description}`, response);
    } catch (error: unknown) {
      // Re-throw our custom errors, wrap everything else in FatalError
      if (error instanceof errors.BaseError) throw error;
      throw new errors.FatalError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Format data to be uploaded; handles file paths, streams and buffers
   * @param type
   * @param data
   * @param fileOptions File options
   * @return formatted
   * @throws Error if Buffer file type is not supported.
   * @private
   */
  private async _formatSendData(
    type: string,
    data: BotTypes.FileInput,
    fileOptions: { filename?: string; contentType?: string } = {}
  ): Promise<
    [
      Record<
        string,
        { value: BotTypes.FileInput; options: { filename: string; contentType: string } }
      > | null,
      string | null,
    ]
  > {
    const deprecationMessage =
      'See https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#sending-files' +
      ' for more information on how sending files has been improved and' +
      ' on how to disable this deprecation message altogether.';
    let filedata: BotTypes.FileInput = data;
    let filename = fileOptions.filename;
    let contentType = fileOptions.contentType;

    if (data instanceof stream.Stream) {
      if (!filename && (data as NodeJS.ReadableStream & { path?: unknown }).path) {
        // Will be 'null' if could not be parsed.
        // For example, 'data.path' === '/?id=123' from 'request("https://example.com/?id=123")'
        const url = new URL(
          path.basename(String((data as NodeJS.ReadableStream & { path?: unknown }).path))
        );
        if (url.pathname) {
          filename = qs.unescape(url.pathname);
        }
      }
    } else if (Buffer.isBuffer(data)) {
      if (!filename && !process.env.NTBA_FIX_350) {
        deprecateFunction(
          `Buffers will have their filenames default to "filename" instead of "data". ${deprecationMessage}`
        );
        filename = 'data';
      }
      if (!contentType) {
        const filetype = await fileTypeFromBuffer(data);
        if (filetype) {
          contentType = filetype.mime;
          const ext = filetype.ext;
          // Add file extension if filename doesn't already have one
          if (ext && filename && !path.extname(filename)) {
            filename = `${filename}.${ext}`;
          }
        }
      }
    } else if (data) {
      if (this.options.filepath && typeof data === 'string' && fs.existsSync(data)) {
        filedata = fs.createReadStream(data);
        if (!filename) {
          filename = path.basename(data);
        }
      } else {
        return [null, data as string];
      }
    } else {
      return [null, data as string];
    }

    filename = filename || 'filename';
    contentType = contentType || 'application/octet-stream';

    return [
      {
        [type]: {
          value: filedata,
          options: {
            filename,
            contentType,
          },
        },
      },
      null,
    ];
  }

  /**
   * Format multiple files to be uploaded; handles file paths, streams, and buffers
   * @param type
   * @param files Array of file data objects
   * @param fileOptions File options
   * @return formatted
   * @throws Error if Buffer file type is not supported.
   * @private
   */
  private _formatSendMultipleData(
    type: string,
    files: Array<{
      media?: BotTypes.FileInput;
      data?: BotTypes.FileInput;
      [key: string]: unknown;
      filename?: string;
      contentType?: string;
    }>,
    fileOptions: { filename?: string; contentType?: string } = {}
  ): {
    formData: Record<
      string,
      { value: BotTypes.FileInput; options: { filename: string; contentType: string } }
    >;
    fileIds: Record<number, BotTypes.FileInput>;
  } {
    const formData: Record<
      string,
      { value: BotTypes.FileInput; options: { filename: string; contentType: string } }
    > = {};
    const fileIds: Record<number, BotTypes.FileInput> = {};

    files.forEach((file, index) => {
      let filedata: BotTypes.FileInput =
        file.media || file.data || (file[type] as BotTypes.FileInput);
      let filename = file.filename || fileOptions.filename;
      let contentType = file.contentType || fileOptions.contentType;

      if (filedata instanceof stream.Stream) {
        if (!filename && (filedata as NodeJS.ReadableStream & { path?: unknown }).path) {
          const url = new URL(
            path.basename(String((filedata as NodeJS.ReadableStream & { path?: unknown }).path))
          );
          if (url.pathname) {
            filename = qs.unescape(url.pathname);
          }
        }
      } else if (Buffer.isBuffer(filedata)) {
        filename = `filename_${index}`;

        if (!contentType) {
          // const filetype = fileType(filedata);
          // if (filetype) {
          //   contentType = filetype.mime;
          //   const ext = filetype.ext;
          //   if (ext) {
          //     filename = `${filename}.${ext}`;
          //   }
          // } else {
          //   throw new errors.FatalError('Unsupported Buffer file-type');
          // }
        }
      } else if (typeof filedata === 'string' && fs.existsSync(filedata)) {
        filedata = fs.createReadStream(filedata);

        if (!filename) {
          filename = path.basename(
            String((filedata as NodeJS.ReadableStream & { path?: unknown }).path)
          );
        }
      } else {
        fileIds[index] = filedata;
        return;
      }

      filename = filename || `filename_${index}`;
      contentType = contentType || 'application/octet-stream';

      formData[`${type}_${index}`] = {
        value: filedata,
        options: {
          filename,
          contentType,
        },
      };
    });

    return { formData, fileIds };
  }

  /**
   * Start polling.
   * Rejects returned promise if a WebHook is being used by this instance.
   * @param options
   * @return Promise
   */
  startPolling(options: { restart?: boolean } = {}): Promise<void> {
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
   * @deprecated
   */
  initPolling(): Promise<void> {
    deprecateFunction(
      'TelegramBot#initPolling() is deprecated. Use TelegramBot#startPolling() instead.'
    );
    return this.startPolling();
  }

  /**
   * Stops polling
   * @param options
   * @return Promise
   */
  stopPolling(options: { restart?: boolean; cancel?: boolean } = {}): Promise<void> {
    if (this._polling) {
      return this._polling.stop(options);
    }
    return Promise.resolve();
  }

  /**
   * Return true if polling is active, false otherwise.
   * @return Boolean
   */
  isPolling(): boolean {
    return this._polling ? this._polling.isPolling() : false;
  }

  /**
   * Open webhook.
   * Multiple WebHooks are not supported.
   * @param url URL to which WebHook will send updates
   * @param certificate PEM certificate contents
   * @param options
   * @return Promise
   */
  openWebHook(): Promise<void> {
    if (this.isPolling()) {
      return Promise.reject(new errors.FatalError('WebHook and Polling are mutually exclusive'));
    }
    if (!this._webHook) {
      this._webHook = new TelegramBotWebHook(this);
    }
    return this._webHook.open();
  }

  /**
   * Close webhook. Multiple WebHooks are not supported.
   * @return Promise
   */
  closeWebHook(): Promise<void> {
    if (this._webHook) {
      return this._webHook.close();
    }
    return Promise.resolve();
  }

  /**
   * Return true if WebHook is active, false otherwise.
   * @return Boolean
   */
  hasOpenWebHook(): boolean {
    return this._webHook ? this._webHook.hasOpenWebHook() : false;
  }

  /**
   * Process an update; emitting the proper events and executing regexp
   * callbacks. This method is useful should you be using a different
   * way to fetch updates, other than those provided by TelegramBot.
   * @param update Update object obtained from Telegram API
   */
  processUpdate(update: TelegramTypes.Update): void {
    debugLog('Process Update %j', update);
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
    const myChatMember = update.my_chat_member;
    const chatMember = update.chat_member;
    const chatJoinRequest = update.chat_join_request;

    if (message) {
      debugLog('Process Update message %j', message);
      const metadata = { type: '' };
      metadata.type =
        TelegramBot.messageTypes.find((messageType) => {
          return messageType in message;
        }) || '';
      this.emit('message', message, metadata);
      if (metadata.type) {
        debugLog('Emitting %s: %j', metadata.type, message);
        this.emit(metadata.type, message, metadata);
      }
      if (message.text) {
        debugLog('Text message');
        const text = message.text;
        this._textRegexpCallbacks.some((reg) => {
          debugLog('Matching %s with %s', text, reg.regexp);

          if (!(reg.regexp instanceof RegExp)) {
            reg.regexp = new RegExp(reg.regexp);
          }

          const result = reg.regexp.exec(text);
          if (!result) {
            return false;
          }
          // reset index so we start at the beginning of the regex each time
          reg.regexp.lastIndex = 0;
          debugLog('Matches %s', reg.regexp);
          reg.callback(message, result);
          // returning truthy value exits .some
          return this.options.onlyFirstMatch;
        });
      }
      if (message.reply_to_message) {
        const replyToMessage = message.reply_to_message;
        // Only callbacks waiting for this message
        this._replyListeners.forEach((reply) => {
          // Message from the same chat
          if (reply.chatId === message.chat.id) {
            // Responding to that message
            if (reply.messageId === replyToMessage.message_id) {
              // Resolve the promise
              reply.callback(message);
            }
          }
        });
      }
    } else if (editedMessage) {
      debugLog('Process Update edited_message %j', editedMessage);
      this.emit('edited_message', editedMessage);
      if (editedMessage.text) {
        this.emit('edited_message_text', editedMessage);
      }
      if (editedMessage.caption) {
        this.emit('edited_message_caption', editedMessage);
      }
    } else if (channelPost) {
      debugLog('Process Update channel_post %j', channelPost);
      this.emit('channel_post', channelPost);
    } else if (editedChannelPost) {
      debugLog('Process Update edited_channel_post %j', editedChannelPost);
      this.emit('edited_channel_post', editedChannelPost);
      if (editedChannelPost.text) {
        this.emit('edited_channel_post_text', editedChannelPost);
      }
      if (editedChannelPost.caption) {
        this.emit('edited_channel_post_caption', editedChannelPost);
      }
    } else if (inlineQuery) {
      debugLog('Process Update inline_query %j', inlineQuery);
      this.emit('inline_query', inlineQuery);
    } else if (chosenInlineResult) {
      debugLog('Process Update chosen_inline_result %j', chosenInlineResult);
      this.emit('chosen_inline_result', chosenInlineResult);
    } else if (callbackQuery) {
      debugLog('Process Update callback_query %j', callbackQuery);
      this.emit('callback_query', callbackQuery);
    } else if (shippingQuery) {
      debugLog('Process Update shipping_query %j', shippingQuery);
      this.emit('shipping_query', shippingQuery);
    } else if (preCheckoutQuery) {
      debugLog('Process Update pre_checkout_query %j', preCheckoutQuery);
      this.emit('pre_checkout_query', preCheckoutQuery);
    } else if (poll) {
      debugLog('Process Update poll %j', poll);
      this.emit('poll', poll);
    } else if (pollAnswer) {
      debugLog('Process Update poll_answer %j', pollAnswer);
      this.emit('poll_answer', pollAnswer);
    } else if (chatMember) {
      debugLog('Process Update chat_member %j', chatMember);
      this.emit('chat_member', chatMember);
    } else if (myChatMember) {
      debugLog('Process Update my_chat_member %j', myChatMember);
      this.emit('my_chat_member', myChatMember);
    } else if (chatJoinRequest) {
      debugLog('Process Update chat_join_request %j', chatJoinRequest);
      this.emit('chat_join_request', chatJoinRequest);
    }
  }

  /**
   * Register a RegExp to test against an incomming text message.
   * @param regexp RegExp executed with `exec`.
   * @param callback Callback will be called with 2 parameters,
   * the `msg` and the result of executing `regexp.exec` on message text.
   */
  onText(
    regexp: RegExp,
    callback: (msg: TelegramTypes.Message, match: RegExpMatchArray | null) => void
  ): void {
    this._textRegexpCallbacks.push({ regexp, callback });
  }

  /**
   * Remove a listener registered with `onText()`.
   * @param regexp RegExp used previously in `onText()`
   * @return deletedListener The removed reply listener if
   *   found. This object has `regexp` and `callback`
   *   properties. If not found, returns `null`.
   */
  removeTextListener(regexp: RegExp): {
    regexp: RegExp;
    callback: (msg: TelegramTypes.Message, match: RegExpMatchArray | null) => void;
  } | null {
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
  clearTextListeners(): void {
    this._textRegexpCallbacks = [];
  }

  /**
   * Register a reply to wait for a message response.
   * @param chatId The chat id where the message cames from.
   * @param messageId The message id to be replied.
   * @param callback Callback will be called with the reply message.
   * @return id The ID of the inserted reply listener.
   */
  onReplyToMessage(
    chatId: number | string,
    messageId: number,
    callback: (msg: TelegramTypes.Message) => void
  ): number {
    const id = ++this._replyListenerId;
    this._replyListeners.push({
      id,
      chatId,
      messageId,
      callback,
    });
    return id;
  }

  /**
   * Removes a reply that has been prev. registered for a message response.
   * @param replyListenerId The ID of the reply listener.
   * @return deletedListener The removed reply listener if
   *   found. This object has `id`, `chatId`, `messageId` and `callback`
   *   properties. If not found, returns `null`.
   */
  removeReplyListener(replyListenerId: number): {
    id: number;
    chatId: number | string;
    messageId: number;
    callback: (msg: TelegramTypes.Message) => void;
  } | null {
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
   * @return deletedListeners An array of removed listeners.
   */
  clearReplyListeners(): {
    id: number;
    chatId: number | string;
    messageId: number;
    callback: (msg: TelegramTypes.Message) => void;
  }[] {
    const deletedListeners = [...this._replyListeners];
    this._replyListeners = [];
    return deletedListeners;
  }

  /**
   * Use this method to receive incoming updates using long polling.
   * @param options Options for the getUpdates call
   * @return Promise of updates
   */
  getUpdates(options: GetUpdatesOptions = {}): Promise<TelegramTypes.Update[]> {
    return this._request('getUpdates', { qs: options }) as Promise<TelegramTypes.Update[]>;
  }

  /**
   * Specify a url to receive incoming updates via an outgoing webhook.
   * @param url URL where Telegram will make HTTP Post. Leave empty to delete webhook.
   * @param options Additional Telegram query options
   * @param fileOptions Optional file related meta-data
   * @return Promise
   * @see https://core.telegram.org/bots/api#setwebhook
   */
  async setWebHook(
    url: string,
    options: Record<string, unknown> = {},
    fileOptions: { filename?: string; contentType?: string } = {}
  ): Promise<unknown> {
    const opts: { qs: Record<string, unknown>; formData?: Record<string, unknown> | null } = {
      qs: options,
    };
    opts.qs.url = url;

    const cert = options.certificate;
    if (cert) {
      try {
        const sendData = await this._formatSendData(
          'certificate',
          cert as BotTypes.FileInput,
          fileOptions
        );
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
   * switch back to getUpdates.
   * @param options Additional Telegram query options
   * @return Promise
   * @see https://core.telegram.org/bots/api#deletewebhook
   */
  deleteWebHook(options: Record<string, unknown> = {}): Promise<unknown> {
    return this._request('deleteWebhook', { form: options });
  }

  /**
   * Use this method to get current webhook status.
   * @param options Additional Telegram query options
   * @return Promise
   * @see https://core.telegram.org/bots/api#getwebhookinfo
   */
  getWebHookInfo(options: Record<string, unknown> = {}): Promise<unknown> {
    return this._request('getWebhookInfo', { form: options });
  }

  // ===== API Methods =====

  /**
   * Returns basic information about the bot
   * @see https://core.telegram.org/bots/api#getme
   */
  getMe(): Promise<unknown> {
    return this._request('getMe');
  }

  /**
   * Get information about a chat
   * @see https://core.telegram.org/bots/api#getchat
   */
  getChat(chatId: number | string): Promise<unknown> {
    return this._request('getChat', { qs: { chat_id: chatId } });
  }

  /**
   * Send a text message
   * @see https://core.telegram.org/bots/api#sendmessage
   */
  sendMessage(
    chatId: number | string,
    text: string,
    options: Record<string, unknown> = {}
  ): Promise<unknown> {
    return this._request('sendMessage', { form: { chat_id: chatId, text, ...options } });
  }

  /**
   * Send a photo
   * @param chatId Unique identifier for the target chat
   * @param photo Photo to send (file path, Stream, Buffer, or file_id)
   * @param options Additional Telegram query options
   * @param fileOptions Optional file related meta-data
   * @see https://core.telegram.org/bots/api#sendphoto
   */
  async sendPhoto(
    chatId: number | string,
    photo: BotTypes.FileInput,
    options: Record<string, unknown> = {},
    fileOptions: { filename?: string; contentType?: string } = {}
  ): Promise<unknown> {
    const opts: { qs: Record<string, unknown>; formData?: Record<string, unknown> | null } = {
      qs: options,
    };
    opts.qs.chat_id = chatId;
    try {
      const sendData = await this._formatSendData('photo', photo, fileOptions);
      opts.formData = sendData[0];
      opts.qs.photo = sendData[1];
    } catch (ex) {
      return Promise.reject(ex);
    }
    return this._request('sendPhoto', opts);
  }

  /**
   * Send audio files (MP3 or M4A format)
   * @param chatId Unique identifier for the target chat
   * @param audio Audio file to send
   * @param options Additional Telegram query options
   * @param fileOptions Optional file related meta-data
   * @see https://core.telegram.org/bots/api#sendaudio
   */
  async sendAudio(
    chatId: number | string,
    audio: BotTypes.FileInput,
    options: Record<string, unknown> = {},
    fileOptions: { filename?: string; contentType?: string } = {}
  ): Promise<unknown> {
    const opts: { qs: Record<string, unknown>; formData: Record<string, unknown> | null } = {
      qs: options,
      formData: null,
    };
    opts.qs.chat_id = chatId;
    try {
      const sendData = await this._formatSendData('audio', audio, fileOptions);
      opts.formData = sendData[0];
      opts.qs.audio = sendData[1];
      await this._fixAddFileThumbnail(options as { thumb?: string }, opts);
    } catch (ex) {
      return Promise.reject(ex);
    }
    return this._request('sendAudio', opts);
  }

  /**
   * Send general files
   * @param chatId Unique identifier for the target chat
   * @param doc Document to send
   * @param options Additional Telegram query options
   * @param fileOptions Optional file related meta-data
   * @see https://core.telegram.org/bots/api#senddocument
   */
  async sendDocument(
    chatId: number | string,
    doc: BotTypes.FileInput,
    options: Record<string, unknown> = {},
    fileOptions: { filename?: string; contentType?: string } = {}
  ): Promise<unknown> {
    const opts: { qs: Record<string, unknown>; formData: Record<string, unknown> | null } = {
      qs: options,
      formData: null,
    };
    opts.qs.chat_id = chatId;
    try {
      const sendData = await this._formatSendData('document', doc, fileOptions);
      opts.formData = sendData[0];
      opts.qs.document = sendData[1];
      await this._fixAddFileThumbnail(options as { thumb?: string }, opts);
    } catch (ex) {
      return Promise.reject(ex);
    }
    return this._request('sendDocument', opts);
  }

  /**
   * Send video files (mp4 format)
   * @param chatId Unique identifier for the target chat
   * @param video Video to send
   * @param options Additional Telegram query options
   * @param fileOptions Optional file related meta-data
   * @see https://core.telegram.org/bots/api#sendvideo
   */
  async sendVideo(
    chatId: number | string,
    video: BotTypes.FileInput,
    options: Record<string, unknown> = {},
    fileOptions: { filename?: string; contentType?: string } = {}
  ): Promise<unknown> {
    const opts: { qs: Record<string, unknown>; formData: Record<string, unknown> | null } = {
      qs: options,
      formData: null,
    };
    opts.qs.chat_id = chatId;
    try {
      const sendData = await this._formatSendData('video', video, fileOptions);
      opts.formData = sendData[0];
      opts.qs.video = sendData[1];
      await this._fixAddFileThumbnail(options as { thumb?: string }, opts);
    } catch (ex) {
      return Promise.reject(ex);
    }
    return this._request('sendVideo', opts);
  }

  /**
   * Send animation files (GIF or H.264/MPEG-4 AVC video without sound)
   * @param chatId Unique identifier for the target chat
   * @param animation Animation to send
   * @param options Additional Telegram query options
   * @param fileOptions Optional file related meta-data
   * @see https://core.telegram.org/bots/api#sendanimation
   */
  async sendAnimation(
    chatId: number | string,
    animation: BotTypes.FileInput,
    options: Record<string, unknown> = {},
    fileOptions: { filename?: string; contentType?: string } = {}
  ): Promise<unknown> {
    const opts: { qs: Record<string, unknown>; formData?: Record<string, unknown> | null } = {
      qs: options,
    };
    opts.qs.chat_id = chatId;
    try {
      const sendData = await this._formatSendData('animation', animation, fileOptions);
      opts.formData = sendData[0];
      opts.qs.animation = sendData[1];
    } catch (ex) {
      return Promise.reject(ex);
    }
    return this._request('sendAnimation', opts);
  }

  /**
   * Send voice messages (OGG format with OPUS encoding, or MP3/M4A)
   * @param chatId Unique identifier for the target chat
   * @param voice Voice file to send
   * @param options Additional Telegram query options
   * @param fileOptions Optional file related meta-data
   * @see https://core.telegram.org/bots/api#sendvoice
   */
  async sendVoice(
    chatId: number | string,
    voice: BotTypes.FileInput,
    options: Record<string, unknown> = {},
    fileOptions: { filename?: string; contentType?: string } = {}
  ): Promise<unknown> {
    const opts: { qs: Record<string, unknown>; formData?: Record<string, unknown> | null } = {
      qs: options,
    };
    opts.qs.chat_id = chatId;
    try {
      const sendData = await this._formatSendData('voice', voice, fileOptions);
      opts.formData = sendData[0];
      opts.qs.voice = sendData[1];
    } catch (ex) {
      return Promise.reject(ex);
    }
    return this._request('sendVoice', opts);
  }

  /**
   * Send video messages (rounded square MPEG4 videos up to 1 minute long)
   * @param chatId Unique identifier for the target chat
   * @param videoNote Video note to send
   * @param options Additional Telegram query options
   * @param fileOptions Optional file related meta-data
   * @see https://core.telegram.org/bots/api#sendvideonote
   */
  async sendVideoNote(
    chatId: number | string,
    videoNote: BotTypes.FileInput,
    options: Record<string, unknown> = {},
    fileOptions: { filename?: string; contentType?: string } = {}
  ): Promise<unknown> {
    const opts: { qs: Record<string, unknown>; formData: Record<string, unknown> | null } = {
      qs: options,
      formData: null,
    };
    opts.qs.chat_id = chatId;
    try {
      const sendData = await this._formatSendData('video_note', videoNote, fileOptions);
      opts.formData = sendData[0];
      opts.qs.video_note = sendData[1];
      await this._fixAddFileThumbnail(options as { thumb?: string }, opts);
    } catch (ex) {
      return Promise.reject(ex);
    }
    return this._request('sendVideoNote', opts);
  }

  /**
   * Send stickers (.WEBP, .TGS, or .WEBM format)
   * @param chatId Unique identifier for the target chat
   * @param sticker Sticker to send
   * @param options Additional Telegram query options
   * @param fileOptions Optional file related meta-data
   * @see https://core.telegram.org/bots/api#sendsticker
   */
  async sendSticker(
    chatId: number | string,
    sticker: BotTypes.FileInput,
    options: Record<string, unknown> = {},
    fileOptions: { filename?: string; contentType?: string } = {}
  ): Promise<unknown> {
    const opts: { qs: Record<string, unknown>; formData?: Record<string, unknown> | null } = {
      qs: options,
    };
    opts.qs.chat_id = chatId;
    try {
      const sendData = await this._formatSendData('sticker', sticker, fileOptions);
      opts.formData = sendData[0];
      opts.qs.sticker = sendData[1];
    } catch (ex) {
      return Promise.reject(ex);
    }
    return this._request('sendSticker', opts);
  }

  /**
   * Send a game
   * @param chatId Unique identifier for the target chat
   * @param gameShortName Short name of the game
   * @param options Additional Telegram query options
   * @see https://core.telegram.org/bots/api#sendgame
   */
  sendGame(
    chatId: number | string,
    gameShortName: string,
    options: Record<string, unknown> = {}
  ): Promise<unknown> {
    return this._request('sendGame', {
      form: { chat_id: chatId, game_short_name: gameShortName, ...options },
    });
  }

  /**
   * Send media group (album of photos and videos)
   * @param chatId Unique identifier for the target chat
   * @param media Array of InputMedia to be sent
   * @param options Additional Telegram query options
   * @see https://core.telegram.org/bots/api#sendmediagroup
   */
  async sendMediaGroup(
    chatId: number | string,
    media: unknown[],
    options: Record<string, unknown> = {}
  ): Promise<unknown> {
    const opts: { qs: Record<string, unknown>; formData?: Record<string, unknown> } = {
      qs: options,
    };
    opts.qs.chat_id = chatId;

    opts.formData = {};
    const inputMedia: unknown[] = [];
    let index = 0;
    for (const input of media) {
      const payload = Object.assign({}, input as Record<string, unknown>);
      delete payload.media;
      delete payload.fileOptions;
      try {
        const attachName = String(index);
        const [formData, fileId] = await this._formatSendData(
          attachName,
          (input as { media: unknown }).media as BotTypes.FileInput,
          (input as { fileOptions?: { filename?: string; contentType?: string } }).fileOptions
        );
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

  /**
   * Send location on the map
   * @param chatId Unique identifier for the target chat
   * @param latitude Latitude of location
   * @param longitude Longitude of location
   * @param options Additional Telegram query options
   * @see https://core.telegram.org/bots/api#sendlocation
   */
  sendLocation(
    chatId: number | string,
    latitude: number,
    longitude: number,
    options: Record<string, unknown> = {}
  ): Promise<unknown> {
    const form = { chat_id: chatId, latitude, longitude, ...options };
    return this._request('sendLocation', { form });
  }

  /**
   * Edit live location messages
   * @param latitude Latitude of new location
   * @param longitude Longitude of new location
   * @param options Additional Telegram query options
   * @see https://core.telegram.org/bots/api#editmessagelivelocation
   */
  editMessageLiveLocation(
    latitude: number,
    longitude: number,
    options: Record<string, unknown> = {}
  ): Promise<unknown> {
    const form = { latitude, longitude, ...options };
    return this._request('editMessageLiveLocation', { form });
  }

  /**
   * Stop updating live location
   * @param options Additional Telegram query options
   * @see https://core.telegram.org/bots/api#stopmessagelivelocation
   */
  stopMessageLiveLocation(options: Record<string, unknown> = {}): Promise<unknown> {
    return this._request('stopMessageLiveLocation', { form: options });
  }

  /**
   * Send venue information
   * @param chatId Unique identifier for the target chat
   * @param latitude Latitude of location
   * @param longitude Longitude of location
   * @param title Name of the venue
   * @param address Address of the venue
   * @param options Additional Telegram query options
   * @see https://core.telegram.org/bots/api#sendvenue
   */
  sendVenue(
    chatId: number | string,
    latitude: number,
    longitude: number,
    title: string,
    address: string,
    options: Record<string, unknown> = {}
  ): Promise<unknown> {
    const form = { chat_id: chatId, latitude, longitude, title, address, ...options };
    return this._request('sendVenue', { form });
  }

  /**
   * Send phone contacts
   * @param chatId Unique identifier for the target chat
   * @param phoneNumber Contact's phone number
   * @param firstName Contact's first name
   * @param options Additional Telegram query options
   * @see https://core.telegram.org/bots/api#sendcontact
   */
  sendContact(
    chatId: number | string,
    phoneNumber: string,
    firstName: string,
    options: Record<string, unknown> = {}
  ): Promise<unknown> {
    const form = { chat_id: chatId, phone_number: phoneNumber, first_name: firstName, ...options };
    return this._request('sendContact', { form });
  }

  /**
   * Send a native poll
   * @param chatId Unique identifier for the target chat
   * @param question Poll question
   * @param pollOptions Array of answer options
   * @param options Additional Telegram query options
   * @see https://core.telegram.org/bots/api#sendpoll
   */
  sendPoll(
    chatId: number | string,
    question: string,
    pollOptions: string[],
    options: Record<string, unknown> = {}
  ): Promise<unknown> {
    const form = { chat_id: chatId, question, options: JSON.stringify(pollOptions), ...options };
    return this._request('sendPoll', { form });
  }

  /**
   * Send an animated emoji (dice, dart, basketball, etc.)
   * @param chatId Unique identifier for the target chat
   * @param options Additional Telegram query options
   * @see https://core.telegram.org/bots/api#senddice
   */
  sendDice(chatId: number | string, options: Record<string, unknown> = {}): Promise<unknown> {
    const form = { chat_id: chatId, ...options };
    return this._request('sendDice', { form });
  }

  /**
   * Send chat action (typing, uploading, etc.)
   * @param chatId Unique identifier for the target chat
   * @param action Type of action to broadcast
   * @param options Additional Telegram query options
   * @see https://core.telegram.org/bots/api#sendchataction
   */
  sendChatAction(
    chatId: number | string,
    action: string,
    options: Record<string, unknown> = {}
  ): Promise<unknown> {
    const form = { chat_id: chatId, action, ...options };
    return this._request('sendChatAction', { form });
  }

  /**
   * Get user profile photos
   * @param userId Unique identifier of the target user
   * @param options Additional Telegram query options
   * @see https://core.telegram.org/bots/api#getuserprofilephotos
   */
  getUserProfilePhotos(userId: number, options: Record<string, unknown> = {}): Promise<unknown> {
    const form = { user_id: userId, ...options };
    return this._request('getUserProfilePhotos', { form });
  }

  /**
   * Get basic info about a file
   * @param fileId File identifier
   * @param options Additional Telegram query options
   * @see https://core.telegram.org/bots/api#getfile
   */
  getFile(fileId: string, options: Record<string, unknown> = {}): Promise<unknown> {
    const form = { file_id: fileId, ...options };
    return this._request('getFile', { form });
  }

  /**
   * Use this method to edit text messages
   * @param text New text of the message
   * @param options Additional Telegram query options
   * @see https://core.telegram.org/bots/api#editmessagetext
   */
  editMessageText(text: string, options: Record<string, unknown> = {}): Promise<unknown> {
    const form = { text, ...options };
    return this._request('editMessageText', { form });
  }

  /**
   * Use this method to edit captions of messages
   * @param caption New caption of the message
   * @param options Additional Telegram query options
   * @see https://core.telegram.org/bots/api#editmessagecaption
   */
  editMessageCaption(caption: string, options: Record<string, unknown> = {}): Promise<unknown> {
    const form = { caption, ...options };
    return this._request('editMessageCaption', { form });
  }

  /**
   * Use this method to edit message reply markup
   * @param replyMarkup A JSON-serialized object for an inline keyboard
   * @param options Additional Telegram query options
   * @see https://core.telegram.org/bots/api#editmessagereplymarkup
   */
  editMessageReplyMarkup(
    replyMarkup: unknown,
    options: Record<string, unknown> = {}
  ): Promise<unknown> {
    const form = { reply_markup: replyMarkup, ...options };
    return this._request('editMessageReplyMarkup', { form });
  }

  /**
   * Use this method to delete a message
   * @param chatId Unique identifier for the target chat
   * @param messageId Identifier of the message to delete
   * @param options Additional Telegram query options
   * @see https://core.telegram.org/bots/api#deletemessage
   */
  deleteMessage(
    chatId: number | string,
    messageId: number,
    options: Record<string, unknown> = {}
  ): Promise<unknown> {
    const form = { chat_id: chatId, message_id: messageId, ...options };
    return this._request('deleteMessage', { form });
  }

  /**
   * Use this method to send answers to callback queries
   * @param callbackQueryId Unique identifier for the query to be answered
   * @param options Additional Telegram query options
   * @see https://core.telegram.org/bots/api#answercallbackquery
   */
  answerCallbackQuery(
    callbackQueryId: string,
    options: Record<string, unknown> = {}
  ): Promise<unknown> {
    const form = { callback_query_id: callbackQueryId, ...options };
    return this._request('answerCallbackQuery', { form });
  }
}
