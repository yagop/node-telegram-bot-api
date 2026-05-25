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
  InlineQueryResultsButton,
  LinkPreviewOptions,
  MenuButton,
  MessageEntity,
  ParseMode,
  ReplyKeyboardMarkup,
  ReplyKeyboardRemove,
  ForceReply,
  ReplyParameters,
  SuggestedPostPrice,
  ReactionType,
} from "./schemas.js";

export type ReplyMarkup =
  | InlineKeyboardMarkup
  | ReplyKeyboardMarkup
  | ReplyKeyboardRemove
  | ForceReply;

export interface InputMediaAnimation {
  type: "animation";
  media: string;
  thumbnail?: string;
  caption?: string;
  parse_mode?: ParseMode;
  caption_entities?: MessageEntity[];
  show_caption_above_media?: boolean;
  width?: number;
  height?: number;
  duration?: number;
  has_spoiler?: boolean;
  [key: string]: unknown;
}

export interface InputMediaAudio {
  type: "audio";
  media: string;
  thumbnail?: string;
  caption?: string;
  parse_mode?: ParseMode;
  caption_entities?: MessageEntity[];
  duration?: number;
  performer?: string;
  title?: string;
  [key: string]: unknown;
}

export interface InputMediaDocument {
  type: "document";
  media: string;
  thumbnail?: string;
  caption?: string;
  parse_mode?: ParseMode;
  caption_entities?: MessageEntity[];
  disable_content_type_detection?: boolean;
  [key: string]: unknown;
}

export interface InputMediaLivePhoto {
  type: "live_photo";
  media: string;
  photo: string;
  caption?: string;
  parse_mode?: ParseMode;
  caption_entities?: MessageEntity[];
  show_caption_above_media?: boolean;
  has_spoiler?: boolean;
  [key: string]: unknown;
}

export interface InputMediaLocation {
  type: "location";
  latitude: number;
  longitude: number;
  horizontal_accuracy?: number;
  [key: string]: unknown;
}

export interface InputMediaPhoto {
  type: "photo";
  media: string;
  caption?: string;
  parse_mode?: ParseMode;
  caption_entities?: MessageEntity[];
  show_caption_above_media?: boolean;
  has_spoiler?: boolean;
  [key: string]: unknown;
}

export interface InputMediaSticker {
  type: "sticker";
  media: string;
  emoji?: string;
  [key: string]: unknown;
}

export interface InputMediaVenue {
  type: "venue";
  latitude: number;
  longitude: number;
  title: string;
  address: string;
  foursquare_id?: string;
  foursquare_type?: string;
  google_place_id?: string;
  google_place_type?: string;
  [key: string]: unknown;
}

export interface InputMediaVideo {
  type: "video";
  media: string;
  thumbnail?: string;
  cover?: string;
  start_timestamp?: number;
  caption?: string;
  parse_mode?: ParseMode;
  caption_entities?: MessageEntity[];
  show_caption_above_media?: boolean;
  width?: number;
  height?: number;
  duration?: number;
  supports_streaming?: boolean;
  has_spoiler?: boolean;
  [key: string]: unknown;
}

/** Media that can be attached to an individual poll option. */
export type InputPollOptionMedia =
  | InputMediaAnimation
  | InputMediaLivePhoto
  | InputMediaLocation
  | InputMediaPhoto
  | InputMediaSticker
  | InputMediaVenue
  | InputMediaVideo;

/** Media that can be attached to a poll description or quiz explanation. */
export type InputPollMedia =
  | InputMediaAnimation
  | InputMediaAudio
  | InputMediaDocument
  | InputMediaLivePhoto
  | InputMediaLocation
  | InputMediaPhoto
  | InputMediaVenue
  | InputMediaVideo;

export interface InputPollOption {
  text: string;
  text_parse_mode?: ParseMode;
  text_entities?: MessageEntity[];
  media?: InputPollOptionMedia;
  [key: string]: unknown;
}

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

export interface SuggestedPostParameters {
  price?: SuggestedPostPrice;
  send_date?: number;
  [key: string]: unknown;
}

export interface SendPhotoOptions extends BaseSendOptions {
  business_connection_id?: string;
  caption?: string;
  parse_mode?: ParseMode;
  caption_entities?: MessageEntity[];
  message_effect_id?: string;
  suggested_post_parameters?: SuggestedPostParameters;
  show_caption_above_media?: boolean;
  has_spoiler?: boolean;
}

export interface SendLivePhotoOptions extends SendPhotoOptions { }

