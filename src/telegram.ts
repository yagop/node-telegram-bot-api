import createDebug from "./internal/debug.js";
import { EventEmitter } from "node:events";
import { createWriteStream, type WriteStream } from "node:fs";
import path from "node:path";
import { Readable, PassThrough } from "node:stream";
import { pipeline } from "node:stream/promises";

import { FatalError } from "./errors.js";
import { HttpClient, type HttpClientOptions, type RequestOptions } from "./http.js";
import { TelegramBotPolling, type PollingOptions, type PollingStartOptions, type PollingStopOptions } from "./polling.js";
import { TelegramBotWebHook, type WebHookOptions } from "./webhook.js";
import { prepareFile, prepareFiles, stringify, type FileInput, type FileMeta, type PreparedFile } from "./utils.js";
import {
  MESSAGE_TYPES,
  type ChatId,
  type MessageType,
  type Update,
  type User,
  type Message,
  type MessageId,
  type WebhookInfo,
  type Chat,
  type ChatMember,
  type ChatInviteLink,
  type ForumTopic,
  type UserProfilePhotos,
  type File as TelegramFile,
  type Sticker,
  type StickerSet,
  type Poll,
  type BotCommand,
  type ChatJoinRequest,
  type InputProfilePhoto,
} from "./types/schemas.js";

import type {
  GetUpdatesOptions,
  SetWebHookOptions,
  SendMessageOptions,
  ForwardMessageOptions,
  ForwardMessagesOptions,
  CopyMessageOptions,
  CopyMessagesOptions,
  SendPhotoOptions,
  SendLivePhotoOptions,
  SendAudioOptions,
  SendDocumentOptions,
  SendVideoOptions,
  SendAnimationOptions,
  SendVoiceOptions,
  SendVideoNoteOptions,
  SendLocationOptions,
  SendVenueOptions,
  SendContactOptions,
  SendPollOptions,
  SendDiceOptions,
  SendChatActionOptions,
  AnswerCallbackQueryOptions,
  AnswerInlineQueryOptions,
  SendInvoiceOptions,
} from "./types/options.js";

import * as errors from "./errors.js";

const debug = createDebug("node-telegram-bot-api");

export interface TelegramBotOptions {
  /** Enable polling. `true` uses defaults; an object passes options through to `TelegramBotPolling`. */
  polling?: boolean | PollingOptions;
  /** Enable webhook. `true` uses defaults; an object passes options through to `TelegramBotWebHook`. */
  webHook?: boolean | WebHookOptions;
  /** Telegram API base URL — useful for proxying or testing against a mock server. */
  baseApiUrl?: string;
  /** Use Telegram's test environment (`/bot<token>/test/...`). */
  testEnvironment?: boolean;
  /** When true, treat string file arguments that resolve to existing paths as filesystem files. */
  filepath?: boolean;
  /** Additional HTTP request defaults (timeouts, headers). */
  request?: HttpClientOptions["request"];
  /** Stop processing further regex listeners after the first match. */
  onlyFirstMatch?: boolean;
  /** Forward-compat flag: see `TelegramBotPolling._poll()` for details. */
  badRejection?: boolean;
}

interface TextRegexpEntry {
  regexp: RegExp;
  callback: (msg: Message, match: RegExpExecArray | null) => void;
}

interface ReplyListenerEntry {
  id: number;
  chatId: ChatId;
  messageId: number;
  callback: (msg: Message) => void;
}

const _deprecatedMessageTypes = ["new_chat_participant", "left_chat_participant"];

/**
 * The TelegramBot class is the main entry point of the library. It provides
 * methods that map 1:1 to the Telegram Bot API and emits events for incoming
 * updates received via either long polling or a webhook server.
 *
 * @example
 * ```ts
 * const bot = new TelegramBot(token, { polling: true });
 * bot.on('message', msg => bot.sendMessage(msg.chat.id, 'echo: ' + msg.text));
 * ```
 */
export class TelegramBot extends EventEmitter {
  /** Static reference to the error classes the library throws. */
  static readonly errors = errors;

  /** The set of message-type events the library understands. */
  static readonly messageTypes: readonly MessageType[] = MESSAGE_TYPES;

  /** The Telegram Bot API token. */
  public readonly token: string;
  /** The bot configuration as supplied at construction time. */
  public readonly options: TelegramBotOptions;
  /** Underlying HTTP client. Accessible for advanced extensions. */
  public readonly http: HttpClient;

  private _polling: TelegramBotPolling | null = null;
  private _webHook: TelegramBotWebHook | null = null;
  private _textRegexpCallbacks: TextRegexpEntry[] = [];
  private _replyListenerId = 0;
  private _replyListeners: ReplyListenerEntry[] = [];

  constructor(token: string, options: TelegramBotOptions = {}) {
    super();
    this.token = token;
    this.options = {
      ...options,
      polling: options.polling ?? false,
      webHook: options.webHook ?? false,
      baseApiUrl: options.baseApiUrl ?? "https://api.telegram.org",
      filepath: options.filepath ?? true,
      badRejection: options.badRejection ?? false,
    };

    this.http = new HttpClient(token, {
      baseApiUrl: this.options.baseApiUrl,
      testEnvironment: this.options.testEnvironment,
      request: this.options.request,
    });

    if (this.options.polling) {
      const pollingOpts = typeof this.options.polling === "boolean" ? {} : this.options.polling;
      const autoStart = pollingOpts.autoStart ?? true;
      this._polling = new TelegramBotPolling(this, pollingOpts);
      if (autoStart) void this._polling.start();
    }

    if (this.options.webHook) {
      const webhookOpts = typeof this.options.webHook === "boolean" ? {} : this.options.webHook;
      const autoOpen = webhookOpts.autoOpen ?? true;
      this._webHook = new TelegramBotWebHook(this, webhookOpts);
      if (autoOpen) void this._webHook.open();
    }
  }

  override on(event: string | symbol, listener: (...args: unknown[]) => void): this {
    if (_deprecatedMessageTypes.includes(event as string)) {
      const url = "https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#events";
      // eslint-disable-next-line no-console
      console.warn(`Events ${_deprecatedMessageTypes.join(",")} are deprecated. See: ${url}`);
    }
    return super.on(event, listener);
  }

  // --- internal helpers ---------------------------------------------------

  private _request<T>(method: string, opts: RequestOptions = {}): Promise<T> {
    if (opts.form) {
      this._fixReplyMarkup(opts.form);
      this._fixEntitiesField(opts.form);
      this._fixReplyParameters(opts.form);
      this._fixMessageIds(opts.form);
    }
    if (opts.qs) {
      this._fixReplyMarkup(opts.qs);
      this._fixReplyParameters(opts.qs);
    }
    return this.http.request<T>(method, opts);
  }

  private _fixReplyMarkup(obj: Record<string, unknown>): void {
    const replyMarkup = obj.reply_markup;
    if (replyMarkup && typeof replyMarkup !== "string") {
      obj.reply_markup = stringify(replyMarkup);
    }
  }

  private _fixEntitiesField(obj: Record<string, unknown>): void {
    for (const key of ["entities", "caption_entities", "explanation_entities"] as const) {
      const value = obj[key];
      if (value && typeof value !== "string") obj[key] = stringify(value);
    }
  }

  private _fixReplyParameters(obj: Record<string, unknown>): void {
    if (
      Object.prototype.hasOwnProperty.call(obj, "reply_parameters") &&
      typeof obj.reply_parameters !== "string"
    ) {
      obj.reply_parameters = stringify(obj.reply_parameters);
    }
  }

