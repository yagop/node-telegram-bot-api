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
import { MESSAGE_TYPES } from "./types/schemas.js";
import type {
  // Library helpers + data objects (generated)
  ChatId,
  MessageType,
  Update,
  User,
  Message,
  MessageId,
  WebhookInfo,
  Chat,
  ChatMember,
  ChatInviteLink,
  ForumTopic,
  UserProfilePhotos,
  File as TelegramFile,
  Sticker,
  StickerSet,
  Poll,
  BotCommand,
  ChatJoinRequest,
  InputProfilePhotoInput,
  MenuButton,
  SentGuestMessage,
  SentWebAppMessage,
  BotAccessSettings,
  ReplyParameters,
  MessageEntity,
  LinkPreviewOptions,
  ParseMode,
  ReactionType,
  MaskPosition,
  InlineKeyboardMarkup,
  ChatPermissions,
  ChatFullInfo,
  InlineQueryResult,
  BusinessConnection,
  UserChatBoosts,
  BotName,
  BotDescription,
  BotShortDescription,
  UserProfileAudios,
  PreparedInlineMessage,
  ChatAdministratorRights,
  StarAmount,
  StarTransactions,
  GameHighScore,
  Gifts,
  OwnedGifts,
  Story,
  ReplyMarkup,
  SuggestedPostParameters,
  InputPollOption,
  InputMedia,
  InputSticker,
  InputStoryContent,
  StoryArea,
  ShippingOption,
  InputChecklist,
  KeyboardButton,
  AcceptedGiftTypes,
  // Per-method request params (generated, docs-faithful `<Method>Params`).
  // Each method's options arg is `Omit<…Params, <positional args>>` inline below.
  GetUpdatesParams,
  SetWebhookParams,
  DeleteWebhookParams,
  SendMessageParams,
  ForwardMessageParams,
  ForwardMessagesParams,
  CopyMessageParams,
  CopyMessagesParams,
  SendPhotoParams,
  SendLivePhotoParams,
  SendPaidMediaParams,
  SendMediaGroupParams,
  SendAudioParams,
  SendDocumentParams,
  SendVideoParams,
  SendAnimationParams,
  SendVoiceParams,
  SendVideoNoteParams,
  SendLocationParams,
  SendVenueParams,
  SendContactParams,
  SendPollParams,
  SendDiceParams,
  SendChatActionParams,
  AnswerCallbackQueryParams,
  AnswerInlineQueryParams,
  SendInvoiceParams,
  SendChecklistParams,
  SendMessageDraftParams,
  SetMessageReactionParams,
  GetUserProfilePhotosParams,
  GetUserProfileAudiosParams,
  SetUserEmojiStatusParams,
  EditMessageLiveLocationParams,
  StopMessageLiveLocationParams,
  BanChatMemberParams,
  UnbanChatMemberParams,
  RestrictChatMemberParams,
  PromoteChatMemberParams,
  SetChatMemberTagParams,
  SetChatPermissionsParams,
  CreateChatInviteLinkParams,
  EditChatInviteLinkParams,
  CreateChatSubscriptionInviteLinkParams,
  EditChatSubscriptionInviteLinkParams,
  PinChatMessageParams,
  UnpinChatMessageParams,
  GetChatAdministratorsParams,
  CreateForumTopicParams,
  EditForumTopicParams,
  SetManagedBotAccessSettingsParams,
  SetMyCommandsParams,
  DeleteMyCommandsParams,
  GetMyCommandsParams,
  SetMyNameParams,
  GetMyNameParams,
  SetMyDescriptionParams,
  GetMyDescriptionParams,
  SetMyShortDescriptionParams,
  GetMyShortDescriptionParams,
  SetChatMenuButtonParams,
  GetChatMenuButtonParams,
  SetMyDefaultAdministratorRightsParams,
  GetMyDefaultAdministratorRightsParams,
  EditMessageTextParams,
  EditMessageCaptionParams,
  EditMessageMediaParams,
  EditMessageChecklistParams,
  EditMessageReplyMarkupParams,
  StopPollParams,
  ApproveSuggestedPostParams,
  DeclineSuggestedPostParams,
  SendStickerParams,
  ReplaceStickerInSetParams,
  SetStickerKeywordsParams,
  SetStickerMaskPositionParams,
  SetCustomEmojiStickerSetThumbnailParams,
  AnswerWebAppQueryParams,
  CreateInvoiceLinkParams,
  AnswerShippingQueryParams,
  AnswerPreCheckoutQueryParams,
  GetStarTransactionsParams,
  SendGameParams,
  SetGameScoreParams,
  SendGiftParams,
  GiftPremiumSubscriptionParams,
  VerifyUserParams,
  VerifyChatParams,
  SetBusinessAccountNameParams,
  SetBusinessAccountUsernameParams,
  SetBusinessAccountBioParams,
  SetBusinessAccountProfilePhotoParams,
  RemoveBusinessAccountProfilePhotoParams,
  SetBusinessAccountGiftSettingsParams,
  GetBusinessAccountGiftsParams,
  GetUserGiftsParams,
  GetChatGiftsParams,
  UpgradeGiftParams,
  TransferGiftParams,
  PostStoryParams,
  RepostStoryParams,
  EditStoryParams,
  SavePreparedInlineMessageParams,
  SavePreparedKeyboardButtonParams,
  GetCustomEmojiStickersParams,
  SetStickerEmojiListParams,
  DeleteBusinessMessagesParams,
  GetWebhookInfoParams,
  GetMeParams,
  LogOutParams,
  CloseParams,
  GetForumTopicIconStickersParams,
  RemoveMyProfilePhotoParams,
  GetMyStarBalanceParams,
  GetAvailableGiftsParams,
  // Params for satisfies-typed _form payloads (positional-only methods).
  ApproveChatJoinRequestParams,
  BanChatSenderChatParams,
  CloseForumTopicParams,
  CloseGeneralForumTopicParams,
  ConvertGiftToStarsParams,
  DeclineChatJoinRequestParams,
  DeleteAllMessageReactionsParams,
  DeleteChatPhotoParams,
  DeleteChatStickerSetParams,
  DeleteForumTopicParams,
  DeleteMessageParams,
  DeleteMessageReactionParams,
  DeleteStickerFromSetParams,
  DeleteStickerSetParams,
  DeleteStoryParams,
  EditGeneralForumTopicParams,
  EditUserStarSubscriptionParams,
  ExportChatInviteLinkParams,
  GetBusinessAccountStarBalanceParams,
  GetBusinessConnectionParams,
  GetChatMemberCountParams,
  GetChatMemberParams,
  GetChatParams,
  GetFileParams,
  GetGameHighScoresParams,
  GetManagedBotAccessSettingsParams,
  GetManagedBotTokenParams,
  GetStickerSetParams,
  GetUserChatBoostsParams,
  HideGeneralForumTopicParams,
  LeaveChatParams,
  ReadBusinessMessageParams,
  RefundStarPaymentParams,
  RemoveChatVerificationParams,
  RemoveUserVerificationParams,
  ReopenForumTopicParams,
  ReopenGeneralForumTopicParams,
  ReplaceManagedBotTokenParams,
  RevokeChatInviteLinkParams,
  SetChatAdministratorCustomTitleParams,
  SetChatDescriptionParams,
  SetChatStickerSetParams,
  SetChatTitleParams,
  SetStickerPositionInSetParams,
  SetStickerSetTitleParams,
  TransferBusinessAccountStarsParams,
  UnbanChatSenderChatParams,
  UnhideGeneralForumTopicParams,
  UnpinAllChatMessagesParams,
  UnpinAllForumTopicMessagesParams,
  UnpinAllGeneralForumTopicMessagesParams,
  // Per-method reply types (generated `<Method>Result`).
  AddStickerToSetResult,
  AnswerCallbackQueryResult,
  AnswerGuestQueryResult,
  AnswerInlineQueryResult,
  AnswerPreCheckoutQueryResult,
  AnswerShippingQueryResult,
  AnswerWebAppQueryResult,
  ApproveChatJoinRequestResult,
  ApproveSuggestedPostResult,
  BanChatMemberResult,
  BanChatSenderChatResult,
  CloseForumTopicResult,
  CloseGeneralForumTopicResult,
  CloseResult,
  ConvertGiftToStarsResult,
  CopyMessageResult,
  CopyMessagesResult,
  CreateChatInviteLinkResult,
  CreateChatSubscriptionInviteLinkResult,
  CreateForumTopicResult,
  CreateInvoiceLinkResult,
  CreateNewStickerSetResult,
  DeclineChatJoinRequestResult,
  DeclineSuggestedPostResult,
  DeleteAllMessageReactionsResult,
  DeleteBusinessMessagesResult,
  DeleteChatPhotoResult,
  DeleteChatStickerSetResult,
  DeleteForumTopicResult,
  DeleteMessageReactionResult,
  DeleteMessageResult,
  DeleteMessagesResult,
  DeleteMyCommandsResult,
  DeleteStickerFromSetResult,
  DeleteStickerSetResult,
  DeleteStoryResult,
  DeleteWebhookResult,
  EditChatInviteLinkResult,
  EditChatSubscriptionInviteLinkResult,
  EditForumTopicResult,
  EditGeneralForumTopicResult,
  EditMessageCaptionResult,
  EditMessageChecklistResult,
  EditMessageLiveLocationResult,
  EditMessageMediaResult,
  EditMessageReplyMarkupResult,
  EditMessageTextResult,
  EditStoryResult,
  EditUserStarSubscriptionResult,
  ExportChatInviteLinkResult,
  ForwardMessageResult,
  ForwardMessagesResult,
  GetAvailableGiftsResult,
  GetBusinessAccountGiftsResult,
  GetBusinessAccountStarBalanceResult,
  GetBusinessConnectionResult,
  GetChatAdministratorsResult,
  GetChatGiftsResult,
  GetChatMemberCountResult,
  GetChatMemberResult,
  GetChatMenuButtonResult,
  GetChatResult,
  GetCustomEmojiStickersResult,
  GetFileResult,
  GetForumTopicIconStickersResult,
  GetGameHighScoresResult,
  GetManagedBotAccessSettingsResult,
  GetManagedBotTokenResult,
  GetMeResult,
  GetMyCommandsResult,
  GetMyDefaultAdministratorRightsResult,
  GetMyDescriptionResult,
  GetMyNameResult,
  GetMyShortDescriptionResult,
  GetMyStarBalanceResult,
  GetStarTransactionsResult,
  GetStickerSetResult,
  GetUpdatesResult,
  GetUserChatBoostsResult,
  GetUserGiftsResult,
  GetUserPersonalChatMessagesResult,
  GetUserProfileAudiosResult,
  GetUserProfilePhotosResult,
  GetWebhookInfoResult,
  GiftPremiumSubscriptionResult,
  HideGeneralForumTopicResult,
  LeaveChatResult,
  LogOutResult,
  PinChatMessageResult,
  PostStoryResult,
  PromoteChatMemberResult,
  ReadBusinessMessageResult,
  RefundStarPaymentResult,
  RemoveBusinessAccountProfilePhotoResult,
  RemoveChatVerificationResult,
  RemoveMyProfilePhotoResult,
  RemoveUserVerificationResult,
  ReopenForumTopicResult,
  ReopenGeneralForumTopicResult,
  ReplaceManagedBotTokenResult,
  ReplaceStickerInSetResult,
  RepostStoryResult,
  RestrictChatMemberResult,
  RevokeChatInviteLinkResult,
  SavePreparedInlineMessageResult,
  SavePreparedKeyboardButtonResult,
  SendChatActionResult,
  SendChecklistResult,
  SendContactResult,
  SendDiceResult,
  SendGameResult,
  SendGiftResult,
  SendInvoiceResult,
  SendLivePhotoResult,
  SendLocationResult,
  SendMediaGroupResult,
  SendMessageDraftResult,
  SendMessageResult,
  SendPaidMediaResult,
  SendPhotoResult,
  SendPollResult,
  SendStickerResult,
  SendAudioResult,
  SendDocumentResult,
  SendVideoResult,
  SendAnimationResult,
  SendVideoNoteResult,
  UploadStickerFileResult,
  SetStickerSetThumbnailResult,
  SendVenueResult,
  SendVoiceResult,
  SetBusinessAccountBioResult,
  SetBusinessAccountGiftSettingsResult,
  SetBusinessAccountNameResult,
  SetBusinessAccountProfilePhotoResult,
  SetBusinessAccountUsernameResult,
  SetChatAdministratorCustomTitleResult,
  SetChatDescriptionResult,
  SetChatMemberTagResult,
  SetChatMenuButtonResult,
  SetChatPermissionsResult,
  SetChatPhotoResult,
  SetChatStickerSetResult,
  SetChatTitleResult,
  SetCustomEmojiStickerSetThumbnailResult,
  SetGameScoreResult,
  SetManagedBotAccessSettingsResult,
  SetMessageReactionResult,
  SetMyCommandsResult,
  SetMyDefaultAdministratorRightsResult,
  SetMyDescriptionResult,
  SetMyNameResult,
  SetMyProfilePhotoResult,
  SetMyShortDescriptionResult,
  SetStickerEmojiListResult,
  SetStickerKeywordsResult,
  SetStickerMaskPositionResult,
  SetStickerPositionInSetResult,
  SetStickerSetTitleResult,
  SetUserEmojiStatusResult,
  SetWebhookResult,
  StopMessageLiveLocationResult,
  StopPollResult,
  TransferBusinessAccountStarsResult,
  TransferGiftResult,
  UnbanChatMemberResult,
  UnbanChatSenderChatResult,
  UnhideGeneralForumTopicResult,
  UnpinAllChatMessagesResult,
  UnpinAllForumTopicMessagesResult,
  UnpinAllGeneralForumTopicMessagesResult,
  UnpinChatMessageResult,
  UpgradeGiftResult,
  VerifyChatResult,
  VerifyUserResult,
} from "./types/schemas.js";

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
      this._fixSuggestedPostParameters(opts.form);
      this._fixLinkPreviewOptions(opts.form);
      this._fixJsonFields(opts.form);
    }
    if (opts.qs) {
      this._fixReplyMarkup(opts.qs);
      this._fixEntitiesField(opts.qs);
      this._fixReplyParameters(opts.qs);
      this._fixMessageIds(opts.qs);
      this._fixSuggestedPostParameters(opts.qs);
      this._fixLinkPreviewOptions(opts.qs);
      this._fixStoryAreas(opts.qs);
      this._fixJsonFields(opts.qs);
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
    for (const key of ["entities", "caption_entities", "explanation_entities", "description_entities", "question_entities", "title_entities", "text_entities"] as const) {
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

  private _fixSuggestedPostParameters(obj: Record<string, unknown>): void {
    if (
      Object.prototype.hasOwnProperty.call(obj, "suggested_post_parameters") &&
      typeof obj.suggested_post_parameters !== "string"
    ) {
      obj.suggested_post_parameters = stringify(obj.suggested_post_parameters);
    }
  }

  private _fixLinkPreviewOptions(obj: Record<string, unknown>): void {
    const value = obj.link_preview_options;
    if (value && typeof value !== "string") {
      obj.link_preview_options = stringify(value);
    }
  }

  private _fixStoryAreas(obj: Record<string, unknown>): void {
    const value = obj.areas;
    if (value && typeof value !== "string") {
      obj.areas = stringify(value);
    }
  }

  private _fixMessageIds(obj: Record<string, unknown>): void {
    const messageIds = obj.message_ids;
    if (messageIds && typeof messageIds !== "string") {
      obj.message_ids = stringify(messageIds);
    }
  }

  /**
   * JSON-stringify the remaining structured fields that the Bot API expects as
   * strings on a form body. Each is left untouched when already a string (a
   * caller may pre-serialize) or absent, so methods can pass the typed value
   * straight through and let normalization happen here.
   */
  private _fixJsonFields(obj: Record<string, unknown>): void {
    for (const key of [
      "button",
      "menu_button",
      "checklist",
      "custom_emoji_ids",
      "emoji_list",
      "keywords",
      "mask_position",
      "results",
      "sticker",
    ] as const) {
      const value = obj[key];
      if (value !== undefined && value !== null && typeof value !== "string") {
        obj[key] = stringify(value);
      }
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
  async getFileLink(fileId: string, options: {} = {}): Promise<string> {
    const file = await this.getFile(fileId, options);
    return `${this.options.baseApiUrl}/file/bot${this.token}/${file.file_path}`;
  }

  /**
   * Stream the contents of a Telegram file. The returned stream emits an `info`
   * event with the resolved URI before the bytes start flowing.
   */
  getFileStream(fileId: string, options: {} = {}): NodeJS.ReadableStream & { path: string } {
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
  async downloadFile(fileId: string, downloadDir: string, options: {} = {}): Promise<string> {
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

  getUpdates(form: GetUpdatesParams = {}): Promise<GetUpdatesResult> {
    if (Array.isArray(form.allowed_updates)) {
      (form as Record<string, unknown>).allowed_updates = stringify(form.allowed_updates);
    }
    return this._form("getUpdates", form);
  }

  async setWebHook(url: string, options: Omit<SetWebhookParams, "url"> = {}, fileOptions: FileMeta = {}): Promise<SetWebhookResult> {
    const { certificate, ...rest } = options;
    const qs: Record<string, unknown> = { ...rest, url };
    if (Array.isArray(qs.allowed_updates)) qs.allowed_updates = stringify(qs.allowed_updates);
    if (certificate) {
      const { file, fileId } = await prepareFile(certificate, fileOptions, this.options.filepath);
      if (file) {
        return this._request("setWebhook", { qs, formData: { certificate: file } });
      }
      qs.certificate = fileId;
    }
    return this._request("setWebhook", { qs });
  }

  deleteWebHook(form: DeleteWebhookParams = {}): Promise<DeleteWebhookResult> {
    return this._form("deleteWebhook", form);
  }

  getWebHookInfo(form: GetWebhookInfoParams = {}): Promise<GetWebhookInfoResult> {
    return this._form("getWebhookInfo", form);
  }

  // --- Bot identity ------------------------------------------------------

  getMe(form: GetMeParams = {}): Promise<GetMeResult> {
    return this._form("getMe", form);
  }

  logOut(form: LogOutParams = {}): Promise<LogOutResult> {
    return this._form("logOut", form);
  }

  close(form: CloseParams = {}): Promise<CloseResult> {
    return this._form("close", form);
  }

  // --- Messages ----------------------------------------------------------

  sendMessage(chatId: ChatId, text: string, form: Omit<SendMessageParams, "chat_id" | "text"> = {}): Promise<SendMessageResult> {
    return this._form("sendMessage", {
      ...form,
      chat_id: chatId,
      text,
    } satisfies SendMessageParams);
  }

  forwardMessage(
    chatId: ChatId,
    fromChatId: ChatId,
    messageId: number,
    form: Omit<ForwardMessageParams, "chat_id" | "from_chat_id" | "message_id"> = {},
  ): Promise<ForwardMessageResult> {
    return this._form("forwardMessage", {
      ...form,
      chat_id: chatId,
      from_chat_id: fromChatId,
      message_id: messageId,
    } satisfies ForwardMessageParams);
  }

  forwardMessages(
    chatId: ChatId,
    fromChatId: ChatId,
    messageIds: number[],
    form: Omit<ForwardMessagesParams, "chat_id" | "from_chat_id" | "message_ids"> = {},
  ): Promise<ForwardMessagesResult> {
    return this._form("forwardMessages", {
      ...form,
      chat_id: chatId,
      from_chat_id: fromChatId,
      message_ids: messageIds,
    } satisfies ForwardMessagesParams);
  }

  copyMessage(
    chatId: ChatId,
    fromChatId: ChatId,
    messageId: number,
    form: Omit<CopyMessageParams, "chat_id" | "from_chat_id" | "message_id"> = {},
  ): Promise<CopyMessageResult> {
    return this._form("copyMessage", {
      ...form,
      chat_id: chatId,
      from_chat_id: fromChatId,
      message_id: messageId,
    } satisfies CopyMessageParams);
  }

  copyMessages(
    chatId: ChatId,
    fromChatId: ChatId,
    messageIds: number[],
    form: Omit<CopyMessagesParams, "chat_id" | "from_chat_id" | "message_ids"> = {},
  ): Promise<CopyMessagesResult> {
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
    options: Omit<SendPhotoParams, "chat_id" | "photo"> = {},
    fileOptions: FileMeta = {},
  ): Promise<SendPhotoResult> {
    return this._sendFile("sendPhoto", "photo", photo, { ...options, chat_id: chatId }, fileOptions);
  }

  async sendLivePhoto(
    chatId: ChatId,
    livePhoto: FileInput,
    photo: FileInput,
    options: Omit<SendLivePhotoParams, "chat_id" | "live_photo" | "photo"> = {},
    fileOptions: FileMeta = {},
  ): Promise<SendLivePhotoResult> {
    const qs: Record<string, unknown> = { ...options, chat_id: chatId };
    const opts: RequestOptions = { qs };

    const liveResult = await prepareFile(livePhoto, fileOptions, this.options.filepath);
    if (liveResult.file) {
      opts.formData = { live_photo: liveResult.file };
      qs.live_photo = "attach://live_photo";
    } else if (liveResult.fileId) {
      qs.live_photo = liveResult.fileId;
    }

    const photoResult = await prepareFile(photo, {}, this.options.filepath);
    if (photoResult.file) {
      opts.formData = opts.formData ?? {};
      opts.formData.photo = photoResult.file;
      qs.photo = "attach://photo";
    } else if (photoResult.fileId) {
      qs.photo = photoResult.fileId;
    }

    return this._request<Message>("sendLivePhoto", opts);
  }

  sendAudio(
    chatId: ChatId,
    audio: FileInput,
    options: Omit<SendAudioParams, "chat_id" | "audio"> = {},
    fileOptions: FileMeta = {},
  ): Promise<SendAudioResult> {
    return this._sendFile(
      "sendAudio",
      "audio",
      audio,
      { ...options, chat_id: chatId },
      fileOptions,
      { thumbnail: options.thumbnail as FileInput | undefined },
    );
  }

  sendDocument(
    chatId: ChatId,
    doc: FileInput,
    options: Omit<SendDocumentParams, "chat_id" | "document"> = {},
    fileOptions: FileMeta = {},
  ): Promise<SendDocumentResult> {
    return this._sendFile(
      "sendDocument",
      "document",
      doc,
      { ...options, chat_id: chatId },
      fileOptions,
      { thumbnail: options.thumbnail as FileInput | undefined },
    );
  }

  sendVideo(
    chatId: ChatId,
    video: FileInput,
    options: Omit<SendVideoParams, "chat_id" | "video"> = {},
    fileOptions: FileMeta = {},
  ): Promise<SendVideoResult> {
    return this._sendFile(
      "sendVideo",
      "video",
      video,
      { ...options, chat_id: chatId },
      fileOptions,
      { thumbnail: options.thumbnail as FileInput },
    );
  }

  sendAnimation(
    chatId: ChatId,
    animation: FileInput,
    options: Omit<SendAnimationParams, "chat_id" | "animation"> = {},
    fileOptions: FileMeta = {},
  ): Promise<SendAnimationResult> {
    return this._sendFile(
      "sendAnimation",
      "animation", animation,
      { ...options, chat_id: chatId },
      fileOptions,
      { thumbnail: options.thumbnail as FileInput }
    );
  }

  sendVoice(
    chatId: ChatId,
    voice: FileInput,
    options: Omit<SendVoiceParams, "chat_id" | "voice"> = {},
    fileOptions: FileMeta = {},
  ): Promise<SendVoiceResult> {
    return this._sendFile("sendVoice", "voice", voice, { ...options, chat_id: chatId }, fileOptions);
  }

  sendVideoNote(
    chatId: ChatId,
    videoNote: FileInput,
    options: Omit<SendVideoNoteParams, "chat_id" | "video_note"> = {},
    fileOptions: FileMeta = {},
  ): Promise<SendVideoNoteResult> {
    return this._sendFile(
      "sendVideoNote",
      "video_note",
      videoNote,
      { ...options, chat_id: chatId },
      fileOptions,
      { thumbnail: options.thumbnail as FileInput | undefined },
    );
  }

  async sendPaidMedia(
    chatId: ChatId,
    starCount: number,
    media: Array<{ type: string; media: FileInput; fileOptions?: FileMeta;[key: string]: unknown }>,
    options: Omit<SendPaidMediaParams, "chat_id" | "star_count" | "media"> = {},
  ): Promise<SendPaidMediaResult> {
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
    media: Array<{ media: FileInput; fileOptions?: FileMeta;[key: string]: unknown }>,
    options: Omit<SendMediaGroupParams, "chat_id" | "media"> = {},
  ): Promise<SendMediaGroupResult> {
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

  sendLocation(chatId: ChatId, latitude: number, longitude: number, form: Omit<SendLocationParams, "chat_id" | "latitude" | "longitude"> = {}): Promise<SendLocationResult> {
    return this._form("sendLocation", {
      ...form,
      chat_id: chatId,
      latitude,
      longitude,
    } satisfies SendLocationParams);
  }

  sendVenue(
    chatId: ChatId,
    latitude: number,
    longitude: number,
    title: string,
    address: string,
    form: Omit<SendVenueParams, "chat_id" | "latitude" | "longitude" | "title" | "address"> = {},
  ): Promise<SendVenueResult> {
    return this._form("sendVenue", {
      ...form,
      chat_id: chatId,
      latitude,
      longitude,
      title,
      address,
    } satisfies SendVenueParams);
  }

  sendContact(chatId: ChatId, phoneNumber: string, firstName: string, form: Omit<SendContactParams, "chat_id" | "phone_number" | "first_name"> = {}): Promise<SendContactResult> {
    return this._form("sendContact", {
      ...form,
      chat_id: chatId,
      phone_number: phoneNumber,
      first_name: firstName,
    } satisfies SendContactParams);
  }

  sendPoll(chatId: ChatId, question: string, pollOptions: InputPollOption[], form: Omit<SendPollParams, "chat_id" | "question" | "options"> = {}): Promise<SendPollResult> {
    const out: Record<string, unknown> = { ...form, chat_id: chatId, question, options: stringify(pollOptions) };
    if (out.country_codes) out.country_codes = stringify(out.country_codes);
    if (out.correct_option_ids) out.correct_option_ids = stringify(out.correct_option_ids);
    return this._form("sendPoll", out);
  }

  sendChecklist(
    businessConnectionId: string,
    chatId: ChatId,
    checklist: InputChecklist,
    form: Omit<SendChecklistParams, "business_connection_id" | "chat_id" | "checklist"> = {},
  ): Promise<SendChecklistResult> {
    return this._form("sendChecklist", {
      ...form,
      business_connection_id: businessConnectionId,
      chat_id: chatId,
      checklist: stringify(checklist),
    });
  }


  sendDice(chatId: ChatId, options: Omit<SendDiceParams, "chat_id"> = {}): Promise<SendDiceResult> {
    return this._form("sendDice", {
      ...options,
      chat_id: chatId,
    } satisfies SendDiceParams);
  }

  sendMessageDraft(
    chatId: ChatId,
    draftId: number,
    text: string,
    form: Omit<SendMessageDraftParams, "chat_id" | "draft_id" | "text"> = {},
  ): Promise<SendMessageDraftResult> {
    return this._form("sendMessageDraft", {
      ...form,
      chat_id: chatId,
      draft_id: draftId,
      text,
    });
  }

  sendChatAction(chatId: ChatId, action: string, form: Omit<SendChatActionParams, "chat_id" | "action"> = {}): Promise<SendChatActionResult> {
    return this._form("sendChatAction", {
      ...form,
      chat_id: chatId,
      action,
    } satisfies SendChatActionParams);
  }

  setMessageReaction(
    chatId: ChatId,
    messageId: number,
    form: Omit<SetMessageReactionParams, "chat_id" | "message_id"> = {},
  ): Promise<SetMessageReactionResult> {
    const out: Record<string, unknown> = { ...form, chat_id: chatId, message_id: messageId };
    if (out.reaction) out.reaction = stringify(out.reaction);
    return this._form("setMessageReaction", out);
  }

  editMessageLiveLocation(
    latitude: number,
    longitude: number,
    form: Omit<EditMessageLiveLocationParams, "latitude" | "longitude"> = {},
  ): Promise<EditMessageLiveLocationResult> {
    return this._form("editMessageLiveLocation", {
      ...form,
      latitude,
      longitude,
    } satisfies EditMessageLiveLocationParams);
  }

  stopMessageLiveLocation(
    form: StopMessageLiveLocationParams = {},
  ): Promise<StopMessageLiveLocationResult> {
    return this._form("stopMessageLiveLocation", form);
  }

  // --- Users -------------------------------------------------------------

  getUserProfilePhotos(
    userId: number,
    form: Omit<GetUserProfilePhotosParams, "user_id"> = {},
  ): Promise<GetUserProfilePhotosResult> {
    return this._form("getUserProfilePhotos", {
      ...form,
      user_id: userId,
    } satisfies GetUserProfilePhotosParams);
  }

  getUserProfileAudios(
    userId: number,
    form: Omit<GetUserProfileAudiosParams, "user_id"> = {},
  ): Promise<GetUserProfileAudiosResult> {
    return this._form("getUserProfileAudios", {
      ...form,
      user_id: userId,
    } satisfies GetUserProfileAudiosParams);
  }

  setUserEmojiStatus(
    userId: number,
    form: Omit<SetUserEmojiStatusParams, "user_id"> = {},
  ): Promise<SetUserEmojiStatusResult> {
    return this._form("setUserEmojiStatus", {
      ...form,
      user_id: userId,
    } satisfies SetUserEmojiStatusParams);
  }

  getFile(fileId: string, form: {} = {}): Promise<GetFileResult> {
    return this._form("getFile", {
      ...form,
      file_id: fileId,
    } satisfies GetFileParams);
  }

  getUserPersonalChatMessages(userId: number, limit: number): Promise<GetUserPersonalChatMessagesResult> {
    return this._form("getUserPersonalChatMessages", {
      user_id: userId,
      limit,
    });
  }

  // --- Chat membership --------------------------------------------------

  banChatMember(
    chatId: ChatId,
    userId: number,
    form: Omit<BanChatMemberParams, "chat_id" | "user_id"> = {},
  ): Promise<BanChatMemberResult> {
    return this._form("banChatMember", {
      ...form,
      chat_id: chatId,
      user_id: userId,
    } satisfies BanChatMemberParams);
  }

  unbanChatMember(
    chatId: ChatId,
    userId: number,
    form: Omit<UnbanChatMemberParams, "chat_id" | "user_id"> = {},
  ): Promise<UnbanChatMemberResult> {
    return this._form("unbanChatMember", {
      ...form,
      chat_id: chatId,
      user_id: userId,
    } satisfies UnbanChatMemberParams);
  }

  restrictChatMember(
    chatId: ChatId,
    userId: number,
    permissions: ChatPermissions,
    form: Omit<RestrictChatMemberParams, "chat_id" | "user_id" | "permissions"> = {},
  ): Promise<RestrictChatMemberResult> {
    return this._form("restrictChatMember", {
      ...form,
      chat_id: chatId,
      user_id: userId,
      permissions: stringify(permissions),
    });
  }

  promoteChatMember(
    chatId: ChatId,
    userId: number,
    form: Omit<PromoteChatMemberParams, "chat_id" | "user_id"> = {},
  ): Promise<PromoteChatMemberResult> {
    return this._form("promoteChatMember", {
      ...form,
      chat_id: chatId,
      user_id: userId,
    } satisfies PromoteChatMemberParams);
  }


  setChatAdministratorCustomTitle(
    chatId: ChatId,
    userId: number,
    customTitle: string,
    form: {} = {},
  ): Promise<SetChatAdministratorCustomTitleResult> {
    return this._form("setChatAdministratorCustomTitle", {
      ...form,
      chat_id: chatId,
      user_id: userId,
      custom_title: customTitle,
    } satisfies SetChatAdministratorCustomTitleParams);
  }

  setChatMemberTag(
    chatId: ChatId,
    userId: number,
    form: Omit<SetChatMemberTagParams, "chat_id" | "user_id"> = {},
  ): Promise<SetChatMemberTagResult> {
    return this._form("setChatMemberTag", {
      ...form,
      chat_id: chatId,
      user_id: userId,
    } satisfies SetChatMemberTagParams);
  }

  banChatSenderChat(
    chatId: ChatId,
    senderChatId: number,
    form: {} = {},
  ): Promise<BanChatSenderChatResult> {
    return this._form("banChatSenderChat", {
      ...form,
      chat_id: chatId,
      sender_chat_id: senderChatId,
    } satisfies BanChatSenderChatParams);
  }

  unbanChatSenderChat(
    chatId: ChatId,
    senderChatId: number,
    form: {} = {},
  ): Promise<UnbanChatSenderChatResult> {
    return this._form("unbanChatSenderChat", {
      ...form,
      chat_id: chatId,
      sender_chat_id: senderChatId,
    } satisfies UnbanChatSenderChatParams);
  }

  setChatPermissions(
    chatId: ChatId,
    permissions: ChatPermissions,
    form: Omit<SetChatPermissionsParams, "chat_id" | "permissions"> = {},
  ): Promise<SetChatPermissionsResult> {
    return this._form("setChatPermissions", {
      ...form,
      chat_id: chatId,
      permissions: stringify(permissions),
    });
  }

  // --- Chat invite links ------------------------------------------------

  exportChatInviteLink(chatId: ChatId, form: {} = {}): Promise<ExportChatInviteLinkResult> {
    return this._form("exportChatInviteLink", {
      ...form,
      chat_id: chatId,
    } satisfies ExportChatInviteLinkParams);
  }

  createChatInviteLink(
    chatId: ChatId,
    form: Omit<CreateChatInviteLinkParams, "chat_id"> = {},
  ): Promise<CreateChatInviteLinkResult> {
    return this._form("createChatInviteLink", {
      ...form,
      chat_id: chatId,
    } satisfies CreateChatInviteLinkParams);
  }

  editChatInviteLink(
    chatId: ChatId,
    inviteLink: string,
    form: Omit<EditChatInviteLinkParams, "chat_id" | "invite_link"> = {},
  ): Promise<EditChatInviteLinkResult> {
    return this._form("editChatInviteLink", {
      ...form,
      chat_id: chatId,
      invite_link: inviteLink,
    } satisfies EditChatInviteLinkParams);
  }

  createChatSubscriptionInviteLink(
    chatId: ChatId,
    subscriptionPeriod: number,
    subscriptionPrice: number,
    form: Omit<CreateChatSubscriptionInviteLinkParams, "chat_id" | "subscription_period" | "subscription_price"> = {},
  ): Promise<CreateChatSubscriptionInviteLinkResult> {
    return this._form("createChatSubscriptionInviteLink", {
      ...form,
      chat_id: chatId,
      subscription_period: subscriptionPeriod,
      subscription_price: subscriptionPrice,
    } satisfies CreateChatSubscriptionInviteLinkParams);
  }

  editChatSubscriptionInviteLink(
    chatId: ChatId,
    inviteLink: string,
    form: Omit<EditChatSubscriptionInviteLinkParams, "chat_id" | "invite_link"> = {},
  ): Promise<EditChatSubscriptionInviteLinkResult> {
    return this._form("editChatSubscriptionInviteLink", {
      ...form,
      chat_id: chatId,
      invite_link: inviteLink,
    } satisfies EditChatSubscriptionInviteLinkParams);
  }

  revokeChatInviteLink(chatId: ChatId, inviteLink: string, form: {} = {}): Promise<RevokeChatInviteLinkResult> {
    return this._form("revokeChatInviteLink", {
      ...form,
      chat_id: chatId,
      invite_link: inviteLink,
    } satisfies RevokeChatInviteLinkParams);
  }

  approveChatJoinRequest(chatId: ChatId, userId: number, form: {} = {}): Promise<ApproveChatJoinRequestResult> {
    return this._form("approveChatJoinRequest", {
      ...form,
      chat_id: chatId,
      user_id: userId,
    } satisfies ApproveChatJoinRequestParams);
  }

  declineChatJoinRequest(chatId: ChatId, userId: number, form: {} = {}): Promise<DeclineChatJoinRequestResult> {
    return this._form("declineChatJoinRequest", {
      ...form,
      chat_id: chatId,
      user_id: userId,
    } satisfies DeclineChatJoinRequestParams);
  }

  // --- Chat metadata ---------------------------------------------------

  setChatPhoto(
    chatId: ChatId,
    photo: FileInput,
    options: {} = {},
    fileOptions: FileMeta = {},
  ): Promise<SetChatPhotoResult> {
    return this._sendFile("setChatPhoto", "photo", photo, { ...options, chat_id: chatId }, fileOptions);
  }

  deleteChatPhoto(chatId: ChatId, form: {} = {}): Promise<DeleteChatPhotoResult> {
    return this._form("deleteChatPhoto", {
      ...form,
      chat_id: chatId,
    } satisfies DeleteChatPhotoParams);
  }

  setChatTitle(chatId: ChatId, title: string, form: {} = {}): Promise<SetChatTitleResult> {
    return this._form("setChatTitle", {
      ...form,
      chat_id: chatId,
      title,
    } satisfies SetChatTitleParams);
  }

  setChatDescription(chatId: ChatId, description: string, form: {} = {}): Promise<SetChatDescriptionResult> {
    return this._form("setChatDescription", {
      ...form,
      chat_id: chatId,
      description,
    } satisfies SetChatDescriptionParams);
  }

  pinChatMessage(
    chatId: ChatId,
    messageId: number,
    form: Omit<PinChatMessageParams, "chat_id" | "message_id"> = {},
  ): Promise<PinChatMessageResult> {
    return this._form("pinChatMessage", {
      ...form,
      chat_id: chatId,
      message_id: messageId,
    } satisfies PinChatMessageParams);
  }

  unpinChatMessage(
    chatId: ChatId,
    form: Omit<UnpinChatMessageParams, "chat_id"> = {},
  ): Promise<UnpinChatMessageResult> {
    return this._form("unpinChatMessage", {
      ...form,
      chat_id: chatId,
    } satisfies UnpinChatMessageParams);
  }

  unpinAllChatMessages(chatId: ChatId, form: {} = {}): Promise<UnpinAllChatMessagesResult> {
    return this._form("unpinAllChatMessages", {
      ...form,
      chat_id: chatId,
    } satisfies UnpinAllChatMessagesParams);
  }

  leaveChat(chatId: ChatId, form: {} = {}): Promise<LeaveChatResult> {
    return this._form("leaveChat", {
      ...form,
      chat_id: chatId,
    } satisfies LeaveChatParams);
  }

  getChat(chatId: ChatId, form: {} = {}): Promise<GetChatResult> {
    return this._form("getChat", {
      ...form,
      chat_id: chatId,
    } satisfies GetChatParams);
  }

  getChatAdministrators(
    chatId: ChatId,
    form: Omit<GetChatAdministratorsParams, "chat_id"> = {},
  ): Promise<GetChatAdministratorsResult> {
    return this._form("getChatAdministrators", {
      ...form,
      chat_id: chatId,
    } satisfies GetChatAdministratorsParams);
  }

  getChatMemberCount(chatId: ChatId, form: {} = {}): Promise<GetChatMemberCountResult> {
    return this._form("getChatMemberCount", {
      ...form,
      chat_id: chatId,
    } satisfies GetChatMemberCountParams);
  }

  getChatMember(chatId: ChatId, userId: number, form: {} = {}): Promise<GetChatMemberResult> {
    return this._form("getChatMember", {
      ...form,
      chat_id: chatId,
      user_id: userId,
    } satisfies GetChatMemberParams);
  }

  setChatStickerSet(chatId: ChatId, stickerSetName: string, form: {} = {}): Promise<SetChatStickerSetResult> {
    return this._form("setChatStickerSet", {
      ...form,
      chat_id: chatId,
      sticker_set_name: stickerSetName,
    } satisfies SetChatStickerSetParams);
  }

  deleteChatStickerSet(chatId: ChatId, form: {} = {}): Promise<DeleteChatStickerSetResult> {
    return this._form("deleteChatStickerSet", {
      ...form,
      chat_id: chatId,
    } satisfies DeleteChatStickerSetParams);
  }

  // --- Forum topics -----------------------------------------------------

  getForumTopicIconStickers(form: GetForumTopicIconStickersParams = {}): Promise<GetForumTopicIconStickersResult> {
    return this._form("getForumTopicIconStickers", form);
  }

  createForumTopic(
    chatId: ChatId,
    name: string,
    form: Omit<CreateForumTopicParams, "chat_id" | "name"> = {},
  ): Promise<CreateForumTopicResult> {
    return this._form("createForumTopic", {
      ...form,
      chat_id: chatId,
      name,
    } satisfies CreateForumTopicParams);
  }

  editForumTopic(
    chatId: ChatId,
    messageThreadId: number,
    form: Omit<EditForumTopicParams, "chat_id" | "message_thread_id"> = {},
  ): Promise<EditForumTopicResult> {
    return this._form("editForumTopic", {
      ...form,
      chat_id: chatId,
      message_thread_id: messageThreadId,
    } satisfies EditForumTopicParams);
  }

  closeForumTopic(chatId: ChatId, messageThreadId: number, form: {} = {}): Promise<CloseForumTopicResult> {
    return this._form("closeForumTopic", {
      ...form,
      chat_id: chatId,
      message_thread_id: messageThreadId,
    } satisfies CloseForumTopicParams);
  }

  reopenForumTopic(chatId: ChatId, messageThreadId: number, form: {} = {}): Promise<ReopenForumTopicResult> {
    return this._form("reopenForumTopic", {
      ...form,
      chat_id: chatId,
      message_thread_id: messageThreadId,
    } satisfies ReopenForumTopicParams);
  }

  deleteForumTopic(chatId: ChatId, messageThreadId: number, form: {} = {}): Promise<DeleteForumTopicResult> {
    return this._form("deleteForumTopic", {
      ...form,
      chat_id: chatId,
      message_thread_id: messageThreadId,
    } satisfies DeleteForumTopicParams);
  }

  unpinAllForumTopicMessages(chatId: ChatId, messageThreadId: number, form: {} = {}): Promise<UnpinAllForumTopicMessagesResult> {
    return this._form("unpinAllForumTopicMessages", {
      ...form,
      chat_id: chatId,
      message_thread_id: messageThreadId,
    } satisfies UnpinAllForumTopicMessagesParams);
  }

  editGeneralForumTopic(chatId: ChatId, name: string, form: {} = {}): Promise<EditGeneralForumTopicResult> {
    return this._form("editGeneralForumTopic", {
      ...form,
      chat_id: chatId,
      name,
    } satisfies EditGeneralForumTopicParams);
  }

  closeGeneralForumTopic(chatId: ChatId, form: {} = {}): Promise<CloseGeneralForumTopicResult> {
    return this._form("closeGeneralForumTopic", {
      ...form,
      chat_id: chatId,
    } satisfies CloseGeneralForumTopicParams);
  }

  reopenGeneralForumTopic(chatId: ChatId, form: {} = {}): Promise<ReopenGeneralForumTopicResult> {
    return this._form("reopenGeneralForumTopic", {
      ...form,
      chat_id: chatId,
    } satisfies ReopenGeneralForumTopicParams);
  }

  hideGeneralForumTopic(chatId: ChatId, form: {} = {}): Promise<HideGeneralForumTopicResult> {
    return this._form("hideGeneralForumTopic", {
      ...form,
      chat_id: chatId,
    } satisfies HideGeneralForumTopicParams);
  }

  unhideGeneralForumTopic(chatId: ChatId, form: {} = {}): Promise<UnhideGeneralForumTopicResult> {
    return this._form("unhideGeneralForumTopic", {
      ...form,
      chat_id: chatId,
    } satisfies UnhideGeneralForumTopicParams);
  }

  unpinAllGeneralForumTopicMessages(chatId: ChatId, form: {} = {}): Promise<UnpinAllGeneralForumTopicMessagesResult> {
    return this._form("unpinAllGeneralForumTopicMessages", {
      ...form,
      chat_id: chatId,
    } satisfies UnpinAllGeneralForumTopicMessagesParams);
  }

  // --- Callback / inline queries ---------------------------------------

  answerCallbackQuery(callbackQueryId: string, form: Omit<AnswerCallbackQueryParams, "callback_query_id"> = {}): Promise<AnswerCallbackQueryResult> {
    return this._form("answerCallbackQuery", {
      ...form,
      callback_query_id: callbackQueryId,
    } satisfies AnswerCallbackQueryParams);
  }

  answerGuestQuery(guestQueryId: string, result: InlineQueryResult): Promise<AnswerGuestQueryResult> {
    return this._form("answerGuestQuery", {
      guest_query_id: guestQueryId,
      result: stringify(result),
    });
  }

  savePreparedInlineMessage(
    userId: number,
    result: InlineQueryResult,
    form: Omit<SavePreparedInlineMessageParams, "user_id" | "result"> = {},
  ): Promise<SavePreparedInlineMessageResult> {
    return this._form("savePreparedInlineMessage", {
      ...form,
      user_id: userId,
      result: stringify(result),
    });
  }

  savePreparedKeyboardButton(
    userId: number,
    button: KeyboardButton,
    form: Omit<SavePreparedKeyboardButtonParams, "user_id" | "button"> = {},
  ): Promise<SavePreparedKeyboardButtonResult> {
    return this._form("savePreparedKeyboardButton", {
      ...form,
      user_id: userId,
      button,
    } satisfies SavePreparedKeyboardButtonParams);
  }

  getUserChatBoosts(chatId: ChatId, userId: number, form: {} = {}): Promise<GetUserChatBoostsResult> {
    return this._form("getUserChatBoosts", {
      ...form,
      chat_id: chatId,
      user_id: userId,
    } satisfies GetUserChatBoostsParams);
  }

  getBusinessConnection(businessConnectionId: string, form: {} = {}): Promise<GetBusinessConnectionResult> {
    return this._form("getBusinessConnection", {
      ...form,
      business_connection_id: businessConnectionId,
    } satisfies GetBusinessConnectionParams);
  }

  getManagedBotToken(userId: number, form: {} = {}): Promise<GetManagedBotTokenResult> {
    return this._form("getManagedBotToken", {
      ...form,
      user_id: userId,
    } satisfies GetManagedBotTokenParams);
  }

  replaceManagedBotToken(userId: number, form: {} = {}): Promise<ReplaceManagedBotTokenResult> {
    return this._form("replaceManagedBotToken", {
      ...form,
      user_id: userId,
    } satisfies ReplaceManagedBotTokenParams);
  }

  getManagedBotAccessSettings(userId: number, form: {} = {}): Promise<GetManagedBotAccessSettingsResult> {
    return this._form("getManagedBotAccessSettings", {
      ...form,
      user_id: userId,
    } satisfies GetManagedBotAccessSettingsParams);
  }

  setManagedBotAccessSettings(
    userId: number,
    isAccessRestricted: boolean,
    form: Omit<SetManagedBotAccessSettingsParams, "user_id" | "is_access_restricted"> = {},
  ): Promise<SetManagedBotAccessSettingsResult> {
    const out: Record<string, unknown> = {
      user_id: userId,
      is_access_restricted: isAccessRestricted,
    };
    if (form.added_user_ids) out.added_user_ids = stringify(form.added_user_ids);
    return this._form("setManagedBotAccessSettings", out);
  }

  // --- Bot identity (self-management) ----------------------------------

  setMyCommands(
    commands: BotCommand[],
    form: Omit<SetMyCommandsParams, "commands"> = {},
  ): Promise<SetMyCommandsResult> {
    const out: Record<string, unknown> = { ...form, commands: stringify(commands) };
    if (out.scope) out.scope = stringify(out.scope);
    return this._form("setMyCommands", out);
  }

  deleteMyCommands(
    form: DeleteMyCommandsParams = {},
  ): Promise<DeleteMyCommandsResult> {
    const out: Record<string, unknown> = { ...form };
    if (out.scope) out.scope = stringify(out.scope);
    return this._form("deleteMyCommands", out);
  }

  getMyCommands(
    form: GetMyCommandsParams = {},
  ): Promise<GetMyCommandsResult> {
    const out: Record<string, unknown> = { ...form };
    if (out.scope) out.scope = stringify(out.scope);
    return this._form("getMyCommands", out);
  }

  setMyName(form: SetMyNameParams = {}): Promise<SetMyNameResult> {
    return this._form("setMyName", form);
  }

  getMyName(form: GetMyNameParams = {}): Promise<GetMyNameResult> {
    return this._form("getMyName", form);
  }

  setMyDescription(form: SetMyDescriptionParams = {}): Promise<SetMyDescriptionResult> {
    return this._form("setMyDescription", form);
  }

  getMyDescription(form: GetMyDescriptionParams = {}): Promise<GetMyDescriptionResult> {
    return this._form("getMyDescription", form);
  }

  setMyShortDescription(
    form: SetMyShortDescriptionParams = {},
  ): Promise<SetMyShortDescriptionResult> {
    return this._form("setMyShortDescription", form);
  }

  getMyShortDescription(form: GetMyShortDescriptionParams = {}): Promise<GetMyShortDescriptionResult> {
    return this._form("getMyShortDescription", form);
  }

  async setMyProfilePhoto(
    photo: InputProfilePhotoInput,
    form: {} = {},
  ): Promise<SetMyProfilePhotoResult> {
    const fieldName = photo.type === "static" ? "photo" : "animation";
    const fileInput = (photo as Record<string, unknown>)[fieldName] as FileInput;
    const { file } = await prepareFile(fileInput, {}, this.options.filepath);
    if (!file) {
      throw new FatalError("setMyProfilePhoto only supports file uploads (Buffer, Stream, or local path)");
    }
    const struct = { ...photo, [fieldName]: `attach://${fieldName}` };
    return this._request<boolean>("setMyProfilePhoto", {
      qs: { ...form, photo: stringify(struct) },
      formData: { [fieldName]: file },
    });
  }

  removeMyProfilePhoto(form: RemoveMyProfilePhotoParams = {}): Promise<RemoveMyProfilePhotoResult> {
    return this._form("removeMyProfilePhoto", form);
  }

  setChatMenuButton(
    form: SetChatMenuButtonParams = {},
  ): Promise<SetChatMenuButtonResult> {
    return this._form("setChatMenuButton", form satisfies SetChatMenuButtonParams);
  }

  getChatMenuButton(form: GetChatMenuButtonParams = {}): Promise<GetChatMenuButtonResult> {
    return this._form("getChatMenuButton", form);
  }

  setMyDefaultAdministratorRights(
    form: SetMyDefaultAdministratorRightsParams = {},
  ): Promise<SetMyDefaultAdministratorRightsResult> {
    return this._form("setMyDefaultAdministratorRights", form);
  }
  getMyDefaultAdministratorRights(form: GetMyDefaultAdministratorRightsParams = {}): Promise<GetMyDefaultAdministratorRightsResult> {
    return this._form("getMyDefaultAdministratorRights", form);
  }

  // --- Editing messages -------------------------------------------------

  editMessageText(
    text: string,
    form: Omit<EditMessageTextParams, "text"> = {},
  ): Promise<EditMessageTextResult> {
    return this._form("editMessageText", {
      ...form,
      text,
    } satisfies EditMessageTextParams);
  }
  editMessageCaption(
    caption: string,
    form: Omit<EditMessageCaptionParams, "caption"> = {},
  ): Promise<EditMessageCaptionResult> {
    return this._form("editMessageCaption", {
      ...form,
      caption,
    } satisfies EditMessageCaptionParams);
  }
  async editMessageMedia(
    media: InputMedia & { fileOptions?: FileMeta },
    form: Omit<EditMessageMediaParams, "media"> = {},
  ): Promise<EditMessageMediaResult> {
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
    checklist: InputChecklist,
    form: Omit<EditMessageChecklistParams, "business_connection_id" | "chat_id" | "message_id" | "checklist"> = {},
  ): Promise<EditMessageChecklistResult> {
    return this._form("editMessageChecklist", {
      ...form,
      business_connection_id: businessConnectionId,
      chat_id: chatId,
      message_id: messageId,
      checklist,
    } satisfies EditMessageChecklistParams);
  }

  editMessageReplyMarkup(
    replyMarkup: InlineKeyboardMarkup,
    form: Omit<EditMessageReplyMarkupParams, "reply_markup"> = {},
  ): Promise<EditMessageReplyMarkupResult> {
    return this._form("editMessageReplyMarkup", {
      ...form,
      reply_markup: replyMarkup,
    } satisfies EditMessageReplyMarkupParams);
  }

  stopPoll(
    chatId: ChatId,
    pollId: number,
    form: Omit<StopPollParams, "chat_id" | "message_id"> = {},
  ): Promise<StopPollResult> {
    return this._form("stopPoll", {
      ...form,
      chat_id: chatId,
      message_id: pollId,
    } satisfies StopPollParams);
  }

  // --- Suggested posts --------------------------------------------------

  approveSuggestedPost(
    chatId: number,
    messageId: number,
    form: Omit<ApproveSuggestedPostParams, "chat_id" | "message_id"> = {},
  ): Promise<ApproveSuggestedPostResult> {
    return this._form("approveSuggestedPost", {
      ...form,
      chat_id: chatId,
      message_id: messageId,
    } satisfies ApproveSuggestedPostParams);
  }

  declineSuggestedPost(
    chatId: number,
    messageId: number,
    form: Omit<DeclineSuggestedPostParams, "chat_id" | "message_id"> = {},
  ): Promise<DeclineSuggestedPostResult> {
    return this._form("declineSuggestedPost", {
      ...form,
      chat_id: chatId,
      message_id: messageId,
    } satisfies DeclineSuggestedPostParams);
  }

  // --- Stickers --------------------------------------------------------

  sendSticker(
    chatId: ChatId,
    sticker: FileInput,
    options: Omit<SendStickerParams, "chat_id" | "sticker"> = {},
    fileOptions: FileMeta = {},
  ): Promise<SendStickerResult> {
    return this._sendFile("sendSticker", "sticker", sticker, { ...options, chat_id: chatId }, fileOptions);
  }
  getStickerSet(name: string, form: {} = {}): Promise<GetStickerSetResult> {
    return this._form("getStickerSet", {
      ...form,
      name,
    } satisfies GetStickerSetParams);
  }

  getCustomEmojiStickers(customEmojiIds: string[], form: {} = {}): Promise<GetCustomEmojiStickersResult> {
    return this._form("getCustomEmojiStickers", {
      ...form,
      custom_emoji_ids: customEmojiIds,
    } satisfies GetCustomEmojiStickersParams);
  }

  uploadStickerFile(
    userId: number,
    sticker: FileInput,
    stickerFormat: "static" | "animated" | "video" = "static",
    options: {} = {},
    fileOptions: FileMeta = {},
  ): Promise<UploadStickerFileResult> {
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
    options: { mask_position?: MaskPosition; sticker_type?: string; needs_repainting?: boolean } = {},
    fileOptions: FileMeta = {},
  ): Promise<CreateNewStickerSetResult> {
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
    options: { mask_position?: MaskPosition } = {},
    fileOptions: FileMeta = {},
  ): Promise<AddStickerToSetResult> {
    if (!["png_sticker", "tgs_sticker", "webm_sticker"].includes(stickerType)) {
      return Promise.reject(new Error("stickerType must be one of: png_sticker, tgs_sticker, webm_sticker"));
    }
    const qs: Record<string, unknown> = { ...options, user_id: userId, name, emojis };
    if (options.mask_position) qs.mask_position = stringify(options.mask_position);
    return this._sendFile("addStickerToSet", stickerType, sticker, qs, fileOptions);
  }

  setStickerPositionInSet(sticker: string, position: number, form: {} = {}): Promise<SetStickerPositionInSetResult> {
    return this._form("setStickerPositionInSet", {
      ...form,
      sticker,
      position,
    } satisfies SetStickerPositionInSetParams);
  }

  deleteStickerFromSet(sticker: string, form: {} = {}): Promise<DeleteStickerFromSetResult> {
    return this._form("deleteStickerFromSet", {
      ...form,
      sticker,
    } satisfies DeleteStickerFromSetParams);
  }

  replaceStickerInSet(
    userId: number,
    name: string,
    oldSticker: string,
    form: Omit<ReplaceStickerInSetParams, "user_id" | "name" | "old_sticker">,
  ): Promise<ReplaceStickerInSetResult> {
    return this._form("replaceStickerInSet", {
      ...form,
      user_id: userId,
      name,
      old_sticker: oldSticker,
    } satisfies ReplaceStickerInSetParams);
  }

  setStickerEmojiList(sticker: string, emojiList: string[], form: {} = {}): Promise<SetStickerEmojiListResult> {
    return this._form("setStickerEmojiList", {
      ...form,
      sticker,
      emoji_list: emojiList,
    } satisfies SetStickerEmojiListParams);
  }

  setStickerKeywords(
    sticker: string,
    form: Omit<SetStickerKeywordsParams, "sticker"> = {},
  ): Promise<SetStickerKeywordsResult> {
    return this._form("setStickerKeywords", { ...form, sticker } satisfies SetStickerKeywordsParams);
  }

  setStickerMaskPosition(
    sticker: string,
    form: Omit<SetStickerMaskPositionParams, "sticker"> = {},
  ): Promise<SetStickerMaskPositionResult> {
    return this._form("setStickerMaskPosition", { ...form, sticker } satisfies SetStickerMaskPositionParams);
  }

  setStickerSetTitle(name: string, title: string, form: {} = {}): Promise<SetStickerSetTitleResult> {
    return this._form("setStickerSetTitle", {
      ...form,
      name,
      title,
    } satisfies SetStickerSetTitleParams);
  }
  setStickerSetThumbnail(
    userId: number,
    name: string,
    thumbnail: FileInput,
    options: { format?: "static" | "animated" | "video" } = {},
    fileOptions: FileMeta = {},
  ): Promise<SetStickerSetThumbnailResult> {
    return this._sendFile(
      "setStickerSetThumbnail",
      "thumbnail",
      thumbnail,
      { ...options, user_id: userId, name },
      fileOptions,
    );
  }

  setCustomEmojiStickerSetThumbnail(
    name: string,
    form: Omit<SetCustomEmojiStickerSetThumbnailParams, "name"> = {},
  ): Promise<SetCustomEmojiStickerSetThumbnailResult> {
    return this._form("setCustomEmojiStickerSetThumbnail", {
      ...form,
      name,
    } satisfies SetCustomEmojiStickerSetThumbnailParams);
  }

  deleteStickerSet(name: string, form: {} = {}): Promise<DeleteStickerSetResult> {
    return this._form("deleteStickerSet", {
      ...form,
      name,
    } satisfies DeleteStickerSetParams);
  }

  // --- Inline / web app -------------------------------------------------

  answerInlineQuery(
    inlineQueryId: string,
    results: InlineQueryResult[],
    form: Omit<AnswerInlineQueryParams, "inline_query_id" | "results"> = {},
  ): Promise<AnswerInlineQueryResult> {
    return this._form("answerInlineQuery", {
      ...form,
      inline_query_id: inlineQueryId,
      results,
    } satisfies AnswerInlineQueryParams);
  }

  answerWebAppQuery(
    webAppQueryId: string,
    result: InlineQueryResult,
    form: Omit<AnswerWebAppQueryParams, "web_app_query_id" | "result"> = {},
  ): Promise<AnswerWebAppQueryResult> {
    return this._form("answerWebAppQuery", {
      ...form,
      web_app_query_id: webAppQueryId,
      result: stringify(result),
    });
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
    form: Omit<SendInvoiceParams, "chat_id" | "title" | "description" | "payload" | "provider_token" | "currency" | "prices"> = {},
  ): Promise<SendInvoiceResult> {
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
    form: Omit<
      CreateInvoiceLinkParams,
      "title" | "description" | "payload" | "provider_token" | "currency" | "prices"
    > = {},
  ): Promise<CreateInvoiceLinkResult> {
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
  answerShippingQuery(
    shippingQueryId: string,
    ok: boolean,
    form: Omit<AnswerShippingQueryParams, "shipping_query_id" | "ok"> = {},
  ): Promise<AnswerShippingQueryResult> {
    const out: Record<string, unknown> = { ...form, shipping_query_id: shippingQueryId, ok };
    if (out.shipping_options) out.shipping_options = stringify(out.shipping_options);
    return this._form("answerShippingQuery", out);
  }

  answerPreCheckoutQuery(
    preCheckoutQueryId: string,
    ok: boolean,
    form: Omit<AnswerPreCheckoutQueryParams, "pre_checkout_query_id" | "ok"> = {},
  ): Promise<AnswerPreCheckoutQueryResult> {
    return this._form("answerPreCheckoutQuery", {
      ...form,
      pre_checkout_query_id: preCheckoutQueryId,
      ok,
    } satisfies AnswerPreCheckoutQueryParams);
  }

  // --- Telegram Stars --------------------------------------------------

  getMyStarBalance(form: GetMyStarBalanceParams = {}): Promise<GetMyStarBalanceResult> {
    return this._form("getMyStarBalance", form);
  }

  getStarTransactions(form: GetStarTransactionsParams = {}): Promise<GetStarTransactionsResult> {
    return this._form("getStarTransactions", form);
  }

  refundStarPayment(
    userId: number,
    telegramPaymentChargeId: string,
    form: {} = {},
  ): Promise<RefundStarPaymentResult> {
    return this._form("refundStarPayment", {
      ...form,
      user_id: userId,
      telegram_payment_charge_id: telegramPaymentChargeId,
    } satisfies RefundStarPaymentParams);
  }

  editUserStarSubscription(
    userId: number,
    telegramPaymentChargeId: string,
    isCanceled: boolean,
    form: {} = {},
  ): Promise<EditUserStarSubscriptionResult> {
    return this._form("editUserStarSubscription", {
      ...form,
      user_id: userId,
      telegram_payment_charge_id: telegramPaymentChargeId,
      is_canceled: isCanceled,
    } satisfies EditUserStarSubscriptionParams);
  }

  // --- Games -----------------------------------------------------------

  sendGame(
    chatId: ChatId,
    gameShortName: string,
    form: Omit<SendGameParams, "chat_id" | "game_short_name"> = {},
  ): Promise<SendGameResult> {
    return this._form("sendGame", {
      ...form,
      chat_id: chatId,
      game_short_name: gameShortName,
    } satisfies SendGameParams);
  }

  setGameScore(
    userId: number,
    score: number,
    form: Omit<SetGameScoreParams, "user_id" | "score"> = {},
  ): Promise<SetGameScoreResult> {
    return this._form("setGameScore", {
      ...form,
      user_id: userId,
      score,
    } satisfies SetGameScoreParams);
  }

  getGameHighScores(
    userId: number,
    form: { chat_id?: number; message_id?: number; inline_message_id?: string } = {},
  ): Promise<GetGameHighScoresResult> {
    return this._form("getGameHighScores", {
      ...form,
      user_id: userId,
    } satisfies GetGameHighScoresParams);
  }

  // --- Delete messages ------------------------------------------------

  deleteMessage(chatId: ChatId, messageId: number, form: {} = {}): Promise<DeleteMessageResult> {
    return this._form("deleteMessage", {
      ...form,
      chat_id: chatId,
      message_id: messageId,
    } satisfies DeleteMessageParams);
  }

  deleteMessages(chatId: ChatId, messageIds: number[], form: {} = {}): Promise<DeleteMessagesResult> {
    return this._form("deleteMessages", {
      ...form,
      chat_id: chatId,
      message_ids: stringify(messageIds),
    });
  }

  deleteMessageReaction(
    chatId: ChatId,
    messageId: number,
    form: { user_id?: number; actor_chat_id?: number } = {},
  ): Promise<DeleteMessageReactionResult> {
    return this._form("deleteMessageReaction", {
      ...form,
      chat_id: chatId,
      message_id: messageId,
    } satisfies DeleteMessageReactionParams);
  }

  deleteAllMessageReactions(
    chatId: ChatId,
    form: { user_id?: number; actor_chat_id?: number } = {},
  ): Promise<DeleteAllMessageReactionsResult> {
    return this._form("deleteAllMessageReactions", {
      ...form,
      chat_id: chatId,
    } satisfies DeleteAllMessageReactionsParams);
  }
  // --- Gifts -----------------------------------------------------------

  getAvailableGifts(form: GetAvailableGiftsParams = {}): Promise<GetAvailableGiftsResult> {
    return this._form("getAvailableGifts", form);
  }

  sendGift(
    giftId: string,
    form: Omit<SendGiftParams, "gift_id"> = {},
  ): Promise<SendGiftResult> {
    return this._form("sendGift", {
      ...form,
      gift_id: giftId,
    } satisfies SendGiftParams);
  }

  giftPremiumSubscription(
    userId: number,
    monthCount: number,
    starCount: number,
    form: Omit<GiftPremiumSubscriptionParams, "user_id" | "month_count" | "star_count"> = {},
  ): Promise<GiftPremiumSubscriptionResult> {
    return this._form("giftPremiumSubscription", {
      ...form,
      user_id: userId,
      month_count: monthCount,
      star_count: starCount,
    } satisfies GiftPremiumSubscriptionParams);
  }

  // --- Verification ---------------------------------------------------

  verifyUser(
    userId: number,
    form: Omit<VerifyUserParams, "user_id"> = {},
  ): Promise<VerifyUserResult> {
    return this._form("verifyUser", {
      ...form,
      user_id: userId,
    } satisfies VerifyUserParams);
  }

  verifyChat(
    chatId: ChatId,
    form: Omit<VerifyChatParams, "chat_id"> = {},
  ): Promise<VerifyChatResult> {
    return this._form("verifyChat", {
      ...form,
      chat_id: chatId,
    } satisfies VerifyChatParams);
  }

  removeUserVerification(userId: number, form: {} = {}): Promise<RemoveUserVerificationResult> {
    return this._form("removeUserVerification", {
      ...form,
      user_id: userId,
    } satisfies RemoveUserVerificationParams);
  }

  removeChatVerification(chatId: ChatId, form: {} = {}): Promise<RemoveChatVerificationResult> {
    return this._form("removeChatVerification", {
      ...form,
      chat_id: chatId,
    } satisfies RemoveChatVerificationParams);
  }

  // --- Business accounts ----------------------------------------------

  readBusinessMessage(
    businessConnectionId: string,
    chatId: number,
    messageId: number,
    form: {} = {},
  ): Promise<ReadBusinessMessageResult> {
    return this._form("readBusinessMessage", {
      ...form,
      business_connection_id: businessConnectionId,
      chat_id: chatId,
      message_id: messageId,
    } satisfies ReadBusinessMessageParams);
  }

  deleteBusinessMessages(
    businessConnectionId: string,
    messageIds: number[],
    form: {} = {},
  ): Promise<DeleteBusinessMessagesResult> {
    return this._form("deleteBusinessMessages", {
      ...form,
      business_connection_id: businessConnectionId,
      message_ids: messageIds,
    } satisfies DeleteBusinessMessagesParams);
  }

  setBusinessAccountName(
    businessConnectionId: string,
    firstName: string,
    form: Omit<SetBusinessAccountNameParams, "business_connection_id" | "first_name"> = {},
  ): Promise<SetBusinessAccountNameResult> {
    return this._form("setBusinessAccountName", {
      ...form,
      business_connection_id: businessConnectionId,
      first_name: firstName,
    } satisfies SetBusinessAccountNameParams);
  }

  setBusinessAccountUsername(
    businessConnectionId: string,
    form: Omit<SetBusinessAccountUsernameParams, "business_connection_id"> = {},
  ): Promise<SetBusinessAccountUsernameResult> {
    return this._form("setBusinessAccountUsername", {
      ...form,
      business_connection_id: businessConnectionId,
    } satisfies SetBusinessAccountUsernameParams);
  }

  setBusinessAccountBio(
    businessConnectionId: string,
    form: Omit<SetBusinessAccountBioParams, "business_connection_id"> = {},
  ): Promise<SetBusinessAccountBioResult> {
    return this._form("setBusinessAccountBio", {
      ...form,
      business_connection_id: businessConnectionId,
    } satisfies SetBusinessAccountBioParams);
  }

  async setBusinessAccountProfilePhoto(
    businessConnectionId: string,
    photo: InputProfilePhotoInput,
    form: Omit<SetBusinessAccountProfilePhotoParams, "business_connection_id" | "photo"> = {},
  ): Promise<SetBusinessAccountProfilePhotoResult> {
    const fieldName = photo.type === "static" ? "photo" : "animation";
    const fileInput = (photo as Record<string, unknown>)[fieldName] as FileInput;
    const { file } = await prepareFile(fileInput, {}, this.options.filepath);
    if (!file) {
      throw new FatalError("setBusinessAccountProfilePhoto only supports file uploads (Buffer, Stream, or local path)");
    }
    const struct = { ...photo, [fieldName]: `attach://${fieldName}` };
    return this._request<boolean>("setBusinessAccountProfilePhoto", {
      qs: { ...form, photo: stringify(struct), business_connection_id: businessConnectionId },
      formData: { [fieldName]: file },
    });
  }

  removeBusinessAccountProfilePhoto(
    businessConnectionId: string,
    form: Omit<RemoveBusinessAccountProfilePhotoParams, "business_connection_id"> = {},
  ): Promise<RemoveBusinessAccountProfilePhotoResult> {
    return this._form("removeBusinessAccountProfilePhoto", {
      ...form,
      business_connection_id: businessConnectionId,
    } satisfies RemoveBusinessAccountProfilePhotoParams);
  }

  setBusinessAccountGiftSettings(
    businessConnectionId: string,
    showGiftButton: boolean,
    acceptedGiftTypes: AcceptedGiftTypes,
    form: Omit<SetBusinessAccountGiftSettingsParams, "business_connection_id" | "show_gift_button" | "accepted_gift_types"> = {},
  ): Promise<SetBusinessAccountGiftSettingsResult> {
    return this._form("setBusinessAccountGiftSettings", {
      ...form,
      business_connection_id: businessConnectionId,
      show_gift_button: showGiftButton,
      accepted_gift_types: acceptedGiftTypes,
    } satisfies SetBusinessAccountGiftSettingsParams);
  }

  getBusinessAccountStarBalance(businessConnectionId: string, form: {} = {}): Promise<GetBusinessAccountStarBalanceResult> {
    return this._form("getBusinessAccountStarBalance", {
      ...form,
      business_connection_id: businessConnectionId,
    } satisfies GetBusinessAccountStarBalanceParams);
  }

  transferBusinessAccountStars(
    businessConnectionId: string,
    starCount: number,
    form: {} = {},
  ): Promise<TransferBusinessAccountStarsResult> {
    return this._form("transferBusinessAccountStars", {
      ...form,
      business_connection_id: businessConnectionId,
      star_count: starCount,
    } satisfies TransferBusinessAccountStarsParams);
  }

  getBusinessAccountGifts(
    businessConnectionId: string,
    form: Omit<GetBusinessAccountGiftsParams, "business_connection_id"> = {},
  ): Promise<GetBusinessAccountGiftsResult> {
    return this._form("getBusinessAccountGifts", {
      ...form,
      business_connection_id: businessConnectionId,
    } satisfies GetBusinessAccountGiftsParams);
  }

  getUserGifts(
    userId: number,
    form: Omit<GetUserGiftsParams, "user_id"> = {},
  ): Promise<GetUserGiftsResult> {
    return this._form("getUserGifts", {
      ...form,
      user_id: userId,
    } satisfies GetUserGiftsParams);
  }

  getChatGifts(
    chatId: ChatId,
    form: Omit<GetChatGiftsParams, "chat_id"> = {},
  ): Promise<GetChatGiftsResult> {
    return this._form("getChatGifts", {
      ...form,
      chat_id: chatId,
    } satisfies GetChatGiftsParams);
  }

  convertGiftToStars(
    businessConnectionId: string,
    ownedGiftId: string,
    form: {} = {},
  ): Promise<ConvertGiftToStarsResult> {
    return this._form("convertGiftToStars", {
      ...form,
      business_connection_id: businessConnectionId,
      owned_gift_id: ownedGiftId,
    } satisfies ConvertGiftToStarsParams);
  }

  upgradeGift(
    businessConnectionId: string,
    ownedGiftId: string,
    form: Omit<UpgradeGiftParams, "business_connection_id" | "owned_gift_id"> = {},
  ): Promise<UpgradeGiftResult> {
    return this._form("upgradeGift", {
      ...form,
      business_connection_id: businessConnectionId,
      owned_gift_id: ownedGiftId,
    } satisfies UpgradeGiftParams);
  }

  transferGift(
    businessConnectionId: string,
    ownedGiftId: string,
    newOwnerChatId: number,
    form: Omit<TransferGiftParams, "business_connection_id" | "owned_gift_id" | "new_owner_chat_id"> = {},
  ): Promise<TransferGiftResult> {
    return this._form("transferGift", {
      ...form,
      business_connection_id: businessConnectionId,
      owned_gift_id: ownedGiftId,
      new_owner_chat_id: newOwnerChatId,
    } satisfies TransferGiftParams);
  }

  // --- Stories --------------------------------------------------------

  async postStory(
    businessConnectionId: string,
    content: InputStoryContent,
    activePeriod: number,
    options: Omit<PostStoryParams, "business_connection_id" | "content" | "active_period"> = {},
  ): Promise<PostStoryResult> {
    if (!content.type) throw new FatalError("content.type is required");
    const qs: Record<string, unknown> = {
      ...options,
      business_connection_id: businessConnectionId,
      active_period: activePeriod,
    };
    const fileInput = (content as Record<string, unknown>)[content.type] as FileInput | undefined;
    const { formData, fileIds } = await prepareFiles(content.type, [{ media: fileInput }], {}, this.options.filepath);
    const inputContent: Record<string, unknown> = { ...content };
    inputContent[content.type] = fileIds[0] ?? `attach://${content.type}_0`;
    qs.content = stringify(inputContent);
    return this._request("postStory", { qs, formData });
  }

  repostStory(
    businessConnectionId: string,
    fromChatId: number,
    fromStoryId: number,
    activePeriod: number,
    form: Omit<RepostStoryParams, "business_connection_id" | "from_chat_id" | "from_story_id" | "active_period"> = {},
  ): Promise<RepostStoryResult> {
    return this._form("repostStory", {
      ...form,
      business_connection_id: businessConnectionId,
      from_chat_id: fromChatId,
      from_story_id: fromStoryId,
      active_period: activePeriod,
    } satisfies RepostStoryParams);
  }

  async editStory(
    businessConnectionId: string,
    storyId: number,
    content: InputStoryContent,
    options: Omit<EditStoryParams, "business_connection_id" | "story_id" | "content"> = {},
  ): Promise<EditStoryResult> {
    if (!content.type) throw new FatalError("content.type is required");
    const qs: Record<string, unknown> = {
      ...options,
      business_connection_id: businessConnectionId,
      story_id: storyId,
    };
    const fileInput = (content as Record<string, unknown>)[content.type] as FileInput | undefined;
    const { formData, fileIds } = await prepareFiles(content.type, [{ media: fileInput }], {}, this.options.filepath);
    const inputContent: Record<string, unknown> = { ...content };
    inputContent[content.type] = fileIds[0] ?? `attach://${content.type}_0`;
    qs.content = stringify(inputContent);
    return this._request("editStory", { qs, formData });
  }

  deleteStory(
    businessConnectionId: string,
    storyId: number,
    form: {} = {},
  ): Promise<DeleteStoryResult> {
    return this._form("deleteStory", {
      ...form,
      business_connection_id: businessConnectionId,
      story_id: storyId,
    } satisfies DeleteStoryParams);
  }
}

export default TelegramBot;
