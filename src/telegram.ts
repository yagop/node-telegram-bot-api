/// <reference types="node" />

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { URL } from 'url';
import * as stream from 'stream';
import * as qs from 'querystring';
import * as debug from 'debug';
import fetch from 'node-fetch';

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

  private _fixAddFileThumbnail(
    options: { thumb?: string },
    opts: { formData: Record<string, unknown> | null; qs: Record<string, unknown> }
  ): void {
    if (options.thumb) {
      if (opts.formData === null) {
        opts.formData = {};
      }

      const attachName = 'photo';
      const [formData] = this._formatSendData(attachName, options.thumb.replace('attach://', ''));

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
      // TODO: why can't we do `error instanceof errors.BaseError`?
      if (error instanceof errors.ParseError || error instanceof errors.TelegramError) throw error;
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
  private _formatSendData(
    type: string,
    data: BotTypes.FileInput,
    fileOptions: { filename?: string; contentType?: string } = {}
  ): [
    Record<
      string,
      { value: BotTypes.FileInput; options: { filename: string; contentType: string } }
    > | null,
    string | null,
  ] {
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
        // const filetype = fileType(data);
        // if (filetype) {
        //   contentType = filetype.mime;
        //   const ext = filetype.ext;
        //   if (ext && !process.env.NTBA_FIX_350) {
        //     filename = `${filename}.${ext}`;
        //   }
        // } else if (!process.env.NTBA_FIX_350) {
        //   deprecateFunction(`An error will no longer be thrown if file-type of buffer could not be detected. ${deprecationMessage}`);
        //   throw new errors.FatalError('Unsupported Buffer file-type');
        // }
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

    // TODO: Add missing file extension.

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

  // Basic API methods for testing
  sendPhoto(chatId: number | string, photo: unknown, options?: Record<string, unknown>): Promise<unknown> {
    return this._request('sendPhoto', { form: { chat_id: chatId, photo, ...options } });
  }

  sendMessage(chatId: number | string, text: string, options?: Record<string, unknown>): Promise<unknown> {
    return this._request('sendMessage', { form: { chat_id: chatId, text, ...options } });
  }

  sendGame(chatId: number | string, gameShortName: string, options?: Record<string, unknown>): Promise<unknown> {
    return this._request('sendGame', { form: { chat_id: chatId, game_short_name: gameShortName, ...options } });
  }

  getMe(): Promise<unknown> {
    return this._request('getMe');
  }

  getChat(chatId: number | string): Promise<unknown> {
    return this._request('getChat', { qs: { chat_id: chatId } });
  }
}