  private _fixMessageIds(obj: Record<string, unknown>): void {
    const messageIds = obj.message_ids;
    if (messageIds && typeof messageIds !== "string") {
      obj.message_ids = stringify(messageIds);
    }
  }

  /** Submit a request whose body is a flat form. Internal helper. */
  private _form<T>(method: string, form: Record<string, unknown>): Promise<T> {
    return this._request<T>(method, { form });
  }

  /**
   * Common pattern: a method that uploads exactly one file (sendPhoto / sendAudio / etc).
   * Falls back to a string when `data` is a Telegram fileId or HTTPS URL.
   */
  private async _sendFile<T>(
    method: string,
    fieldName: string,
    data: FileInput,
    qs: Record<string, unknown>,
    fileMeta: FileMeta = {},
    extraThumbnail?: { thumbnail?: FileInput; thumb?: FileInput },
  ): Promise<T> {
    const opts: RequestOptions = { qs };
    const { file, fileId } = await prepareFile(data, fileMeta, this.options.filepath);
    if (file) {
      opts.formData = { [fieldName]: file };
    } else if (fileId) {
      qs[fieldName] = fileId;
    }
    if (extraThumbnail) {
      const candidate = extraThumbnail.thumbnail ?? extraThumbnail.thumb;
      if (candidate) {
        const { file: thumbFile, fileId: thumbId } = await prepareFile(candidate, {}, this.options.filepath);
        if (thumbFile) {
          opts.formData = opts.formData ?? {};
          opts.formData["thumbnail"] = thumbFile;
          qs.thumbnail = "attach://thumbnail";
        } else if (thumbId) {
          qs.thumbnail = thumbId;
        }
      }
    }
    return this._request<T>(method, opts);
  }

  // --- High-level lifecycle ----------------------------------------------

  /** Start polling. */
  async startPolling(options: PollingStartOptions = {}): Promise<void> {
    if (this.hasOpenWebHook()) {
      throw new FatalError("Polling and WebHook are mutually exclusive");
    }
    if (!this._polling) {
      const pollingOpts = typeof this.options.polling === "object" ? this.options.polling : {};
      this._polling = new TelegramBotPolling(this, pollingOpts);
    }
    return this._polling.start({ restart: options.restart ?? false });
  }

  /** Stop polling. */
  async stopPolling(options: PollingStopOptions = {}): Promise<void> {
    if (!this._polling) return;
    return this._polling.stop(options);
  }

  isPolling(): boolean {
    return this._polling?.isPolling() ?? false;
  }

  async openWebHook(): Promise<void> {
    if (this.isPolling()) throw new FatalError("WebHook and Polling are mutually exclusive");
    if (!this._webHook) {
      const webhookOpts = typeof this.options.webHook === "object" ? this.options.webHook : {};
      this._webHook = new TelegramBotWebHook(this, webhookOpts);
    }
    return this._webHook.open();
  }

  async closeWebHook(): Promise<void> {
    if (!this._webHook) return;
    return this._webHook.close();
  }

  hasOpenWebHook(): boolean {
    return this._webHook?.isOpen() ?? false;
  }

  // --- Reply / regexp listeners ------------------------------------------

  onText(regexp: RegExp | string, callback: TextRegexpEntry["callback"]): void {
    const compiled = regexp instanceof RegExp ? regexp : new RegExp(regexp);
    this._textRegexpCallbacks.push({ regexp: compiled, callback });
  }

  removeTextListener(regexp: RegExp | string): TextRegexpEntry | null {
    const index = this._textRegexpCallbacks.findIndex((listener) => String(listener.regexp) === String(regexp));
    if (index === -1) return null;
    return this._textRegexpCallbacks.splice(index, 1)[0] ?? null;
  }

  clearTextListeners(): void {
    this._textRegexpCallbacks = [];
  }

  onReplyToMessage(chatId: ChatId, messageId: number, callback: ReplyListenerEntry["callback"]): number {
    const id = ++this._replyListenerId;
    this._replyListeners.push({ id, chatId, messageId, callback });
    return id;
  }

  removeReplyListener(replyListenerId: number): ReplyListenerEntry | null {
    const index = this._replyListeners.findIndex((entry) => entry.id === replyListenerId);
    if (index === -1) return null;
    return this._replyListeners.splice(index, 1)[0] ?? null;
  }

  clearReplyListeners(): ReplyListenerEntry[] {
    const removed = this._replyListeners;
    this._replyListeners = [];
    return removed;
  }

  // --- Update processing -------------------------------------------------

  /**
   * Dispatch a single Update. Use this if you obtain updates from a source other
   * than this library's polling/webhook (e.g. AWS Lambda, custom proxy, tests).
   */
  processUpdate(update: Update): void {
    debug("Process Update %j", update);
    const m = update.message;
    if (m) {
      const metadata = { type: TelegramBot.messageTypes.find((t) => (m as Record<string, unknown>)[t]) };
      this.emit("message", m, metadata);
      if (metadata.type) this.emit(metadata.type, m, metadata);
      if (m.text) {
        for (const reg of this._textRegexpCallbacks) {
          const result = reg.regexp.exec(m.text);
          if (!result) continue;
          reg.regexp.lastIndex = 0;
          reg.callback(m, result);
          if (this.options.onlyFirstMatch) break;
        }
      }
      if (m.reply_to_message) {
        for (const reply of this._replyListeners) {
          if (reply.chatId === m.chat.id && reply.messageId === m.reply_to_message.message_id) {
            reply.callback(m);
          }
        }
      }
      return;
    }
    const direct: { key: keyof Update; event: string }[] = [
      { key: "edited_message", event: "edited_message" },
      { key: "channel_post", event: "channel_post" },
      { key: "edited_channel_post", event: "edited_channel_post" },
      { key: "business_connection", event: "business_connection" },
      { key: "business_message", event: "business_message" },
      { key: "edited_business_message", event: "edited_business_message" },
      { key: "deleted_business_messages", event: "deleted_business_messages" },
      { key: "message_reaction", event: "message_reaction" },
      { key: "message_reaction_count", event: "message_reaction_count" },
      { key: "inline_query", event: "inline_query" },
      { key: "chosen_inline_result", event: "chosen_inline_result" },
      { key: "callback_query", event: "callback_query" },
      { key: "shipping_query", event: "shipping_query" },
      { key: "pre_checkout_query", event: "pre_checkout_query" },
      { key: "purchased_paid_media", event: "purchased_paid_media" },
      { key: "poll", event: "poll" },
      { key: "poll_answer", event: "poll_answer" },
      { key: "chat_member", event: "chat_member" },
      { key: "my_chat_member", event: "my_chat_member" },
      { key: "chat_join_request", event: "chat_join_request" },
      { key: "chat_boost", event: "chat_boost" },
      { key: "removed_chat_boost", event: "removed_chat_boost" },
    ];
    for (const { key, event } of direct) {
      const value = update[key];
      if (value !== undefined) {
        debug("Process Update %s %j", event, value);
        this.emit(event, value);
        // Special-case sub-events for edited messages
        if (event === "edited_message") {
          const em = value as Message;
          if (em.text) this.emit("edited_message_text", em);
          if (em.caption) this.emit("edited_message_caption", em);
        }
        if (event === "edited_channel_post") {
          const ep = value as Message;
          if (ep.text) this.emit("edited_channel_post_text", ep);
          if (ep.caption) this.emit("edited_channel_post_caption", ep);
        }
        return;
      }
    }
  }

