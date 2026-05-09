/**
 * Zod schemas for the Telegram Bot API.
 *
 * The schemas mirror the structures documented at
 * https://core.telegram.org/bots/api and were cross-referenced against the
 * model package of https://github.com/go-telegram/bot.
 *
 * Schemas are exported alongside their inferred TypeScript types so callers
 * can either runtime-validate (`UpdateSchema.parse(payload)`) or rely on
 * static typing alone (`UpdateSchema.safeParse(payload)` / `Update`).
 *
 * Permissive policy
 * -----------------
 * Telegram regularly extends payloads with new optional fields. To keep the
 * library forward-compatible we use `.passthrough()` on top-level objects so
 * unknown properties survive parsing and are still accessible to users.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Atomic / primitive helpers
// ---------------------------------------------------------------------------

export const ChatIdSchema = z.union([z.number().int(), z.string()]);
export type ChatId = z.infer<typeof ChatIdSchema>;

const obj = <T extends z.ZodRawShape>(shape: T) => z.object(shape).passthrough();

// ---------------------------------------------------------------------------
// User & Chat
// ---------------------------------------------------------------------------

export const UserSchema = obj({
  id: z.number().int(),
  is_bot: z.boolean(),
  first_name: z.string(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  language_code: z.string().optional(),
  is_premium: z.boolean().optional(),
  added_to_attachment_menu: z.boolean().optional(),
  can_join_groups: z.boolean().optional(),
  can_read_all_group_messages: z.boolean().optional(),
  supports_inline_queries: z.boolean().optional(),
  can_connect_to_business: z.boolean().optional(),
  has_main_web_app: z.boolean().optional(),
});
export type User = z.infer<typeof UserSchema>;

export const ChatTypeSchema = z.enum(["private", "group", "supergroup", "channel"]);
export type ChatType = z.infer<typeof ChatTypeSchema>;

export const ChatSchema: z.ZodType<{
  id: number;
  type: ChatType;
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  is_forum?: boolean;
  [key: string]: unknown;
}> = obj({
  id: z.number().int(),
  type: ChatTypeSchema,
  title: z.string().optional(),
  username: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  is_forum: z.boolean().optional(),
});
export type Chat = z.infer<typeof ChatSchema>;

// ---------------------------------------------------------------------------
// Files (PhotoSize, Audio, Video, Document, …)
// ---------------------------------------------------------------------------

const fileBase = {
  file_id: z.string(),
  file_unique_id: z.string(),
  file_size: z.number().int().optional(),
};

export const PhotoSizeSchema = obj({
  ...fileBase,
  width: z.number().int(),
  height: z.number().int(),
});
export type PhotoSize = z.infer<typeof PhotoSizeSchema>;

export const AnimationSchema = obj({
  ...fileBase,
  width: z.number().int(),
  height: z.number().int(),
  duration: z.number().int(),
  thumbnail: PhotoSizeSchema.optional(),
  file_name: z.string().optional(),
  mime_type: z.string().optional(),
});
export type Animation = z.infer<typeof AnimationSchema>;

export const AudioSchema = obj({
  ...fileBase,
  duration: z.number().int(),
  performer: z.string().optional(),
  title: z.string().optional(),
  file_name: z.string().optional(),
  mime_type: z.string().optional(),
  thumbnail: PhotoSizeSchema.optional(),
});
export type Audio = z.infer<typeof AudioSchema>;

export const DocumentSchema = obj({
  ...fileBase,
  thumbnail: PhotoSizeSchema.optional(),
  file_name: z.string().optional(),
  mime_type: z.string().optional(),
});
export type Document = z.infer<typeof DocumentSchema>;

export const VideoSchema = obj({
  ...fileBase,
  width: z.number().int(),
  height: z.number().int(),
  duration: z.number().int(),
  thumbnail: PhotoSizeSchema.optional(),
  file_name: z.string().optional(),
  mime_type: z.string().optional(),
});
export type Video = z.infer<typeof VideoSchema>;

export const VoiceSchema = obj({
  ...fileBase,
  duration: z.number().int(),
  mime_type: z.string().optional(),
});
export type Voice = z.infer<typeof VoiceSchema>;

export const VideoNoteSchema = obj({
  ...fileBase,
  length: z.number().int(),
  duration: z.number().int(),
  thumbnail: PhotoSizeSchema.optional(),
});
export type VideoNote = z.infer<typeof VideoNoteSchema>;

export const FileSchema = obj({
  ...fileBase,
  file_path: z.string().optional(),
});
export type File = z.infer<typeof FileSchema>;

// ---------------------------------------------------------------------------
// Stickers
// ---------------------------------------------------------------------------

export const MaskPositionSchema = obj({
  point: z.enum(["forehead", "eyes", "mouth", "chin"]),
  x_shift: z.number(),
  y_shift: z.number(),
  scale: z.number(),
});
export type MaskPosition = z.infer<typeof MaskPositionSchema>;

export const StickerTypeSchema = z.enum(["regular", "mask", "custom_emoji"]);

export const StickerSchema = obj({
  ...fileBase,
  type: StickerTypeSchema,
  width: z.number().int(),
  height: z.number().int(),
  is_animated: z.boolean(),
  is_video: z.boolean(),
  thumbnail: PhotoSizeSchema.optional(),
  emoji: z.string().optional(),
  set_name: z.string().optional(),
  premium_animation: FileSchema.optional(),
  mask_position: MaskPositionSchema.optional(),
  custom_emoji_id: z.string().optional(),
  needs_repainting: z.boolean().optional(),
});
export type Sticker = z.infer<typeof StickerSchema>;

export const StickerSetSchema = obj({
  name: z.string(),
  title: z.string(),
  sticker_type: StickerTypeSchema,
  stickers: z.array(StickerSchema),
  thumbnail: PhotoSizeSchema.optional(),
});
export type StickerSet = z.infer<typeof StickerSetSchema>;

// ---------------------------------------------------------------------------
// Contact / Location / Venue / Dice / Poll
// ---------------------------------------------------------------------------

export const ContactSchema = obj({
  phone_number: z.string(),
  first_name: z.string(),
  last_name: z.string().optional(),
  user_id: z.number().int().optional(),
  vcard: z.string().optional(),
});
export type Contact = z.infer<typeof ContactSchema>;

export const LocationSchema = obj({
  longitude: z.number(),
  latitude: z.number(),
  horizontal_accuracy: z.number().optional(),
  live_period: z.number().int().optional(),
  heading: z.number().int().optional(),
  proximity_alert_radius: z.number().int().optional(),
});
export type Location = z.infer<typeof LocationSchema>;

export const VenueSchema = obj({
  location: LocationSchema,
  title: z.string(),
  address: z.string(),
  foursquare_id: z.string().optional(),
  foursquare_type: z.string().optional(),
  google_place_id: z.string().optional(),
  google_place_type: z.string().optional(),
});
export type Venue = z.infer<typeof VenueSchema>;

export const DiceSchema = obj({
  emoji: z.string(),
  value: z.number().int(),
});
export type Dice = z.infer<typeof DiceSchema>;

export const PollOptionSchema = obj({
  text: z.string(),
  voter_count: z.number().int(),
});

export const PollSchema = obj({
  id: z.string(),
  question: z.string(),
  options: z.array(PollOptionSchema),
  total_voter_count: z.number().int(),
  is_closed: z.boolean(),
  is_anonymous: z.boolean(),
  type: z.enum(["regular", "quiz"]),
  allows_multiple_answers: z.boolean(),
  correct_option_id: z.number().int().optional(),
  explanation: z.string().optional(),
  open_period: z.number().int().optional(),
  close_date: z.number().int().optional(),
});
export type Poll = z.infer<typeof PollSchema>;

export const PollAnswerSchema = obj({
  poll_id: z.string(),
  voter_chat: ChatSchema.optional(),
  user: UserSchema.optional(),
  option_ids: z.array(z.number().int()),
});
export type PollAnswer = z.infer<typeof PollAnswerSchema>;

// ---------------------------------------------------------------------------
// Message entities, reply markup, parse mode
// ---------------------------------------------------------------------------

export const ParseModeSchema = z.enum(["MarkdownV2", "Markdown", "HTML"]);
export type ParseMode = z.infer<typeof ParseModeSchema>;

export const MessageEntityTypeSchema = z.enum([
  "mention",
  "hashtag",
  "cashtag",
  "bot_command",
  "url",
  "email",
  "phone_number",
  "bold",
  "italic",
  "underline",
  "strikethrough",
  "spoiler",
  "blockquote",
  "expandable_blockquote",
  "code",
  "pre",
  "text_link",
  "text_mention",
  "custom_emoji",
]);
export type MessageEntityType = z.infer<typeof MessageEntityTypeSchema>;

export const MessageEntitySchema = obj({
  type: MessageEntityTypeSchema,
  offset: z.number().int(),
  length: z.number().int(),
  url: z.string().optional(),
  user: UserSchema.optional(),
  language: z.string().optional(),
  custom_emoji_id: z.string().optional(),
});
export type MessageEntity = z.infer<typeof MessageEntitySchema>;

// Inline keyboard / reply keyboard / etc.
export const LoginUrlSchema = obj({
  url: z.string(),
  forward_text: z.string().optional(),
  bot_username: z.string().optional(),
  request_write_access: z.boolean().optional(),
});

export const WebAppInfoSchema = obj({ url: z.string() });

export const SwitchInlineQueryChosenChatSchema = obj({
  query: z.string().optional(),
  allow_user_chats: z.boolean().optional(),
  allow_bot_chats: z.boolean().optional(),
  allow_group_chats: z.boolean().optional(),
  allow_channel_chats: z.boolean().optional(),
});

export const CallbackGameSchema = obj({});
export const CopyTextButtonSchema = obj({ text: z.string() });

export const InlineKeyboardButtonSchema = obj({
  text: z.string(),
  url: z.string().optional(),
  callback_data: z.string().optional(),
  web_app: WebAppInfoSchema.optional(),
  login_url: LoginUrlSchema.optional(),
  switch_inline_query: z.string().optional(),
  switch_inline_query_current_chat: z.string().optional(),
  switch_inline_query_chosen_chat: SwitchInlineQueryChosenChatSchema.optional(),
  copy_text: CopyTextButtonSchema.optional(),
  callback_game: CallbackGameSchema.optional(),
  pay: z.boolean().optional(),
});
export type InlineKeyboardButton = z.infer<typeof InlineKeyboardButtonSchema>;

export const InlineKeyboardMarkupSchema = obj({
  inline_keyboard: z.array(z.array(InlineKeyboardButtonSchema)),
});
export type InlineKeyboardMarkup = z.infer<typeof InlineKeyboardMarkupSchema>;

export const KeyboardButtonPollTypeSchema = obj({ type: z.string().optional() });
export const KeyboardButtonRequestUsersSchema = obj({
  request_id: z.number().int(),
  user_is_bot: z.boolean().optional(),
  user_is_premium: z.boolean().optional(),
  max_quantity: z.number().int().optional(),
  request_name: z.boolean().optional(),
  request_username: z.boolean().optional(),
  request_photo: z.boolean().optional(),
});
export const KeyboardButtonRequestChatSchema = obj({
  request_id: z.number().int(),
  chat_is_channel: z.boolean(),
  chat_is_forum: z.boolean().optional(),
  chat_has_username: z.boolean().optional(),
  chat_is_created: z.boolean().optional(),
  bot_is_member: z.boolean().optional(),
  request_title: z.boolean().optional(),
  request_username: z.boolean().optional(),
  request_photo: z.boolean().optional(),
});

export const KeyboardButtonSchema = obj({
  text: z.string(),
  request_users: KeyboardButtonRequestUsersSchema.optional(),
  request_chat: KeyboardButtonRequestChatSchema.optional(),
  request_contact: z.boolean().optional(),
  request_location: z.boolean().optional(),
  request_poll: KeyboardButtonPollTypeSchema.optional(),
  web_app: WebAppInfoSchema.optional(),
});
export type KeyboardButton = z.infer<typeof KeyboardButtonSchema>;

export const ReplyKeyboardMarkupSchema = obj({
  keyboard: z.array(z.array(KeyboardButtonSchema)),
  is_persistent: z.boolean().optional(),
  resize_keyboard: z.boolean().optional(),
  one_time_keyboard: z.boolean().optional(),
  input_field_placeholder: z.string().optional(),
  selective: z.boolean().optional(),
});
export type ReplyKeyboardMarkup = z.infer<typeof ReplyKeyboardMarkupSchema>;

export const ReplyKeyboardRemoveSchema = obj({
  remove_keyboard: z.literal(true),
  selective: z.boolean().optional(),
});
export type ReplyKeyboardRemove = z.infer<typeof ReplyKeyboardRemoveSchema>;

export const ForceReplySchema = obj({
  force_reply: z.literal(true),
  input_field_placeholder: z.string().optional(),
  selective: z.boolean().optional(),
});
export type ForceReply = z.infer<typeof ForceReplySchema>;

export const ReplyMarkupSchema = z.union([
  InlineKeyboardMarkupSchema,
  ReplyKeyboardMarkupSchema,
  ReplyKeyboardRemoveSchema,
  ForceReplySchema,
]);
export type ReplyMarkup = z.infer<typeof ReplyMarkupSchema>;

export const ReplyParametersSchema = obj({
  message_id: z.number().int(),
  chat_id: ChatIdSchema.optional(),
  allow_sending_without_reply: z.boolean().optional(),
  quote: z.string().optional(),
  quote_parse_mode: ParseModeSchema.optional(),
  quote_entities: z.array(MessageEntitySchema).optional(),
  quote_position: z.number().int().optional(),
});
export type ReplyParameters = z.infer<typeof ReplyParametersSchema>;

export const LinkPreviewOptionsSchema = obj({
  is_disabled: z.boolean().optional(),
  url: z.string().optional(),
  prefer_small_media: z.boolean().optional(),
  prefer_large_media: z.boolean().optional(),
  show_above_text: z.boolean().optional(),
});
export type LinkPreviewOptions = z.infer<typeof LinkPreviewOptionsSchema>;

// ---------------------------------------------------------------------------
// Reactions
// ---------------------------------------------------------------------------

export const ReactionTypeSchema = z.discriminatedUnion("type", [
  obj({ type: z.literal("emoji"), emoji: z.string() }),
  obj({ type: z.literal("custom_emoji"), custom_emoji_id: z.string() }),
  obj({ type: z.literal("paid") }),
]);
export type ReactionType = z.infer<typeof ReactionTypeSchema>;

export const MessageReactionUpdatedSchema = obj({
  chat: ChatSchema,
  message_id: z.number().int(),
  user: UserSchema.optional(),
  actor_chat: ChatSchema.optional(),
  date: z.number().int(),
  old_reaction: z.array(ReactionTypeSchema),
  new_reaction: z.array(ReactionTypeSchema),
});
export type MessageReactionUpdated = z.infer<typeof MessageReactionUpdatedSchema>;

export const ReactionCountSchema = obj({
  type: ReactionTypeSchema,
  total_count: z.number().int(),
});
export const MessageReactionCountUpdatedSchema = obj({
  chat: ChatSchema,
  message_id: z.number().int(),
  date: z.number().int(),
  reactions: z.array(ReactionCountSchema),
});
export type MessageReactionCountUpdated = z.infer<typeof MessageReactionCountUpdatedSchema>;

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export const InvoiceSchema = obj({
  title: z.string(),
  description: z.string(),
  start_parameter: z.string(),
  currency: z.string(),
  total_amount: z.number().int(),
});
export type Invoice = z.infer<typeof InvoiceSchema>;

export const ShippingAddressSchema = obj({
  country_code: z.string(),
  state: z.string(),
  city: z.string(),
  street_line1: z.string(),
  street_line2: z.string(),
  post_code: z.string(),
});

export const OrderInfoSchema = obj({
  name: z.string().optional(),
  phone_number: z.string().optional(),
  email: z.string().optional(),
  shipping_address: ShippingAddressSchema.optional(),
});
export type OrderInfo = z.infer<typeof OrderInfoSchema>;

export const SuccessfulPaymentSchema = obj({
  currency: z.string(),
  total_amount: z.number().int(),
  invoice_payload: z.string(),
  shipping_option_id: z.string().optional(),
  order_info: OrderInfoSchema.optional(),
  telegram_payment_charge_id: z.string(),
  provider_payment_charge_id: z.string(),
});
export type SuccessfulPayment = z.infer<typeof SuccessfulPaymentSchema>;

export const ShippingQuerySchema = obj({
  id: z.string(),
  from: UserSchema,
  invoice_payload: z.string(),
  shipping_address: ShippingAddressSchema,
});
export type ShippingQuery = z.infer<typeof ShippingQuerySchema>;

export const PreCheckoutQuerySchema = obj({
  id: z.string(),
  from: UserSchema,
  currency: z.string(),
  total_amount: z.number().int(),
  invoice_payload: z.string(),
  shipping_option_id: z.string().optional(),
  order_info: OrderInfoSchema.optional(),
});
export type PreCheckoutQuery = z.infer<typeof PreCheckoutQuerySchema>;

// ---------------------------------------------------------------------------
// Inline / Callback queries
// ---------------------------------------------------------------------------

export const CallbackQuerySchema = obj({
  id: z.string(),
  from: UserSchema,
  message: z.unknown().optional(),
  inline_message_id: z.string().optional(),
  chat_instance: z.string(),
  data: z.string().optional(),
  game_short_name: z.string().optional(),
});
export type CallbackQuery = z.infer<typeof CallbackQuerySchema>;

export const InlineQuerySchema = obj({
  id: z.string(),
  from: UserSchema,
  query: z.string(),
  offset: z.string(),
  chat_type: z.enum(["sender", "private", "group", "supergroup", "channel"]).optional(),
  location: LocationSchema.optional(),
});
export type InlineQuery = z.infer<typeof InlineQuerySchema>;

export const ChosenInlineResultSchema = obj({
  result_id: z.string(),
  from: UserSchema,
  location: LocationSchema.optional(),
  inline_message_id: z.string().optional(),
  query: z.string(),
});
export type ChosenInlineResult = z.infer<typeof ChosenInlineResultSchema>;

// ---------------------------------------------------------------------------
// Forum / topics / chat boost / business
// ---------------------------------------------------------------------------

export const ForumTopicCreatedSchema = obj({
  name: z.string(),
  icon_color: z.number().int(),
  icon_custom_emoji_id: z.string().optional(),
});
export const ForumTopicClosedSchema = obj({});
export const ForumTopicReopenedSchema = obj({});
export const ForumTopicEditedSchema = obj({
  name: z.string().optional(),
  icon_custom_emoji_id: z.string().optional(),
});
export const GeneralForumTopicHiddenSchema = obj({});
export const GeneralForumTopicUnhiddenSchema = obj({});

export const VideoChatStartedSchema = obj({});
export const VideoChatEndedSchema = obj({ duration: z.number().int() });
export const VideoChatScheduledSchema = obj({ start_date: z.number().int() });
export const VideoChatParticipantsInvitedSchema = obj({ users: z.array(UserSchema) });

export const WebAppDataSchema = obj({ data: z.string(), button_text: z.string() });

export const ChatBoostSourceSchema = obj({
  source: z.enum(["premium", "gift_code", "giveaway"]),
  user: UserSchema.optional(),
  giveaway_message_id: z.number().int().optional(),
  prize_star_count: z.number().int().optional(),
  is_unclaimed: z.boolean().optional(),
});

export const ChatBoostSchema = obj({
  boost_id: z.string(),
  add_date: z.number().int(),
  expiration_date: z.number().int(),
  source: ChatBoostSourceSchema,
});

export const ChatBoostUpdatedSchema = obj({ chat: ChatSchema, boost: ChatBoostSchema });
export const ChatBoostRemovedSchema = obj({
  chat: ChatSchema,
  boost_id: z.string(),
  remove_date: z.number().int(),
  source: ChatBoostSourceSchema,
});

export const ChatJoinRequestSchema = obj({
  chat: ChatSchema,
  from: UserSchema,
  user_chat_id: z.number().int(),
  date: z.number().int(),
  bio: z.string().optional(),
  invite_link: z.unknown().optional(),
});
export type ChatJoinRequest = z.infer<typeof ChatJoinRequestSchema>;

export const BusinessConnectionSchema = obj({
  id: z.string(),
  user: UserSchema,
  user_chat_id: z.number().int(),
  date: z.number().int(),
  can_reply: z.boolean(),
  is_enabled: z.boolean(),
});
export type BusinessConnection = z.infer<typeof BusinessConnectionSchema>;

export const BusinessMessagesDeletedSchema = obj({
  business_connection_id: z.string(),
  chat: ChatSchema,
  message_ids: z.array(z.number().int()),
});

// ---------------------------------------------------------------------------
// Chat member updates
// ---------------------------------------------------------------------------

export const ChatMemberStatusSchema = z.enum([
  "creator",
  "administrator",
  "member",
  "restricted",
  "left",
  "kicked",
]);

export const ChatMemberSchema = obj({
  status: ChatMemberStatusSchema,
  user: UserSchema,
}).passthrough();
export type ChatMember = z.infer<typeof ChatMemberSchema>;

export const ChatMemberUpdatedSchema = obj({
  chat: ChatSchema,
  from: UserSchema,
  date: z.number().int(),
  old_chat_member: ChatMemberSchema,
  new_chat_member: ChatMemberSchema,
  invite_link: z.unknown().optional(),
  via_join_request: z.boolean().optional(),
  via_chat_folder_invite_link: z.boolean().optional(),
});
export type ChatMemberUpdated = z.infer<typeof ChatMemberUpdatedSchema>;

// ---------------------------------------------------------------------------
// Message
// ---------------------------------------------------------------------------

export interface Message {
  message_id: number;
  message_thread_id?: number;
  from?: User;
  sender_chat?: Chat;
  date: number;
  chat: Chat;
  reply_to_message?: Message;
  text?: string;
  caption?: string;
  entities?: MessageEntity[];
  caption_entities?: MessageEntity[];
  photo?: PhotoSize[];
  audio?: Audio;
  document?: Document;
  animation?: Animation;
  video?: Video;
  voice?: Voice;
  video_note?: VideoNote;
  sticker?: Sticker;
  contact?: Contact;
  location?: Location;
  venue?: Venue;
  poll?: Poll;
  dice?: Dice;
  new_chat_members?: User[];
  left_chat_member?: User;
  new_chat_title?: string;
  new_chat_photo?: PhotoSize[];
  pinned_message?: Message;
  invoice?: Invoice;
  successful_payment?: SuccessfulPayment;
  reply_markup?: InlineKeyboardMarkup;
  [key: string]: unknown;
}

export const MessageSchema: z.ZodType<Message> = z.lazy(() =>
  obj({
    message_id: z.number().int(),
    message_thread_id: z.number().int().optional(),
    from: UserSchema.optional(),
    sender_chat: ChatSchema.optional(),
    date: z.number().int(),
    chat: ChatSchema,
    reply_to_message: MessageSchema.optional(),
    text: z.string().optional(),
    caption: z.string().optional(),
    entities: z.array(MessageEntitySchema).optional(),
    caption_entities: z.array(MessageEntitySchema).optional(),
    photo: z.array(PhotoSizeSchema).optional(),
    audio: AudioSchema.optional(),
    document: DocumentSchema.optional(),
    animation: AnimationSchema.optional(),
    video: VideoSchema.optional(),
    voice: VoiceSchema.optional(),
    video_note: VideoNoteSchema.optional(),
    sticker: StickerSchema.optional(),
    contact: ContactSchema.optional(),
    location: LocationSchema.optional(),
    venue: VenueSchema.optional(),
    poll: PollSchema.optional(),
    dice: DiceSchema.optional(),
    new_chat_members: z.array(UserSchema).optional(),
    left_chat_member: UserSchema.optional(),
    new_chat_title: z.string().optional(),
    new_chat_photo: z.array(PhotoSizeSchema).optional(),
    pinned_message: MessageSchema.optional(),
    invoice: InvoiceSchema.optional(),
    successful_payment: SuccessfulPaymentSchema.optional(),
    reply_markup: InlineKeyboardMarkupSchema.optional(),
  }),
);

export const MessageIdSchema = obj({ message_id: z.number().int() });
export type MessageId = z.infer<typeof MessageIdSchema>;

// ---------------------------------------------------------------------------
// Updates
// ---------------------------------------------------------------------------

export const UpdateSchema = obj({
  update_id: z.number().int(),
  message: MessageSchema.optional(),
  edited_message: MessageSchema.optional(),
  channel_post: MessageSchema.optional(),
  edited_channel_post: MessageSchema.optional(),
  business_connection: BusinessConnectionSchema.optional(),
  business_message: MessageSchema.optional(),
  edited_business_message: MessageSchema.optional(),
  deleted_business_messages: BusinessMessagesDeletedSchema.optional(),
  message_reaction: MessageReactionUpdatedSchema.optional(),
  message_reaction_count: MessageReactionCountUpdatedSchema.optional(),
  inline_query: InlineQuerySchema.optional(),
  chosen_inline_result: ChosenInlineResultSchema.optional(),
  callback_query: CallbackQuerySchema.optional(),
  shipping_query: ShippingQuerySchema.optional(),
  pre_checkout_query: PreCheckoutQuerySchema.optional(),
  poll: PollSchema.optional(),
  poll_answer: PollAnswerSchema.optional(),
  my_chat_member: ChatMemberUpdatedSchema.optional(),
  chat_member: ChatMemberUpdatedSchema.optional(),
  chat_join_request: ChatJoinRequestSchema.optional(),
  chat_boost: ChatBoostUpdatedSchema.optional(),
  removed_chat_boost: ChatBoostRemovedSchema.optional(),
  purchased_paid_media: z.unknown().optional(),
});
export type Update = z.infer<typeof UpdateSchema>;

// ---------------------------------------------------------------------------
// Misc top-level results
// ---------------------------------------------------------------------------

export const WebhookInfoSchema = obj({
  url: z.string(),
  has_custom_certificate: z.boolean(),
  pending_update_count: z.number().int(),
  ip_address: z.string().optional(),
  last_error_date: z.number().int().optional(),
  last_error_message: z.string().optional(),
  last_synchronization_error_date: z.number().int().optional(),
  max_connections: z.number().int().optional(),
  allowed_updates: z.array(z.string()).optional(),
});
export type WebhookInfo = z.infer<typeof WebhookInfoSchema>;

export const BotCommandSchema = obj({ command: z.string(), description: z.string() });
export type BotCommand = z.infer<typeof BotCommandSchema>;

export const BotNameSchema = obj({ name: z.string() });
export const BotDescriptionSchema = obj({ description: z.string() });
export const BotShortDescriptionSchema = obj({ short_description: z.string() });

export const ChatInviteLinkSchema = obj({
  invite_link: z.string(),
  creator: UserSchema,
  creates_join_request: z.boolean(),
  is_primary: z.boolean(),
  is_revoked: z.boolean(),
  name: z.string().optional(),
  expire_date: z.number().int().optional(),
  member_limit: z.number().int().optional(),
  pending_join_request_count: z.number().int().optional(),
  subscription_period: z.number().int().optional(),
  subscription_price: z.number().int().optional(),
});
export type ChatInviteLink = z.infer<typeof ChatInviteLinkSchema>;

export const ForumTopicSchema = obj({
  message_thread_id: z.number().int(),
  name: z.string(),
  icon_color: z.number().int(),
  icon_custom_emoji_id: z.string().optional(),
});
export type ForumTopic = z.infer<typeof ForumTopicSchema>;

export const UserProfilePhotosSchema = obj({
  total_count: z.number().int(),
  photos: z.array(z.array(PhotoSizeSchema)),
});
export type UserProfilePhotos = z.infer<typeof UserProfilePhotosSchema>;

// ---------------------------------------------------------------------------
// Telegram envelope (raw HTTP response)
// ---------------------------------------------------------------------------

export const TelegramApiResponseSchema = z.object({
  ok: z.boolean(),
  result: z.unknown().optional(),
  description: z.string().optional(),
  error_code: z.number().int().optional(),
  parameters: z
    .object({
      migrate_to_chat_id: z.number().int().optional(),
      retry_after: z.number().int().optional(),
    })
    .passthrough()
    .optional(),
});
export type TelegramApiResponse<T = unknown> = {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
  parameters?: { migrate_to_chat_id?: number; retry_after?: number };
};

// ---------------------------------------------------------------------------
// Message types enum (the events emitted on `message`)
// ---------------------------------------------------------------------------

export const MESSAGE_TYPES = [
  "text",
  "animation",
  "audio",
  "channel_chat_created",
  "contact",
  "delete_chat_photo",
  "dice",
  "document",
  "game",
  "group_chat_created",
  "invoice",
  "left_chat_member",
  "location",
  "migrate_from_chat_id",
  "migrate_to_chat_id",
  "new_chat_members",
  "new_chat_photo",
  "new_chat_title",
  "passport_data",
  "photo",
  "pinned_message",
  "poll",
  "sticker",
  "successful_payment",
  "supergroup_chat_created",
  "video",
  "video_note",
  "voice",
  "video_chat_started",
  "video_chat_ended",
  "video_chat_participants_invited",
  "video_chat_scheduled",
  "message_auto_delete_timer_changed",
  "chat_invite_link",
  "chat_member_updated",
  "web_app_data",
  "message_reaction",
] as const;

export type MessageType = (typeof MESSAGE_TYPES)[number];