export interface SendAudioOptions extends BaseSendOptions {
  business_connection_id?: string;
  thumbnail?: string;
  caption?: string;
  parse_mode?: ParseMode;
  caption_entities?: MessageEntity[];
  message_effect_id?: string;
  duration?: number;
  performer?: string;
  title?: string;
  suggested_post_parameters?: SuggestedPostParameters;
}

export interface SendDocumentOptions extends BaseSendOptions {
  business_connection_id?: string;
  caption?: string;
  thumbnail?: string;
  parse_mode?: ParseMode;
  caption_entities?: MessageEntity[];
  disable_content_type_detection?: boolean;
  suggested_post_parameters?: SuggestedPostParameters;
}

export interface SendVideoOptions extends SendPhotoOptions {
  duration?: number;
  width?: number;
  height?: number;
  cover?: string;
  start_timestamp?: number;
  thumbnail?: string;
  supports_streaming?: boolean;
}

export interface SendAnimationOptions extends SendVideoOptions { }

export interface SendVoiceOptions extends BaseSendOptions {
  business_connection_id?: string;
  caption?: string;
  parse_mode?: ParseMode;
  caption_entities?: MessageEntity[];
  duration?: number;
  suggested_post_parameters?: SuggestedPostParameters;
}

export interface SendVideoNoteOptions extends BaseSendOptions {
  business_connection_id?: string;
  duration?: number;
  length?: number;
  thumbnail?: string;
  suggested_post_parameters?: SuggestedPostParameters;
}

export interface SendPaidMediaOptions extends BaseSendOptions {
  business_connection_id?: string;
  start_count?: number;
  payload?: string;
  caption?: string;
  parse_mode?: ParseMode;
  caption_entities?: MessageEntity[];
  show_caption_above_media?: boolean;
  suggested_post_parameters?: SuggestedPostParameters;
}

export interface SendMediaGroupOptions {
  business_connection_id?: string;
  message_thread_id?: number;
  direct_messages_topic_id?: number;
  disable_notification?: boolean;
  protect_content?: boolean;
  allow_paid_broadcast?: boolean;
  message_effect_id?: string;
  reply_parameters?: ReplyParameters;
  [key: string]: unknown;
}
export interface SendLocationOptions extends BaseSendOptions {
  business_connection_id?: string;
  horizontal_accuracy?: number;
  live_period?: number;
  heading?: number;
  proximity_alert_radius?: number;
  suggested_post_parameters?: SuggestedPostParameters;
}

export interface SendVenueOptions extends BaseSendOptions {
  business_connection_id?: string;
  foursquare_id?: string;
  foursquare_type?: string;
  google_place_id?: string;
  google_place_type?: string;
  suggested_post_parameters?: SuggestedPostParameters;
}

export interface SendContactOptions extends BaseSendOptions {
  business_connection_id?: string;
  last_name?: string;
  vcard?: string;
  suggested_post_parameters?: SuggestedPostParameters;
}

export interface SendPollOptions extends BaseSendOptions {
  business_connection_id?: string;
  question_parse_mode?: ParseMode;
  question_entities?: MessageEntity[];
  is_anonymous?: boolean;
  type?: "regular" | "quiz";
  allows_multiple_answers?: boolean;
  allow_revoting?: boolean;
  shuffle_options?: boolean;
  allow_adding_options?: boolean;
  hide_results_until_closes?: boolean;
  members_only?: boolean;
  country_codes?: string[];
  correct_option_ids?: number[];
  explanation?: string;
  explanation_parse_mode?: ParseMode;
  explanation_entities?: MessageEntity[];
  explanation_media?: InputPollMedia;
  open_period?: number;
  close_date?: number;
  is_closed?: boolean;
  description?: string;
  description_parse_mode?: ParseMode;
  description_entities?: MessageEntity[];
  media?: InputPollMedia;
}

export interface sendChecklistOptions {
  disable_notification?: boolean;
  protect_content?: boolean;
  message_effect_id?: string;
  reply_parameters?: ReplyParameters;
  reply_markup?: ReplyMarkup;
  [key: string]: unknown;
}
export interface SendDiceOptions extends BaseSendOptions {
  emoji?: string;
  suggested_post_parameters?: SuggestedPostParameters;
}

export interface sendMessageDraftOptions {
  message_thread_id?: number;
  text?: string;
  parse_mode?: ParseMode;
  entities?: MessageEntity[];
  [key: string]: unknown;
}

export interface SendChatActionOptions {
  business_connection_id?: string;
  message_thread_id?: number;
  [key: string]: unknown;
}