  // ===================================================================
  // Telegram Bot API methods
  // ===================================================================

  // --- Files & downloads -------------------------------------------------

  /** Resolve a file id to the public download URL on Telegram's servers. */
  async getFileLink(fileId: string, options: Record<string, unknown> = {}): Promise<string> {
    const file = await this.getFile(fileId, options);
    return `${this.options.baseApiUrl}/file/bot${this.token}/${file.file_path}`;
  }

  /**
   * Stream the contents of a Telegram file. The returned stream emits an `info`
   * event with the resolved URI before the bytes start flowing.
   */
  getFileStream(fileId: string, options: Record<string, unknown> = {}): NodeJS.ReadableStream & { path: string } {
    const out = new PassThrough() as PassThrough & { path: string };
    out.path = fileId;
    void (async () => {
      try {
        const uri = await this.getFileLink(fileId, options);
        out.emit("info", { uri });
        const response = await fetch(uri);
        if (!response.ok || !response.body) {
          throw new FatalError(`Failed to fetch file: HTTP ${response.status}`);
        }
        await pipeline(Readable.fromWeb(response.body as never), out);
      } catch (err) {
        out.emit("error", err);
      }
    })();
    return out;
  }

  /**
   * Download a Telegram file to a local directory and resolve to the resulting path.
   */
  async downloadFile(fileId: string, downloadDir: string, options: Record<string, unknown> = {}): Promise<string> {
    const uri = await this.getFileLink(fileId, options);
    const fileName = uri.slice(uri.lastIndexOf("/") + 1);
    const filePath = path.join(downloadDir, fileName);
    const response = await fetch(uri);
    if (!response.ok || !response.body) {
      throw new FatalError(`Failed to download file: HTTP ${response.status}`);
    }
    const out: WriteStream = createWriteStream(filePath);
    await pipeline(Readable.fromWeb(response.body as never), out);
    return filePath;
  }

  // --- Updates / webhook -------------------------------------------------

  getUpdates(form: GetUpdatesOptions = {}): Promise<Update[]> {
    if (form.allowed_updates && Array.isArray(form.allowed_updates)) {
      form.allowed_updates = stringify(form.allowed_updates);
    }
    return this._form("getUpdates", form);
  }

  async setWebHook(url: string, options: SetWebHookOptions = {}, fileOptions: FileMeta = {}): Promise<boolean> {
    const { certificate, ...rest } = options;
    const qs: Record<string, unknown> = { ...rest, url };
    if (Array.isArray(qs.allowed_updates)) qs.allowed_updates = stringify(qs.allowed_updates);
    if (certificate) {
      const { file, fileId } = await prepareFile(certificate, fileOptions, this.options.filepath);
      if (file) {
        return this._request("setWebHook", { qs, formData: { certificate: file } });
      }
      qs.certificate = fileId;
    }
    return this._request("setWebHook", { qs });
  }

  deleteWebHook(form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("deleteWebhook", form);
  }

  getWebHookInfo(form: Record<string, unknown> = {}): Promise<WebhookInfo> {
    return this._form("getWebhookInfo", form);
  }

  // --- Bot identity ------------------------------------------------------

  getMe(form: Record<string, unknown> = {}): Promise<User> {
    return this._form("getMe", form);
  }

  logOut(form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("logOut", form);
  }

  close(form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("close", form);
  }

  // --- Messages ----------------------------------------------------------

  sendMessage(chatId: ChatId, text: string, form: SendMessageOptions = {}): Promise<Message> {
    return this._form("sendMessage", { ...form, chat_id: chatId, text });
  }

  forwardMessage(
    chatId: ChatId,
    fromChatId: ChatId,
    messageId: number,
    form: ForwardMessageOptions = {},
  ): Promise<Message> {
    return this._form("forwardMessage", {
      ...form,
      chat_id: chatId,
      from_chat_id: fromChatId,
      message_id: messageId,
    });
  }

  forwardMessages(
    chatId: ChatId,
    fromChatId: ChatId,
    messageIds: number[],
    form: ForwardMessagesOptions = {},
  ): Promise<MessageId[]> {
    return this._form("forwardMessages", {
      ...form,
      chat_id: chatId,
      from_chat_id: fromChatId,
      message_ids: messageIds,
    });
  }

  copyMessage(
    chatId: ChatId,
    fromChatId: ChatId,
    messageId: number,
    form: CopyMessageOptions = {},
  ): Promise<MessageId> {
    return this._form("copyMessage", {
      ...form,
      chat_id: chatId,
      from_chat_id: fromChatId,
      message_id: messageId,
    });
  }

  copyMessages(
    chatId: ChatId,
    fromChatId: ChatId,
    messageIds: number[],
    form: CopyMessagesOptions = {},
  ): Promise<MessageId[]> {
    return this._form("copyMessages", {
      ...form,
      chat_id: chatId,
      from_chat_id: fromChatId,
      message_ids: stringify(messageIds),
    });
  }

  // --- Send file methods -------------------------------------------------

  sendPhoto(
    chatId: ChatId,
    photo: FileInput,
    options: SendPhotoOptions = {},
    fileOptions: FileMeta = {},
  ): Promise<Message> {
    return this._sendFile("sendPhoto", "photo", photo, { ...options, chat_id: chatId }, fileOptions);
  }

  sendAudio(
    chatId: ChatId,
    audio: FileInput,
    options: SendAudioOptions = {},
    fileOptions: FileMeta = {},
  ): Promise<Message> {
    return this._sendFile(
      "sendAudio",
      "audio",
      audio,
      { ...options, chat_id: chatId },
      fileOptions,
      { thumbnail: options.thumbnail as FileInput | undefined, thumb: options.thumb as FileInput | undefined },
    );
  }

  sendDocument(
    chatId: ChatId,
    doc: FileInput,
    options: SendDocumentOptions = {},
    fileOptions: FileMeta = {},
  ): Promise<Message> {
    return this._sendFile(
      "sendDocument",
      "document",
      doc,
      { ...options, chat_id: chatId },
      fileOptions,
      { thumbnail: options.thumbnail as FileInput | undefined, thumb: options.thumb as FileInput | undefined },
    );
  }

  sendVideo(
    chatId: ChatId,
    video: FileInput,
    options: SendVideoOptions = {},
    fileOptions: FileMeta = {},
  ): Promise<Message> {
    return this._sendFile(
      "sendVideo",
      "video",
      video,
      { ...options, chat_id: chatId },
      fileOptions,
      { thumbnail: options.thumbnail as FileInput | undefined, thumb: options.thumb as FileInput | undefined },
    );
  }

  sendAnimation(
    chatId: ChatId,
    animation: FileInput,
    options: SendAnimationOptions = {},
    fileOptions: FileMeta = {},
  ): Promise<Message> {
    return this._sendFile("sendAnimation", "animation", animation, { ...options, chat_id: chatId }, fileOptions);
  }

  sendVoice(
    chatId: ChatId,
    voice: FileInput,
    options: SendVoiceOptions = {},
    fileOptions: FileMeta = {},
  ): Promise<Message> {
    return this._sendFile("sendVoice", "voice", voice, { ...options, chat_id: chatId }, fileOptions);
  }

