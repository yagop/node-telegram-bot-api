/// <reference types="node" />

export interface TelegramBotOptions {
  /** Bot token */
  token?: string;
  /** Enable polling */
  polling?: boolean | PollingOptions;
  /** Enable webhook */
  webHook?: boolean | WebHookOptions;
  /** Request timeout */
  request?: RequestOptions;
  /** Base API URL */
  baseApiUrl?: string;
  /** Enable strict SSL validation */
  https?: HttpsOptions;
  /** File upload options */
  filepath?: boolean;
  /** Cancel polling on first error */
  badRejection?: boolean;
  /** Set true to work with test environment */
  testEnvironment?: boolean;
  /** Set to true to stop after first match */
  onlyFirstMatch?: boolean;
}

export interface PollingOptions {
  /** Identifier of the first update to be returned */
  offset?: number;
  /** Limits the number of updates to be retrieved */
  limit?: number;
  /** Timeout in seconds for long polling */
  timeout?: number;
  /** List of the update types you want your bot to receive */
  allowed_updates?: string[];
  /** Polling interval in milliseconds */
  interval?: number;
  /** Autostart polling */
  autoStart?: boolean;
  /** Parameters to pass to getUpdates */
  params?: Record<string, unknown>;
}

export interface WebHookOptions {
  /** HTTPS url to send updates to */
  url?: string;
  /** Upload your public key certificate */
  certificate?: string;
  /** The fixed IP address which will be used to send webhook requests */
  ip_address?: string;
  /** Maximum allowed number of simultaneous HTTPS connections */
  max_connections?: number;
  /** List of the update types you want your bot to receive */
  allowed_updates?: string[];
  /** Pass True to drop all pending updates */
  drop_pending_updates?: boolean;
  /** Secret token to validate webhook */
  secret_token?: string;
  /** Port for webhook server */
  port?: number;
  /** Host for webhook server */
  host?: string;
  /** Enable HTTPS */
  https?: HttpsOptions | false;
  /** Health check route */
  healthEndpoint?: string;
  /** Autostart webhook */
  autoOpen?: boolean;
  /** Path to file with PEM private key for webHook server */
  key?: string;
  /** Path to file with PEM certificate (public) for webHook server */
  cert?: string;
  /** Path to file with PFX private key and certificate chain for webHook server */
  pfx?: string;
}

export interface RequestOptions {
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Base URL for Telegram API */
  url?: string;
  /** Request agent */
  agent?: unknown;
  /** Enable gzip compression */
  gzip?: boolean;
  /** Request headers */
  headers?: Record<string, string>;
  /** Proxy settings */
  proxy?: string;
  /** Forever agent */
  forever?: boolean;
}

export interface HttpsOptions {
  /** Pfx certificate */
  pfx?: Buffer | string;
  /** Private key */
  key?: Buffer | string;
  /** Certificate */
  cert?: Buffer | string;
  /** CA certificates */
  ca?: Buffer | string | Array<Buffer | string>;
  /** Passphrase */
  passphrase?: string;
  /** Reject unauthorized certificates */
  rejectUnauthorized?: boolean;
  /** Check server identity */
  checkServerIdentity?: boolean;
  /** Ciphers */
  ciphers?: string;
  /** ECDH curve */
  ecdhCurve?: string;
  /** DH param */
  dhparam?: string | Buffer;
  /** Secure protocol */
  secureProtocol?: string;
  /** Secure options */
  secureOptions?: number;
  /** Honor cipher order */
  honorCipherOrder?: boolean;
  /** Session ID context */
  sessionIdContext?: string;
}

export interface SendMessageOptions {
  /** Send Markdown or HTML, if you want Telegram apps to show bold, italic, fixed-width text or inline URLs */
  parse_mode?: 'Markdown' | 'MarkdownV2' | 'HTML';
  /** List of special entities that appear in message text */
  entities?: import('./telegram-types').MessageEntity[];
  /** Disables link previews for links in this message */
  disable_web_page_preview?: boolean;
  /** Sends the message silently */
  disable_notification?: boolean;
  /** Protects the contents of the sent message from forwarding and saving */
  protect_content?: boolean;
  /** If the message is a reply, ID of the original message */
  reply_to_message_id?: number;
  /** Pass True, if the message should be sent even if the specified replied-to message is not found */
  allow_sending_without_reply?: boolean;
  /** Additional interface options */
  reply_markup?:
    | import('./telegram-types').InlineKeyboardMarkup
    | import('./telegram-types').ReplyKeyboardMarkup
    | import('./telegram-types').ReplyKeyboardRemove
    | import('./telegram-types').ForceReply;
}