export interface SetMessageReactionOptions {
  reaction?: ReactionType[];
  is_big?: boolean;
  [key: string]: unknown;
}

export interface GetUserProfilePhotosOptions {
  offset?: number;
  limit?: number;
  [key: string]: unknown;
}

export interface GetUserProfileAudiosOptions {
  offset?: number;
  limit?: number;
  [key: string]: unknown;
}

export interface SetUserEmojiStatusOptions {
  emoji_status_custom_emoji_id?: string;
  emoji_status_expiration_date?: number;
  [key: string]: unknown;
}

export interface BanChatMemberOptions {
  until_date?: number;
  revoke_messages?: boolean;
  [key: string]: unknown;
}

export interface UnbanChatMemberOptions {
  only_if_banned?: boolean;
  [key: string]: unknown;
}

export interface RestrictChatMemberOptions {
  use_independent_chat_permissions?: boolean;
  until_date?: number;
  [key: string]: unknown;
}

export interface PromoteChatMemberOptions {
  is_anonymous?: boolean;
  can_manage_chat?: boolean;
  can_delete_messages?: boolean;
  can_manage_video_chats?: boolean;
  can_restrict_members?: boolean;
  can_promote_members?: boolean;
  can_change_info?: boolean;
  can_invite_users?: boolean;
  can_post_stories?: boolean;
  can_edit_stories?: boolean;
  can_delete_stories?: boolean;
  can_post_messages?: boolean;
  can_edit_messages?: boolean;
  can_pin_messages?: boolean;
  can_manage_topics?: boolean;
  can_manage_direct_messages?: boolean;
  can_manage_tags?: boolean;
  [key: string]: unknown;
}

export interface SetChatMemberTagOptions {
  tag?: string;
  [key: string]: unknown;
}

export interface SetChatPermissionsOptions {
  use_independent_chat_permissions?: boolean;
  [key: string]: unknown;
}

export interface CreateChatInviteLinkOptions {
  name?: string;
  expire_date?: number;
  member_limit?: number;
  creates_join_request?: boolean;
  [key: string]: unknown;
}

export interface EditChatInviteLinkOptions {
  name?: string;
  expire_date?: number;
  member_limit?: number;
  creates_join_request?: boolean;
  [key: string]: unknown;
}

export interface CreateChatSubscriptionInviteLinkOptions {
  name?: string;
  [key: string]: unknown;
}

export interface EditChatSubscriptionInviteLinkOptions {
  name?: string;
  [key: string]: unknown;
}

export interface PinChatMessageOptions {
  business_connection_id?: string;
  disable_notification?: boolean;
  [key: string]: unknown;
}

export interface UnpinChatMessageOptions {
  business_connection_id?: string;
  message_id?: number;
  [key: string]: unknown;
}

export interface GetChatAdministratorsOptions {
  return_bots?: boolean;
  [key: string]: unknown;
}

export interface CreateForumTopicOptions {
  icon_color?: number;
  icon_custom_emoji_id?: string;
  [key: string]: unknown;
}

export interface EditForumTopicOptions {
  name?: string;
  icon_custom_emoji_id?: string;
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
  button?: InlineQueryResultsButton;
  [key: string]: unknown;
}

export interface SetManagedBotAccessSettingsOptions {
  added_user_ids?: number[];
  [key: string]: unknown;
}

export interface SetMyCommandsOptions {
  scope?: Record<string, unknown>;
  language_code?: string;
  [key: string]: unknown;
}

export interface DeleteMyCommandsOptions {
  scope?: Record<string, unknown>;
  language_code?: string;
  [key: string]: unknown;
}

export interface GetMyCommandsOptions {
  scope?: Record<string, unknown>;
  language_code?: string;
  [key: string]: unknown;
}

export interface SetMyNameOptions {
  name?: string;
  [key: string]: unknown;
}

export interface GetMyNameOptions {
  language_code?: string;
  [key: string]: unknown;
}

export interface SetMyDescriptionOptions {
  description?: string;
  language_code?: string;
  [key: string]: unknown;
}

export interface GetMyDescriptionOptions {
  language_code?: string;
  [key: string]: unknown;
}

export interface SetMyShortDescriptionOptions {
  short_description?: string;
  language_code?: string;
  [key: string]: unknown;
}

export interface GetMyShortDescriptionOptions {
  language_code?: string;
  [key: string]: unknown;
}

export interface SetChatMenuButtonOptions {
  chat_id?: ChatId;
  menu_button?: MenuButton;
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