  sendVideoNote(
    chatId: ChatId,
    videoNote: FileInput,
    options: SendVideoNoteOptions = {},
    fileOptions: FileMeta = {},
  ): Promise<Message> {
    return this._sendFile(
      "sendVideoNote",
      "video_note",
      videoNote,
      { ...options, chat_id: chatId },
      fileOptions,
      { thumbnail: options.thumbnail as FileInput | undefined, thumb: options.thumb as FileInput | undefined },
    );
  }

  async sendPaidMedia(
    chatId: ChatId,
    starCount: number,
    media: Array<{ type: string; media: FileInput; fileOptions?: FileMeta; [key: string]: unknown }>,
    options: Record<string, unknown> = {},
  ): Promise<Message> {
    const qs: Record<string, unknown> = { ...options, chat_id: chatId, star_count: starCount };
    const { formData, fileIds } = await prepareFiles("media", media, {}, this.options.filepath);
    const inputPaidMedia = media.map((item, index) => {
      const copy: Record<string, unknown> = { ...item };
      delete copy.fileOptions;
      copy.media = fileIds[index] ?? `attach://media_${index}`;
      return copy;
    });
    qs.media = stringify(inputPaidMedia);
    return this._request("sendPaidMedia", { qs, formData });
  }

  async sendMediaGroup(
    chatId: ChatId,
    media: Array<{ media: FileInput; fileOptions?: FileMeta; [key: string]: unknown }>,
    options: Record<string, unknown> = {},
  ): Promise<Message[]> {
    const qs: Record<string, unknown> = { ...options, chat_id: chatId };
    const formData: Record<string, PreparedFile> = {};
    const inputMedia: Record<string, unknown>[] = [];
    for (let index = 0; index < media.length; index++) {
      const input = media[index]!;
      const payload: Record<string, unknown> = { ...input };
      delete payload.media;
      delete payload.fileOptions;
      const attachName = String(index);
      const { file, fileId } = await prepareFile(input.media, input.fileOptions, this.options.filepath);
      if (file) {
        formData[attachName] = file;
        payload.media = `attach://${attachName}`;
      } else {
        payload.media = fileId;
      }
      inputMedia.push(payload);
    }
    qs.media = stringify(inputMedia);
    return this._request("sendMediaGroup", { qs, formData });
  }

  sendLocation(chatId: ChatId, latitude: number, longitude: number, form: SendLocationOptions = {}): Promise<Message> {
    return this._form("sendLocation", { ...form, chat_id: chatId, latitude, longitude });
  }

  editMessageLiveLocation(
    latitude: number,
    longitude: number,
    form: Record<string, unknown> = {},
  ): Promise<Message | boolean> {
    return this._form("editMessageLiveLocation", { ...form, latitude, longitude });
  }

  stopMessageLiveLocation(form: Record<string, unknown> = {}): Promise<Message | boolean> {
    return this._form("stopMessageLiveLocation", form);
  }

  sendVenue(
    chatId: ChatId,
    latitude: number,
    longitude: number,
    title: string,
    address: string,
    form: SendVenueOptions = {},
  ): Promise<Message> {
    return this._form("sendVenue", { ...form, chat_id: chatId, latitude, longitude, title, address });
  }

  sendContact(chatId: ChatId, phoneNumber: string, firstName: string, form: SendContactOptions = {}): Promise<Message> {
    return this._form("sendContact", { ...form, chat_id: chatId, phone_number: phoneNumber, first_name: firstName });
  }

  sendPoll(chatId: ChatId, question: string, pollOptions: string[], form: SendPollOptions = {}): Promise<Message> {
    return this._form("sendPoll", { ...form, chat_id: chatId, question, options: stringify(pollOptions) });
  }

  sendChecklist(
    businessConnectionId: string,
    chatId: ChatId,
    checklist: Record<string, unknown>,
    form: Record<string, unknown> = {},
  ): Promise<Message> {
    return this._form("sendChecklist", {
      ...form,
      business_connection_id: businessConnectionId,
      chat_id: chatId,
      checklist: stringify(checklist),
    });
  }

  sendDice(chatId: ChatId, options: SendDiceOptions = {}): Promise<Message> {
    return this._form("sendDice", { ...options, chat_id: chatId });
  }

  sendMessageDraft(chatId: ChatId, draftId: number, text: string, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("sendMessageDraft", { ...form, chat_id: chatId, draft_id: draftId, text });
  }

  sendChatAction(chatId: ChatId, action: string, form: SendChatActionOptions = {}): Promise<boolean> {
    return this._form("sendChatAction", { ...form, chat_id: chatId, action });
  }

  setMessageReaction(chatId: ChatId, messageId: number, form: Record<string, unknown> = {}): Promise<boolean> {
    const out: Record<string, unknown> = { ...form, chat_id: chatId, message_id: messageId };
    if (out.reaction) out.reaction = stringify(out.reaction);
    return this._form("setMessageReaction", out);
  }

  // --- Users -------------------------------------------------------------

  getUserProfilePhotos(userId: number, form: Record<string, unknown> = {}): Promise<UserProfilePhotos> {
    return this._form("getUserProfilePhotos", { ...form, user_id: userId });
  }

  getUserProfileAudios(userId: number, form: Record<string, unknown> = {}): Promise<unknown> {
    return this._form("getUserProfileAudios", { ...form, user_id: userId });
  }

  setUserEmojiStatus(userId: number, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("setUserEmojiStatus", { ...form, user_id: userId });
  }

  getFile(fileId: string, form: Record<string, unknown> = {}): Promise<TelegramFile> {
    return this._form("getFile", { ...form, file_id: fileId });
  }

  // --- Chat membership --------------------------------------------------

  banChatMember(chatId: ChatId, userId: number, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("banChatMember", { ...form, chat_id: chatId, user_id: userId });
  }
  unbanChatMember(chatId: ChatId, userId: number, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("unbanChatMember", { ...form, chat_id: chatId, user_id: userId });
  }
  restrictChatMember(chatId: ChatId, userId: number, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("restrictChatMember", { ...form, chat_id: chatId, user_id: userId });
  }
  promoteChatMember(chatId: ChatId, userId: number, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("promoteChatMember", { ...form, chat_id: chatId, user_id: userId });
  }
  setChatAdministratorCustomTitle(
    chatId: ChatId,
    userId: number,
    customTitle: string,
    form: Record<string, unknown> = {},
  ): Promise<boolean> {
    return this._form("setChatAdministratorCustomTitle", {
      ...form,
      chat_id: chatId,
      user_id: userId,
      custom_title: customTitle,
    });
  }
  setChatMemberTag(chatId: ChatId, userId: number, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("setChatMemberTag", { ...form, chat_id: chatId, user_id: userId });
  }
  banChatSenderChat(chatId: ChatId, senderChatId: number, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("banChatSenderChat", { ...form, chat_id: chatId, sender_chat_id: senderChatId });
  }
  unbanChatSenderChat(chatId: ChatId, senderChatId: number, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("unbanChatSenderChat", { ...form, chat_id: chatId, sender_chat_id: senderChatId });
  }
  setChatPermissions(
    chatId: ChatId,
    chatPermissions: Record<string, unknown>,
    form: Record<string, unknown> = {},
  ): Promise<boolean> {
    return this._form("setChatPermissions", { ...form, chat_id: chatId, permissions: stringify(chatPermissions) });
  }

  // --- Chat invite links ------------------------------------------------

