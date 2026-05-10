/**
 * TypeScript option/argument types for the most common TelegramBot methods.
 *
 * These mirror the request payloads documented at
 * https://core.telegram.org/bots/api. The library accepts any extra fields
 * via index signatures so downstream callers stay forward-compatible when
 * Telegram introduces new optional parameters.
 */

import type {
  ChatId,
  InlineKeyboardMarkup,
  LinkPreviewOptions,
  MessageEntity,
  ParseMode,
  ReplyKeyboardMarkup,
  ReplyKeyboardRemove,
  ForceReply,
  ReplyParameters,
  SuggestedPostPrice,
} from "./schemas.js";

export type ReplyMarkup =
  | InlineKeyboardMarkup
  | ReplyKeyboardMarkup
  | ReplyKeyboardRemove
  | ForceReply;

export interface BaseSendOptions {
  message_thread_id?: number;
  direct_messages_topic_id?: number;
  disable_notification?: boolean;
  protect_content?: boolean;
  allow_paid_broadcast?: boolean;
  message_effect_id?: string;
  reply_parameters?: ReplyParameters;
  reply_markup?: ReplyMarkup;
  [key: string]: unknown;
}

export interface SendMessageOptions extends BaseSendOptions {
  business_connection_id?: string;
  parse_mode?: ParseMode;
  entities?: MessageEntity[];
  link_preview_options?: LinkPreviewOptions;
  suggested_post_parameters?: SuggestedPostParameters;
}

export interface ForwardMessageOptions {
  message_thread_id?: number;
  direct_messages_topic_id?: number;
  video_start_timestamp?: number;
  disable_notification?: boolean;
  protect_content?: boolean;
  message_effect_id?: string;
  suggested_post_parameters?: SuggestedPostParameters;
  [key: string]: unknown;
}

export interface ForwardMessagesOptions {
  message_thread_id?: number;
  direct_messages_topic_id?: number;
  disable_notification?: boolean;
  protect_content?: boolean;
  [key: string]: unknown;
}

export interface CopyMessageOptions extends BaseSendOptions {
  video_start_timestamp?: number;
  caption?: string;
  parse_mode?: ParseMode;
  caption_entities?: MessageEntity[];
  show_caption_above_media?: boolean;
  suggested_post_parameters?: SuggestedPostParameters;
}

export interface CopyMessagesOptions {
  message_thread_id?: number;
  direct_messages_topic_id?: number;
  disable_notification?: boolean;
  protect_content?: boolean;
  remove_caption?: boolean;
  [key: string]: unknown;
}

export interface SendPhotoOptions extends BaseSendOptions {
  business_connection_id?: string;
  caption?: string;
  parse_mode?: ParseMode;
  caption_entities?: MessageEntity[];
  show_caption_above_media?: boolean;
  message_effect_id?: string;
  has_spoiler?: boolean;
}

export interface SuggestedPostParameters {
  price?: SuggestedPostPrice;
  send_date?: number;
  [key: string]: unknown;
}

export interface SendLivePhotoOptions extends SendPhotoOptions {
  suggested_post_parameters?: SuggestedPostParameters;
}

export interface SendAudioOptions extends SendPhotoOptions {
  duration?: number;
  performer?: string;
  title?: string;
  suggested_post_parameters?: SuggestedPostParameters;
  thumbnail?: string;
}

export interface SendDocumentOptions extends SendPhotoOptions {
  thumbnail?: string;
  /** @deprecated Use `thumbnail`. */
  thumb?: string;
  disable_content_type_detection?: boolean;
}

export interface SendVideoOptions extends SendPhotoOptions {
  duration?: number;
  width?: number;
  height?: number;
  thumbnail?: string;
  /** @deprecated Use `thumbnail`. */
  thumb?: string;
  supports_streaming?: boolean;
}

export interface SendAnimationOptions extends SendVideoOptions { }

export interface SendVoiceOptions extends BaseSendOptions {
  caption?: string;
  parse_mode?: ParseMode;
  caption_entities?: MessageEntity[];
  duration?: number;
}

export interface SendVideoNoteOptions extends BaseSendOptions {
  duration?: number;
  length?: number;
  thumbnail?: string;
  /** @deprecated Use `thumbnail`. */
  thumb?: string;
}

export interface SendLocationOptions extends BaseSendOptions {
  horizontal_accuracy?: number;
  live_period?: number;
  heading?: number;
  proximity_alert_radius?: number;
}

export interface SendVenueOptions extends BaseSendOptions {
  foursquare_id?: string;
  foursquare_type?: string;
  google_place_id?: string;
  google_place_type?: string;
}

export interface SendContactOptions extends BaseSendOptions {
  last_name?: string;
  vcard?: string;
}

export interface SendPollOptions extends BaseSendOptions {
  question_parse_mode?: ParseMode;
  question_entities?: MessageEntity[];
  is_anonymous?: boolean;
  type?: "regular" | "quiz";
  allows_multiple_answers?: boolean;
  correct_option_id?: number;
  explanation?: string;
  explanation_parse_mode?: ParseMode;
  explanation_entities?: MessageEntity[];
  open_period?: number;
  close_date?: number;
  is_closed?: boolean;
}

export interface SendDiceOptions extends BaseSendOptions {
  emoji?: string;
}

export interface SendChatActionOptions {
  business_connection_id?: string;
  message_thread_id?: number;
  [key: string]: unknown;
}

export interface AnswerCallbackQueryOptions {
  text?: string;
  show_alert?: boolean;
  url?: string;
  cache_time?: number;
  [key: string]: unknown;
}

export interface AnswerInlineQueryOptions {
  cache_time?: number;
  is_personal?: boolean;
  next_offset?: string;
  button?: { text: string; web_app?: { url: string }; start_parameter?: string };
  [key: string]: unknown;
}

export interface SendInvoiceOptions {
  provider_data?: Record<string, unknown>;
  photo_url?: string;
  photo_size?: number;
  photo_width?: number;
  photo_height?: number;
  need_name?: boolean;
  need_phone_number?: boolean;
  need_email?: boolean;
  need_shipping_address?: boolean;
  send_phone_number_to_provider?: boolean;
  send_email_to_provider?: boolean;
  is_flexible?: boolean;
  max_tip_amount?: number;
  suggested_tip_amounts?: number[];
  start_parameter?: string;
  reply_parameters?: ReplyParameters;
  reply_markup?: InlineKeyboardMarkup;
  business_connection_id?: string;
  message_thread_id?: number;
  disable_notification?: boolean;
  protect_content?: boolean;
  allow_paid_broadcast?: boolean;
  [key: string]: unknown;
}

export interface SetWebHookOptions {
  certificate?: string | NodeJS.ReadableStream | Buffer;
  ip_address?: string;
  max_connections?: number;
  allowed_updates?: string[] | string;
  drop_pending_updates?: boolean;
  secret_token?: string;
  [key: string]: unknown;
}

export interface GetUpdatesOptions {
  offset?: number;
  limit?: number;
  timeout?: number;
  allowed_updates?: string[] | string;
  [key: string]: unknown;
}

/**
 * Common type for the `chatId` parameter (Number for IDs, String for `@username`).
 */
export type { ChatId };