export interface SendPhotoOptions extends SendMessageOptions {
  /** Photo caption */
  caption?: string;
  /** List of special entities that appear in the caption */
  caption_entities?: import('./telegram-types').MessageEntity[];
}

export interface SendAudioOptions extends SendMessageOptions {
  /** Audio caption */
  caption?: string;
  /** List of special entities that appear in the caption */
  caption_entities?: import('./telegram-types').MessageEntity[];
  /** Duration of the audio in seconds */
  duration?: number;
  /** Performer */
  performer?: string;
  /** Track name */
  title?: string;
  /** Thumbnail of the file */
  thumb?: FileInput;
}

export interface SendDocumentOptions extends SendMessageOptions {
  /** Document caption */
  caption?: string;
  /** List of special entities that appear in the caption */
  caption_entities?: import('./telegram-types').MessageEntity[];
  /** Thumbnail of the file */
  thumb?: FileInput;
  /** Disables automatic server-side content type detection */
  disable_content_type_detection?: boolean;
}

export interface SendVideoOptions extends SendMessageOptions {
  /** Video caption */
  caption?: string;
  /** List of special entities that appear in the caption */
  caption_entities?: import('./telegram-types').MessageEntity[];
  /** Duration of sent video in seconds */
  duration?: number;
  /** Video width */
  width?: number;
  /** Video height */
  height?: number;
  /** Thumbnail of the file */
  thumb?: FileInput;
  /** Pass True, if the uploaded video is suitable for streaming */
  supports_streaming?: boolean;
}

export interface SendAnimationOptions extends SendMessageOptions {
  /** Animation caption */
  caption?: string;
  /** List of special entities that appear in the caption */
  caption_entities?: import('./telegram-types').MessageEntity[];
  /** Duration of sent animation in seconds */
  duration?: number;
  /** Animation width */
  width?: number;
  /** Animation height */
  height?: number;
  /** Thumbnail of the file */
  thumb?: FileInput;
}

export interface SendVoiceOptions extends SendMessageOptions {
  /** Voice message caption */
  caption?: string;
  /** List of special entities that appear in the caption */
  caption_entities?: import('./telegram-types').MessageEntity[];
  /** Duration of the voice message in seconds */
  duration?: number;
}

export interface SendVideoNoteOptions extends SendMessageOptions {
  /** Duration of sent video in seconds */
  duration?: number;
  /** Video width and height */
  length?: number;
  /** Thumbnail of the file */
  thumb?: FileInput;
}

export interface SendLocationOptions extends SendMessageOptions {
  /** Period in seconds for which the location will be updated */
  live_period?: number;
  /** The radius of uncertainty for the location, measured in meters; 0-1500 */
  horizontal_accuracy?: number;
  /** Direction in which the user is moving, in degrees. Must be between 1 and 360 if specified */
  heading?: number;
  /** Maximum distance for proximity alerts about approaching another chat member, in meters */
  proximity_alert_radius?: number;
}

export interface SendVenueOptions extends SendMessageOptions {
  /** Foursquare identifier of the venue */
  foursquare_id?: string;
  /** Foursquare type of the venue */
  foursquare_type?: string;
  /** Google Places identifier of the venue */
  google_place_id?: string;
  /** Google Places type of the venue */
  google_place_type?: string;
}

export interface SendContactOptions extends SendMessageOptions {
  /** Contact's last name */
  last_name?: string;
  /** Contact's vCard */
  vcard?: string;
}

export interface SendPollOptions extends SendMessageOptions {
  /** True, if the poll needs to be anonymous */
  is_anonymous?: boolean;
  /** Poll type, "quiz" or "regular" */
  type?: 'quiz' | 'regular';
  /** True, if the poll allows multiple answers */
  allows_multiple_answers?: boolean;
  /** 0-based identifier of the correct answer option */
  correct_option_id?: number;
  /** Text that is shown when a user chooses an incorrect answer */
  explanation?: string;
  /** List of special entities that appear in the poll explanation */
  explanation_entities?: import('./telegram-types').MessageEntity[];
  /** Amount of time in seconds the poll will be active after creation */
  open_period?: number;
  /** Point in time when the poll will be automatically closed */
  close_date?: number;
  /** Pass True, if the poll needs to be immediately closed */
  is_closed?: boolean;
}

export interface SendDiceOptions extends SendMessageOptions {
  /** Emoji on which the dice throw animation is based */
  emoji?: '🎲' | '🎯' | '🏀' | '⚽' | '🎳' | '🎰';
}

export interface SendStickerOptions extends SendMessageOptions {} // eslint-disable-line @typescript-eslint/no-empty-object-type

export interface SendGameOptions extends SendMessageOptions {} // eslint-disable-line @typescript-eslint/no-empty-object-type