  exportChatInviteLink(chatId: ChatId, form: Record<string, unknown> = {}): Promise<string> {
    return this._form("exportChatInviteLink", { ...form, chat_id: chatId });
  }
  createChatInviteLink(chatId: ChatId, form: Record<string, unknown> = {}): Promise<ChatInviteLink> {
    return this._form("createChatInviteLink", { ...form, chat_id: chatId });
  }
  editChatInviteLink(chatId: ChatId, inviteLink: string, form: Record<string, unknown> = {}): Promise<ChatInviteLink> {
    return this._form("editChatInviteLink", { ...form, chat_id: chatId, invite_link: inviteLink });
  }
  createChatSubscriptionInviteLink(
    chatId: ChatId,
    subscriptionPeriod: number,
    subscriptionPrice: number,
    form: Record<string, unknown> = {},
  ): Promise<ChatInviteLink> {
    return this._form("createChatSubscriptionInviteLink", {
      ...form,
      chat_id: chatId,
      subscription_period: subscriptionPeriod,
      subscription_price: subscriptionPrice,
    });
  }
  editChatSubscriptionInviteLink(
    chatId: ChatId,
    inviteLink: string,
    form: Record<string, unknown> = {},
  ): Promise<ChatInviteLink> {
    return this._form("editChatSubscriptionInviteLink", { ...form, chat_id: chatId, invite_link: inviteLink });
  }
  revokeChatInviteLink(chatId: ChatId, inviteLink: string, form: Record<string, unknown> = {}): Promise<ChatInviteLink> {
    return this._form("revokeChatInviteLink", { ...form, chat_id: chatId, invite_link: inviteLink });
  }
  approveChatJoinRequest(chatId: ChatId, userId: number, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("approveChatJoinRequest", { ...form, chat_id: chatId, user_id: userId });
  }
  declineChatJoinRequest(chatId: ChatId, userId: number, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("declineChatJoinRequest", { ...form, chat_id: chatId, user_id: userId });
  }

  // --- Chat metadata ---------------------------------------------------

  setChatPhoto(
    chatId: ChatId,
    photo: FileInput,
    options: Record<string, unknown> = {},
    fileOptions: FileMeta = {},
  ): Promise<boolean> {
    return this._sendFile("setChatPhoto", "photo", photo, { ...options, chat_id: chatId }, fileOptions);
  }
  deleteChatPhoto(chatId: ChatId, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("deleteChatPhoto", { ...form, chat_id: chatId });
  }
  setChatTitle(chatId: ChatId, title: string, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("setChatTitle", { ...form, chat_id: chatId, title });
  }
  setChatDescription(chatId: ChatId, description: string, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("setChatDescription", { ...form, chat_id: chatId, description });
  }
  pinChatMessage(chatId: ChatId, messageId: number, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("pinChatMessage", { ...form, chat_id: chatId, message_id: messageId });
  }
  unpinChatMessage(chatId: ChatId, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("unpinChatMessage", { ...form, chat_id: chatId });
  }
  unpinAllChatMessages(chatId: ChatId, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("unpinAllChatMessages", { ...form, chat_id: chatId });
  }
  leaveChat(chatId: ChatId, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("leaveChat", { ...form, chat_id: chatId });
  }
  getChat(chatId: ChatId, form: Record<string, unknown> = {}): Promise<Chat> {
    return this._form("getChat", { ...form, chat_id: chatId });
  }
  getChatAdministrators(chatId: ChatId, form: Record<string, unknown> = {}): Promise<ChatMember[]> {
    return this._form("getChatAdministrators", { ...form, chat_id: chatId });
  }
  getChatMemberCount(chatId: ChatId, form: Record<string, unknown> = {}): Promise<number> {
    return this._form("getChatMemberCount", { ...form, chat_id: chatId });
  }
  getChatMember(chatId: ChatId, userId: number, form: Record<string, unknown> = {}): Promise<ChatMember> {
    return this._form("getChatMember", { ...form, chat_id: chatId, user_id: userId });
  }
  setChatStickerSet(chatId: ChatId, stickerSetName: string, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("setChatStickerSet", { ...form, chat_id: chatId, sticker_set_name: stickerSetName });
  }
  deleteChatStickerSet(chatId: ChatId, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("deleteChatStickerSet", { ...form, chat_id: chatId });
  }

  // --- Forum topics -----------------------------------------------------

  getForumTopicIconStickers(chatId: ChatId, form: Record<string, unknown> = {}): Promise<Sticker[]> {
    return this._form("getForumTopicIconStickers", { ...form, chat_id: chatId });
  }
  createForumTopic(chatId: ChatId, name: string, form: Record<string, unknown> = {}): Promise<ForumTopic> {
    return this._form("createForumTopic", { ...form, chat_id: chatId, name });
  }
  editForumTopic(chatId: ChatId, messageThreadId: number, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("editForumTopic", { ...form, chat_id: chatId, message_thread_id: messageThreadId });
  }
  closeForumTopic(chatId: ChatId, messageThreadId: number, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("closeForumTopic", { ...form, chat_id: chatId, message_thread_id: messageThreadId });
  }
  reopenForumTopic(chatId: ChatId, messageThreadId: number, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("reopenForumTopic", { ...form, chat_id: chatId, message_thread_id: messageThreadId });
  }
  deleteForumTopic(chatId: ChatId, messageThreadId: number, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("deleteForumTopic", { ...form, chat_id: chatId, message_thread_id: messageThreadId });
  }
  unpinAllForumTopicMessages(chatId: ChatId, messageThreadId: number, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("unpinAllForumTopicMessages", {
      ...form,
      chat_id: chatId,
      message_thread_id: messageThreadId,
    });
  }
  editGeneralForumTopic(chatId: ChatId, name: string, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("editGeneralForumTopic", { ...form, chat_id: chatId, name });
  }
  closeGeneralForumTopic(chatId: ChatId, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("closeGeneralForumTopic", { ...form, chat_id: chatId });
  }
  reopenGeneralForumTopic(chatId: ChatId, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("reopenGeneralForumTopic", { ...form, chat_id: chatId });
  }
  hideGeneralForumTopic(chatId: ChatId, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("hideGeneralForumTopic", { ...form, chat_id: chatId });
  }
  unhideGeneralForumTopic(chatId: ChatId, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("unhideGeneralForumTopic", { ...form, chat_id: chatId });
  }
  unpinAllGeneralForumTopicMessages(chatId: ChatId, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("unpinAllGeneralForumTopicMessages", { ...form, chat_id: chatId });
  }

  // --- Callback / inline queries ---------------------------------------

  answerCallbackQuery(callbackQueryId: string, form: AnswerCallbackQueryOptions = {}): Promise<boolean> {
    return this._form("answerCallbackQuery", { ...form, callback_query_id: callbackQueryId });
  }
  savePreparedInlineMessage(
    userId: number,
    result: Record<string, unknown>,
    form: Record<string, unknown> = {},
  ): Promise<unknown> {
    return this._form("savePreparedInlineMessage", { ...form, user_id: userId, result: stringify(result) });
  }
  savePreparedKeyboardButton(
    userId: number,
    button: Record<string, unknown>,
    form: Record<string, unknown> = {},
  ): Promise<unknown> {
    return this._form("savePreparedKeyboardButton", { ...form, user_id: userId, button: stringify(button) });
  }
  getUserChatBoosts(chatId: ChatId, userId: number, form: Record<string, unknown> = {}): Promise<unknown> {
    return this._form("getUserChatBoosts", { ...form, chat_id: chatId, user_id: userId });
  }
  getBusinessConnection(businessConnectionId: string, form: Record<string, unknown> = {}): Promise<unknown> {
    return this._form("getBusinessConnection", { ...form, business_connection_id: businessConnectionId });
  }
  getManagedBotToken(userId: number, form: Record<string, unknown> = {}): Promise<string> {
    return this._form("getManagedBotToken", { ...form, user_id: userId });
  }
  replaceManagedBotToken(userId: number, form: Record<string, unknown> = {}): Promise<string> {
    return this._form("replaceManagedBotToken", { ...form, user_id: userId });
  }

  // --- Bot identity (self-management) ----------------------------------

  setMyCommands(commands: BotCommand[], form: Record<string, unknown> = {}): Promise<boolean> {
    const out: Record<string, unknown> = { ...form, commands: stringify(commands) };
    if (out.scope) out.scope = stringify(out.scope);
    return this._form("setMyCommands", out);
  }
  deleteMyCommands(form: Record<string, unknown> = {}): Promise<boolean> {
    const out: Record<string, unknown> = { ...form };
    if (out.scope) out.scope = stringify(out.scope);
    return this._form("deleteMyCommands", out);
  }
  getMyCommands(form: Record<string, unknown> = {}): Promise<BotCommand[]> {
    const out: Record<string, unknown> = { ...form };
    if (out.scope) out.scope = stringify(out.scope);
    return this._form("getMyCommands", out);
  }
  setMyName(form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("setMyName", form);
  }
  getMyName(form: Record<string, unknown> = {}): Promise<{ name: string }> {
    return this._form("getMyName", form);
  }
  setMyDescription(form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("setMyDescription", form);
  }
  getMyDescription(form: Record<string, unknown> = {}): Promise<{ description: string }> {
    return this._form("getMyDescription", form);
  }
  setMyShortDescription(form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("setMyShortDescription", form);
  }
  getMyShortDescription(form: Record<string, unknown> = {}): Promise<{ short_description: string }> {
    return this._form("getMyShortDescription", form);
  }
  async setMyProfilePhoto(photo: FileInput, options: Record<string, unknown> = {}): Promise<boolean> {
    return this._sendFile("setMyProfilePhoto", "photo", photo, { ...options });
  }
  removeMyProfilePhoto(form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("removeMyProfilePhoto", form);
  }
  setChatMenuButton(form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("setChatMenuButton", form);
  }
  getChatMenuButton(form: Record<string, unknown> = {}): Promise<unknown> {
    return this._form("getChatMenuButton", form);
  }
  setMyDefaultAdministratorRights(form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("setMyDefaultAdministratorRights", form);
  }
  getMyDefaultAdministratorRights(form: Record<string, unknown> = {}): Promise<unknown> {
    return this._form("getMyDefaultAdministratorRights", form);
  }

  // --- Editing messages -------------------------------------------------

  editMessageText(text: string, form: Record<string, unknown> = {}): Promise<Message | boolean> {
    return this._form("editMessageText", { ...form, text });
  }
  editMessageCaption(caption: string, form: Record<string, unknown> = {}): Promise<Message | boolean> {
    return this._form("editMessageCaption", { ...form, caption });
  }
  async editMessageMedia(
    media: { media: string | FileInput; type: string; fileOptions?: FileMeta; [key: string]: unknown },
    form: Record<string, unknown> = {},
  ): Promise<Message | boolean> {
    const regexAttach = /^attach:\/\/.+/;
    if (typeof media.media === "string" && regexAttach.test(media.media)) {
      const qs: Record<string, unknown> = { ...form };
      const payload: Record<string, unknown> = { ...media };
      delete payload.media;
      delete payload.fileOptions;
      const attachName = "0";
      const data = (media.media as string).replace("attach://", "");
      const { file } = await prepareFile(data, media.fileOptions, this.options.filepath);
      if (!file) throw new FatalError(`Failed to process the replacement action for your ${media.type}`);
      payload.media = `attach://${attachName}`;
      qs.media = stringify(payload);
      return this._request("editMessageMedia", { qs, formData: { [attachName]: file } });
    }
    const out: Record<string, unknown> = { ...form, media: stringify(media) };
    return this._form("editMessageMedia", out);
  }
  editMessageChecklist(
    businessConnectionId: string,
    chatId: ChatId,
    messageId: number,
    checklist: Record<string, unknown>,
    form: Record<string, unknown> = {},
  ): Promise<Message> {
    return this._form("editMessageChecklist", {
      ...form,
      business_connection_id: businessConnectionId,
      chat_id: chatId,
      message_id: messageId,
      checklist: stringify(checklist),
    });
  }
  editMessageReplyMarkup(
    replyMarkup: Record<string, unknown>,
    form: Record<string, unknown> = {},
  ): Promise<Message | boolean> {
    return this._form("editMessageReplyMarkup", { ...form, reply_markup: replyMarkup });
  }
  stopPoll(chatId: ChatId, pollId: number, form: Record<string, unknown> = {}): Promise<Poll> {
    return this._form("stopPoll", { ...form, chat_id: chatId, message_id: pollId });
  }

  // --- Suggested posts --------------------------------------------------

  approveSuggestedPost(chatId: ChatId, messageId: number, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("approveSuggestedPost", { ...form, chat_id: chatId, message_id: messageId });
  }
  declineSuggestedPost(chatId: ChatId, messageId: number, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("declineSuggestedPost", { ...form, chat_id: chatId, message_id: messageId });
  }

  // --- Stickers --------------------------------------------------------