export interface SendInvoiceOptions extends SendMessageOptions {
  /** Bot-defined invoice payload */
  payload: string;
  /** Payments provider token */
  provider_token: string;
  /** Three-letter ISO 4217 currency code */
  currency: string;
  /** Price breakdown, a list of components */
  prices: import('./telegram-types').LabeledPrice[];
  /** The maximum accepted amount for tips in the smallest units of the currency */
  max_tip_amount?: number;
  /** An array of suggested amounts of tips in the smallest units of the currency */
  suggested_tip_amounts?: number[];
  /** Unique deep-linking parameter that can be used to generate this invoice when used as a start parameter */
  start_parameter?: string;
  /** Provider data */
  provider_data?: string;
  /** URL of the product photo for the invoice */
  photo_url?: string;
  /** Photo size */
  photo_size?: number;
  /** Photo width */
  photo_width?: number;
  /** Photo height */
  photo_height?: number;
  /** Pass True, if you require the user's full name to complete the order */
  need_name?: boolean;
  /** Pass True, if you require the user's phone number to complete the order */
  need_phone_number?: boolean;
  /** Pass True, if you require the user's email address to complete the order */
  need_email?: boolean;
  /** Pass True, if you require the user's shipping address to complete the order */
  need_shipping_address?: boolean;
  /** Pass True, if user's phone number should be sent to provider */
  send_phone_number_to_provider?: boolean;
  /** Pass True, if user's email address should be sent to provider */
  send_email_to_provider?: boolean;
  /** Pass True, if the final price depends on the shipping method */
  is_flexible?: boolean;
}

export interface GetUpdatesOptions {
  /** Identifier of the first update to be returned */
  offset?: number;
  /** Limits the number of updates to be retrieved */
  limit?: number;
  /** Timeout in seconds for long polling */
  timeout?: number;
  /** List of the update types you want your bot to receive */
  allowed_updates?: string[];
}

export interface SetWebhookOptions {
  /** HTTPS url to send updates to */
  url: string;
  /** Upload your public key certificate */
  certificate?: FileInput;
  /** The fixed IP address which will be used to send webhook requests */
  ip_address?: string;
  /** Maximum allowed number of simultaneous HTTPS connections */
  max_connections?: number;
  /** List of the update types you want your bot to receive */
  allowed_updates?: string[];
  /** Pass True to drop all pending updates */
  drop_pending_updates?: boolean;
  /** Secret token to validate webhook */
  secret_token?: string;
}

export interface AnswerCallbackQueryOptions {
  /** Text of the notification */
  text?: string;
  /** If true, an alert will be shown by the client instead of a notification */
  show_alert?: boolean;
  /** URL that will be opened by the user's client */
  url?: string;
  /** The maximum amount of time in seconds that the result of the callback query may be cached client-side */
  cache_time?: number;
}

export interface EditMessageTextOptions {
  /** Required if inline_message_id is not specified. Unique identifier for the target chat */
  chat_id?: number | string;
  /** Required if inline_message_id is not specified. Identifier of the message to edit */
  message_id?: number;
  /** Required if chat_id and message_id are not specified. Identifier of the inline message */
  inline_message_id?: string;
  /** Send Markdown or HTML, if you want Telegram apps to show bold, italic, fixed-width text or inline URLs */
  parse_mode?: 'Markdown' | 'MarkdownV2' | 'HTML';
  /** List of special entities that appear in message text */
  entities?: import('./telegram-types').MessageEntity[];
  /** Disables link previews for links in this message */
  disable_web_page_preview?: boolean;
  /** Additional interface options */
  reply_markup?: import('./telegram-types').InlineKeyboardMarkup;
}

export interface EditMessageCaptionOptions {
  /** Required if inline_message_id is not specified. Unique identifier for the target chat */
  chat_id?: number | string;
  /** Required if inline_message_id is not specified. Identifier of the message to edit */
  message_id?: number;
  /** Required if chat_id and message_id are not specified. Identifier of the inline message */
  inline_message_id?: string;
  /** New caption of the message */
  caption?: string;
  /** Send Markdown or HTML, if you want Telegram apps to show bold, italic, fixed-width text or inline URLs */
  parse_mode?: 'Markdown' | 'MarkdownV2' | 'HTML';
  /** List of special entities that appear in the caption */
  caption_entities?: import('./telegram-types').MessageEntity[];
  /** Additional interface options */
  reply_markup?: import('./telegram-types').InlineKeyboardMarkup;
}

export interface EditMessageMediaOptions {
  /** Required if inline_message_id is not specified. Unique identifier for the target chat */
  chat_id?: number | string;
  /** Required if inline_message_id is not specified. Identifier of the message to edit */
  message_id?: number;
  /** Required if chat_id and message_id are not specified. Identifier of the inline message */
  inline_message_id?: string;
  /** Additional interface options */
  reply_markup?: import('./telegram-types').InlineKeyboardMarkup;
}