  sendSticker(
    chatId: ChatId,
    sticker: FileInput,
    options: Record<string, unknown> = {},
    fileOptions: FileMeta = {},
  ): Promise<Message> {
    return this._sendFile("sendSticker", "sticker", sticker, { ...options, chat_id: chatId }, fileOptions);
  }
  getStickerSet(name: string, form: Record<string, unknown> = {}): Promise<StickerSet> {
    return this._form("getStickerSet", { ...form, name });
  }
  getCustomEmojiStickers(customEmojiIds: string[], form: Record<string, unknown> = {}): Promise<Sticker[]> {
    return this._form("getCustomEmojiStickers", { ...form, custom_emoji_ids: stringify(customEmojiIds) });
  }
  uploadStickerFile(
    userId: number,
    sticker: FileInput,
    stickerFormat: "static" | "animated" | "video" = "static",
    options: Record<string, unknown> = {},
    fileOptions: FileMeta = {},
  ): Promise<TelegramFile> {
    return this._sendFile(
      "uploadStickerFile",
      "sticker",
      sticker,
      { ...options, user_id: userId, sticker_format: stickerFormat },
      fileOptions,
    );
  }
  createNewStickerSet(
    userId: number,
    name: string,
    title: string,
    pngSticker: FileInput,
    emojis: string,
    options: Record<string, unknown> = {},
    fileOptions: FileMeta = {},
  ): Promise<boolean> {
    const qs: Record<string, unknown> = { ...options, user_id: userId, name, title, emojis };
    if (options.mask_position) qs.mask_position = stringify(options.mask_position);
    return this._sendFile("createNewStickerSet", "png_sticker", pngSticker, qs, fileOptions);
  }
  addStickerToSet(
    userId: number,
    name: string,
    sticker: FileInput,
    emojis: string,
    stickerType: "png_sticker" | "tgs_sticker" | "webm_sticker" = "png_sticker",
    options: Record<string, unknown> = {},
    fileOptions: FileMeta = {},
  ): Promise<boolean> {
    if (!["png_sticker", "tgs_sticker", "webm_sticker"].includes(stickerType)) {
      return Promise.reject(new Error("stickerType must be one of: png_sticker, tgs_sticker, webm_sticker"));
    }
    const qs: Record<string, unknown> = { ...options, user_id: userId, name, emojis };
    if (options.mask_position) qs.mask_position = stringify(options.mask_position);
    return this._sendFile("addStickerToSet", stickerType, sticker, qs, fileOptions);
  }
  setStickerPositionInSet(sticker: string, position: number, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("setStickerPositionInSet", { ...form, sticker, position });
  }
  deleteStickerFromSet(sticker: string, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("deleteStickerFromSet", { ...form, sticker });
  }
  replaceStickerInSet(
    userId: number,
    name: string,
    oldSticker: string,
    form: Record<string, unknown> = {},
  ): Promise<boolean> {
    return this._form("replaceStickerInSet", { ...form, user_id: userId, name, old_sticker: oldSticker });
  }
  setStickerEmojiList(sticker: string, emojiList: string[], form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("setStickerEmojiList", { ...form, sticker, emoji_list: stringify(emojiList) });
  }
  setStickerKeywords(sticker: string, form: Record<string, unknown> = {}): Promise<boolean> {
    const out: Record<string, unknown> = { ...form, sticker };
    if (out.keywords) out.keywords = stringify(out.keywords);
    return this._form("setStickerKeywords", out);
  }
  setStickerMaskPosition(sticker: string, form: Record<string, unknown> = {}): Promise<boolean> {
    const out: Record<string, unknown> = { ...form, sticker };
    if (out.mask_position) out.mask_position = stringify(out.mask_position);
    return this._form("setStickerMaskPosition", out);
  }
  setStickerSetTitle(name: string, title: string, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("setStickerSetTitle", { ...form, name, title });
  }
  setStickerSetThumbnail(
    userId: number,
    name: string,
    thumbnail: FileInput,
    options: Record<string, unknown> = {},
    fileOptions: FileMeta = {},
  ): Promise<boolean> {
    return this._sendFile(
      "setStickerSetThumbnail",
      "thumbnail",
      thumbnail,
      { ...options, user_id: userId, name },
      fileOptions,
    );
  }
  setCustomEmojiStickerSetThumbnail(name: string, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("setCustomEmojiStickerSetThumbnail", { ...form, name });
  }
  deleteStickerSet(name: string, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("deleteStickerSet", { ...form, name });
  }

  // --- Inline / web app -------------------------------------------------

  answerInlineQuery(
    inlineQueryId: string,
    results: Array<Record<string, unknown>>,
    form: AnswerInlineQueryOptions = {},
  ): Promise<boolean> {
    return this._form("answerInlineQuery", { ...form, inline_query_id: inlineQueryId, results: stringify(results) });
  }
  answerWebAppQuery(
    webAppQueryId: string,
    result: Record<string, unknown>,
    form: Record<string, unknown> = {},
  ): Promise<unknown> {
    return this._form("answerWebAppQuery", { ...form, web_app_query_id: webAppQueryId, result: stringify(result) });
  }

  // --- Payments --------------------------------------------------------

  sendInvoice(
    chatId: ChatId,
    title: string,
    description: string,
    payload: string,
    providerToken: string,
    currency: string,
    prices: Array<{ label: string; amount: number }>,
    form: SendInvoiceOptions = {},
  ): Promise<Message> {
    const out: Record<string, unknown> = {
      ...form,
      chat_id: chatId,
      title,
      description,
      payload,
      provider_token: providerToken,
      currency,
      prices: stringify(prices),
    };
    if (out.provider_data !== undefined) out.provider_data = stringify(out.provider_data);
    if (out.suggested_tip_amounts) out.suggested_tip_amounts = stringify(out.suggested_tip_amounts);
    return this._form("sendInvoice", out);
  }
  createInvoiceLink(
    title: string,
    description: string,
    payload: string,
    providerToken: string,
    currency: string,
    prices: Array<{ label: string; amount: number }>,
    form: Record<string, unknown> = {},
  ): Promise<string> {
    return this._form("createInvoiceLink", {
      ...form,
      title,
      description,
      payload,
      provider_token: providerToken,
      currency,
      prices: stringify(prices),
    });
  }
  answerShippingQuery(shippingQueryId: string, ok: boolean, form: Record<string, unknown> = {}): Promise<boolean> {
    const out: Record<string, unknown> = { ...form, shipping_query_id: shippingQueryId, ok };
    if (out.shipping_options) out.shipping_options = stringify(out.shipping_options);
    return this._form("answerShippingQuery", out);
  }
  answerPreCheckoutQuery(preCheckoutQueryId: string, ok: boolean, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("answerPreCheckoutQuery", { ...form, pre_checkout_query_id: preCheckoutQueryId, ok });
  }

  // --- Telegram Stars --------------------------------------------------

  getMyStarBalance(form: Record<string, unknown> = {}): Promise<unknown> {
    return this._form("getMyStarBalance", form);
  }
  getStarTransactions(form: Record<string, unknown> = {}): Promise<unknown> {
    return this._form("getStarTransactions", form);
  }
  refundStarPayment(
    userId: number,
    telegramPaymentChargeId: string,
    form: Record<string, unknown> = {},
  ): Promise<boolean> {
    return this._form("refundStarPayment", {
      ...form,
      user_id: userId,
      telegram_payment_charge_id: telegramPaymentChargeId,
    });
  }
  editUserStarSubscription(
    userId: number,
    telegramPaymentChargeId: string,
    isCanceled: boolean,
    form: Record<string, unknown> = {},
  ): Promise<boolean> {
    return this._form("editUserStarSubscription", {
      ...form,
      user_id: userId,
      telegram_payment_charge_id: telegramPaymentChargeId,
      is_canceled: isCanceled,
    });
  }

  // --- Games -----------------------------------------------------------

  sendGame(chatId: ChatId, gameShortName: string, form: Record<string, unknown> = {}): Promise<Message> {
    return this._form("sendGame", { ...form, chat_id: chatId, game_short_name: gameShortName });
  }
  setGameScore(userId: number, score: number, form: Record<string, unknown> = {}): Promise<Message | boolean> {
    return this._form("setGameScore", { ...form, user_id: userId, score });
  }
  getGameHighScores(userId: number, form: Record<string, unknown> = {}): Promise<unknown[]> {
    return this._form("getGameHighScores", { ...form, user_id: userId });
  }

  // --- Delete messages ------------------------------------------------

  deleteMessage(chatId: ChatId, messageId: number, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("deleteMessage", { ...form, chat_id: chatId, message_id: messageId });
  }
  deleteMessages(chatId: ChatId, messageIds: number[], form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("deleteMessages", { ...form, chat_id: chatId, message_ids: stringify(messageIds) });
  }
  deleteMessageReaction(chatId: ChatId, messageId: number, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("deleteMessageReaction", { ...form, chat_id: chatId, message_id: messageId });
  }
  deleteAllMessageReactions(chatId: ChatId, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("deleteAllMessageReactions", { ...form, chat_id: chatId });
  }
  // --- Gifts -----------------------------------------------------------

  getAvailableGifts(form: Record<string, unknown> = {}): Promise<unknown> {
    return this._form("getAvailableGifts", form);
  }
  sendGift(giftId: string, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("sendGift", { ...form, gift_id: giftId });
  }
  giftPremiumSubscription(
    userId: number,
    monthCount: number,
    starCount: number,
    form: Record<string, unknown> = {},
  ): Promise<boolean> {
    return this._form("giftPremiumSubscription", {
      ...form,
      user_id: userId,
      month_count: monthCount,
      star_count: starCount,
    });
  }

  // --- Verification ---------------------------------------------------

  verifyUser(userId: number, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("verifyUser", { ...form, user_id: userId });
  }
  verifyChat(chatId: ChatId, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("verifyChat", { ...form, chat_id: chatId });
  }
  removeUserVerification(userId: number, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("removeUserVerification", { ...form, user_id: userId });
  }
  removeChatVerification(chatId: ChatId, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("removeChatVerification", { ...form, chat_id: chatId });
  }

  // --- Business accounts ----------------------------------------------

  readBusinessMessage(
    businessConnectionId: string,
    chatId: ChatId,
    messageId: number,
    form: Record<string, unknown> = {},
  ): Promise<boolean> {
    return this._form("readBusinessMessage", {
      ...form,
      business_connection_id: businessConnectionId,
      chat_id: chatId,
      message_id: messageId,
    });
  }
  deleteBusinessMessages(
    businessConnectionId: string,
    messageIds: number[],
    form: Record<string, unknown> = {},
  ): Promise<boolean> {
    return this._form("deleteBusinessMessages", {
      ...form,
      business_connection_id: businessConnectionId,
      message_ids: stringify(messageIds),
    });
  }
  setBusinessAccountName(
    businessConnectionId: string,
    firstName: string,
    form: Record<string, unknown> = {},
  ): Promise<boolean> {
    return this._form("setBusinessAccountName", {
      ...form,
      business_connection_id: businessConnectionId,
      first_name: firstName,
    });
  }
  setBusinessAccountUsername(businessConnectionId: string, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("setBusinessAccountUsername", { ...form, business_connection_id: businessConnectionId });
  }
  setBusinessAccountBio(businessConnectionId: string, form: Record<string, unknown> = {}): Promise<boolean> {
    return this._form("setBusinessAccountBio", { ...form, business_connection_id: businessConnectionId });
  }
  setBusinessAccountProfilePhoto(
    businessConnectionId: string,
    photo: FileInput,
    options: Record<string, unknown> = {},
  ): Promise<boolean> {
    return this._sendFile("setBusinessAccountProfilePhoto", "photo", photo, {
      ...options,
      business_connection_id: businessConnectionId,
    });
  }
  removeBusinessAccountProfilePhoto(
    businessConnectionId: string,
    form: Record<string, unknown> = {},
  ): Promise<boolean> {
    return this._form("removeBusinessAccountProfilePhoto", { ...form, business_connection_id: businessConnectionId });
  }
  setBusinessAccountGiftSettings(
    businessConnectionId: string,
    showGiftButton: boolean,
    acceptedGiftTypes: Record<string, unknown>,
    form: Record<string, unknown> = {},
  ): Promise<boolean> {
    return this._form("setBusinessAccountGiftSettings", {
      ...form,
      business_connection_id: businessConnectionId,
      show_gift_button: showGiftButton,
      accepted_gift_types: acceptedGiftTypes,
    });
  }
  getBusinessAccountStarBalance(businessConnectionId: string, form: Record<string, unknown> = {}): Promise<unknown> {
    return this._form("getBusinessAccountStarBalance", { ...form, business_connection_id: businessConnectionId });
  }
  transferBusinessAccountStars(
    businessConnectionId: string,
    starCount: number,
    form: Record<string, unknown> = {},
  ): Promise<boolean> {
    return this._form("transferBusinessAccountStars", {
      ...form,
      business_connection_id: businessConnectionId,
      star_count: starCount,
    });
  }
  getBusinessAccountGifts(businessConnectionId: string, form: Record<string, unknown> = {}): Promise<unknown> {
    return this._form("getBusinessAccountGifts", { ...form, business_connection_id: businessConnectionId });
  }
  getUserGifts(userId: number, form: Record<string, unknown> = {}): Promise<unknown> {
    return this._form("getUserGifts", { ...form, user_id: userId });
  }
  getChatGifts(chatId: ChatId, form: Record<string, unknown> = {}): Promise<unknown> {
    return this._form("getChatGifts", { ...form, chat_id: chatId });
  }
  convertGiftToStars(
    businessConnectionId: string,
    ownedGiftId: string,
    form: Record<string, unknown> = {},
  ): Promise<boolean> {
    return this._form("convertGiftToStars", {
      ...form,
      business_connection_id: businessConnectionId,
      owned_gift_id: ownedGiftId,
    });
  }
  upgradeGift(
    businessConnectionId: string,
    ownedGiftId: string,
    form: Record<string, unknown> = {},
  ): Promise<boolean> {
    return this._form("upgradeGift", {
      ...form,
      business_connection_id: businessConnectionId,
      owned_gift_id: ownedGiftId,
    });
  }
  transferGift(
    businessConnectionId: string,
    ownedGiftId: string,
    newOwnerChatId: number,
    form: Record<string, unknown> = {},
  ): Promise<boolean> {
    return this._form("transferGift", {
      ...form,
      business_connection_id: businessConnectionId,
      owned_gift_id: ownedGiftId,
      new_owner_chat_id: newOwnerChatId,
    });
  }

  // --- Stories --------------------------------------------------------

  async postStory(
    businessConnectionId: string,
    content: { type: string; [key: string]: unknown },
    activePeriod: number,
    options: Record<string, unknown> = {},
  ): Promise<unknown> {
    if (!content.type) throw new FatalError("content.type is required");
    const qs: Record<string, unknown> = {
      ...options,
      business_connection_id: businessConnectionId,
      active_period: activePeriod,
    };
    const fileInput = content[content.type] as FileInput | undefined;
    const { formData, fileIds } = await prepareFiles(content.type, [{ media: fileInput }], {}, this.options.filepath);
    const inputContent: Record<string, unknown> = { ...content };
    inputContent[content.type] = fileIds[0] ?? `attach://${content.type}_0`;
    qs.content = stringify(inputContent);
    return this._request("postStory", { qs, formData });
  }
  repostStory(
    businessConnectionId: string,
    fromChatId: ChatId,
    fromStoryId: number,
    activePeriod: number,
    form: Record<string, unknown> = {},
  ): Promise<unknown> {
    return this._form("repostStory", {
      ...form,
      business_connection_id: businessConnectionId,
      from_chat_id: fromChatId,
      from_story_id: fromStoryId,
      active_period: activePeriod,
    });
  }
  async editStory(
    businessConnectionId: string,
    storyId: number,
    content: { type: string; [key: string]: unknown },
    options: Record<string, unknown> = {},
  ): Promise<unknown> {
    if (!content.type) throw new FatalError("content.type is required");
    const qs: Record<string, unknown> = {
      ...options,
      business_connection_id: businessConnectionId,
      story_id: storyId,
    };
    const fileInput = content[content.type] as FileInput | undefined;
    const { formData, fileIds } = await prepareFiles(content.type, [{ media: fileInput }], {}, this.options.filepath);
    const inputContent: Record<string, unknown> = { ...content };
    inputContent[content.type] = fileIds[0] ?? `attach://${content.type}_0`;
    qs.content = stringify(inputContent);
    return this._request("editStory", { qs, formData });
  }
  deleteStory(
    businessConnectionId: string,
    storyId: number,
    form: Record<string, unknown> = {},
  ): Promise<boolean> {
    return this._form("deleteStory", {
      ...form,
      business_connection_id: businessConnectionId,
      story_id: storyId,
    });
  }
}

export type { ChatJoinRequest };
export default TelegramBot;