export interface EditMessageReplyMarkupOptions {
  /** Required if inline_message_id is not specified. Unique identifier for the target chat */
  chat_id?: number | string;
  /** Required if inline_message_id is not specified. Identifier of the message to edit */
  message_id?: number;
  /** Required if chat_id and message_id are not specified. Identifier of the inline message */
  inline_message_id?: string;
  /** Additional interface options */
  reply_markup?: import('./telegram-types').InlineKeyboardMarkup;
}

export interface DeleteMessageOptions {
  /** Unique identifier for the target chat */
  chat_id: number | string;
  /** Identifier of the message to delete */
  message_id: number;
}

export interface GetFileOptions {
  /** File identifier to get info about */
  file_id: string;
}

export interface BanChatMemberOptions {
  /** Unique identifier for the target group or username of the target supergroup */
  chat_id: number | string;
  /** Unique identifier of the target user */
  user_id: number;
  /** Date when the user will be unbanned, unix time */
  until_date?: number;
  /** Pass True to delete all messages from the chat for the user that is being removed */
  revoke_messages?: boolean;
}

export interface UnbanChatMemberOptions {
  /** Unique identifier for the target group or username of the target supergroup */
  chat_id: number | string;
  /** Unique identifier of the target user */
  user_id: number;
  /** Do nothing if the user is not banned */
  only_if_banned?: boolean;
}

export interface RestrictChatMemberOptions {
  /** Unique identifier for the target chat */
  chat_id: number | string;
  /** Unique identifier of the target user */
  user_id: number;
  /** New user permissions */
  permissions: import('./telegram-types').ChatPermissions;
  /** Date when restrictions will be lifted for the user, unix time */
  until_date?: number;
}

export interface PromoteChatMemberOptions {
  /** Unique identifier for the target chat */
  chat_id: number | string;
  /** Unique identifier of the target user */
  user_id: number;
  /** Pass True, if the administrator's presence in the chat is hidden */
  is_anonymous?: boolean;
  /** Pass True, if the administrator can access the chat event log */
  can_manage_chat?: boolean;
  /** Pass True, if the administrator can delete messages of other users */
  can_delete_messages?: boolean;
  /** Pass True, if the administrator can manage video chats */
  can_manage_video_chats?: boolean;
  /** Pass True, if the administrator can restrict, ban or unban chat members */
  can_restrict_members?: boolean;
  /** Pass True, if the administrator can add new administrators */
  can_promote_members?: boolean;
  /** Pass True, if the administrator can change chat title, photo and other settings */
  can_change_info?: boolean;
  /** Pass True, if the administrator can invite new users to the chat */
  can_invite_users?: boolean;
  /** Pass True, if the administrator can post in the channel */
  can_post_messages?: boolean;
  /** Pass True, if the administrator can edit messages of other users */
  can_edit_messages?: boolean;
  /** Pass True, if the administrator can pin messages */
  can_pin_messages?: boolean;
}

export type MessageType =
  | 'text'
  | 'animation'
  | 'audio'
  | 'channel_chat_created'
  | 'contact'
  | 'delete_chat_photo'
  | 'dice'
  | 'document'
  | 'game'
  | 'group_chat_created'
  | 'invoice'
  | 'left_chat_member'
  | 'location'
  | 'migrate_from_chat_id'
  | 'migrate_to_chat_id'
  | 'new_chat_members'
  | 'new_chat_photo'
  | 'new_chat_title'
  | 'passport_data'
  | 'photo'
  | 'pinned_message'
  | 'poll'
  | 'sticker'
  | 'successful_payment'
  | 'supergroup_chat_created'
  | 'video'
  | 'video_note'
  | 'voice'
  | 'video_chat_started'
  | 'video_chat_ended'
  | 'video_chat_participants_invited'
  | 'video_chat_scheduled'
  | 'message_auto_delete_timer_changed'
  | 'chat_invite_link'
  | 'chat_member_updated'
  | 'web_app_data'
  | 'message_reaction';

export interface FileOptions {
  /** Filename for the file */
  filename?: string;
  /** Content type for the file */
  contentType?: string;
}

export interface Stream extends NodeJS.ReadableStream {
  path?: string;
}

export type FileInput = string | Buffer | NodeJS.ReadableStream | Stream;

export interface TelegramBotPollingConfig {
  interval: number;
  autoStart: boolean;
  params: GetUpdatesOptions;
}

export interface TelegramBotWebHookConfig {
  host: string;
  port: number;
  https: HttpsOptions | false;
  healthEndpoint: string;
  autoOpen: boolean;
}
