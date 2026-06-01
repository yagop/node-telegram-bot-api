/**
 * @file Auto-generated Zod schemas for the Telegram Bot API.
 *
 * DO NOT EDIT — regenerate via `npm run gen:schemas`. The generator
 * lives at `scripts/generate-schemas.ts` and scrapes the official docs at
 * https://core.telegram.org/bots/api.
 *
 * Schemas are emitted as plain `z.object(...)` (strict). Callers that want
 * forward-compat through unknown-key preservation should use
 * `parseWithPassthrough(SomeSchema, data)` — it walks the schema tree and
 * applies `.passthrough()` at every object boundary before parsing.
 *
 * Why split it this way: keeping `.passthrough()` baked into every schema
 * forces every inferred type to carry `& { [k: string]: unknown }`, which
 * bloats the .d.ts output and triggers TS7056 for any moderately complex
 * type. By making passthrough an opt-in parse-time wrapper we get clean
 * strict inferred types here without losing forward-compat at the
 * response-parsing boundary.
 */

import { z } from "zod";

const obj = <T extends z.ZodRawShape>(shape: T) => z.object(shape);

/**
 * Recursively wrap a schema so every `ZodObject` inside parses in
 * passthrough mode (unknown keys survive). Use this when validating
 * incoming Telegram payloads — Telegram regularly extends responses with
 * new optional fields between API releases and silently dropping them
 * would break downstream readers.
 */
export function withPassthrough<T extends z.ZodTypeAny>(schema: T): T {
  if (schema instanceof z.ZodObject) {
    const shape: Record<string, z.ZodTypeAny> = {};
    for (const key of Object.keys(schema.shape)) {
      shape[key] = withPassthrough(schema.shape[key]);
    }
    return z.object(shape).passthrough() as unknown as T;
  }
  if (schema instanceof z.ZodArray) {
    return z.array(withPassthrough((schema as z.ZodArray<z.ZodTypeAny>).element)) as unknown as T;
  }
  if (schema instanceof z.ZodOptional) {
    return withPassthrough((schema as z.ZodOptional<z.ZodTypeAny>).unwrap()).optional() as unknown as T;
  }
  if (schema instanceof z.ZodNullable) {
    return withPassthrough((schema as z.ZodNullable<z.ZodTypeAny>).unwrap()).nullable() as unknown as T;
  }
  if (schema instanceof z.ZodUnion) {
    const options = (schema as z.ZodUnion<readonly [z.ZodTypeAny, ...z.ZodTypeAny[]]>).options;
    return z.union(options.map(withPassthrough) as unknown as readonly [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]) as unknown as T;
  }
  if (schema instanceof z.ZodLazy) {
    return z.lazy(() => withPassthrough((schema as z.ZodLazy<z.ZodTypeAny>).schema)) as unknown as T;
  }
  return schema;
}

/** Convenience wrapper: `parseWithPassthrough(MessageSchema, payload)`. */
export function parseWithPassthrough<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  return withPassthrough(schema).parse(data) as z.infer<T>;
}

// "Integer or String" is the chat-id shape used pervasively across the API.
export const ChatIdSchema = z.union([z.number().int(), z.string()]);
export type ChatId = z.infer<typeof ChatIdSchema>;

// ParseMode is documented only in prose ("Formatting options"), not as a type.
export const ParseModeSchema = z.enum(["MarkdownV2", "Markdown", "HTML"]);
export type ParseMode = z.infer<typeof ParseModeSchema>;

// Library-specific event names emitted on the `message` channel.
export const MESSAGE_TYPES = [
  "text", "animation", "audio", "channel_chat_created", "contact",
  "delete_chat_photo", "dice", "document", "game", "group_chat_created",
  "invoice", "left_chat_member", "location", "migrate_from_chat_id",
  "migrate_to_chat_id", "new_chat_members", "new_chat_photo", "new_chat_title",
  "passport_data", "photo", "pinned_message", "poll", "sticker",
  "successful_payment", "supergroup_chat_created", "video", "video_note",
  "voice", "video_chat_started", "video_chat_ended",
  "video_chat_participants_invited", "video_chat_scheduled",
  "message_auto_delete_timer_changed", "chat_invite_link",
  "chat_member_updated", "web_app_data", "message_reaction",
] as const;
export type MessageType = typeof MESSAGE_TYPES[number];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export const UserSchema = obj({
  id: z.number().int(),
  is_bot: z.boolean(),
  first_name: z.string(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  language_code: z.string().optional(),
  is_premium: z.literal(true).optional(),
  added_to_attachment_menu: z.literal(true).optional(),
  can_join_groups: z.boolean().optional(),
  can_read_all_group_messages: z.boolean().optional(),
  supports_guest_queries: z.boolean().optional(),
  supports_inline_queries: z.boolean().optional(),
  can_connect_to_business: z.boolean().optional(),
  has_main_web_app: z.boolean().optional(),
  has_topics_enabled: z.boolean().optional(),
  allows_users_to_create_topics: z.boolean().optional(),
  can_manage_bots: z.boolean().optional(),
});
export type User = z.infer<typeof UserSchema>;
export const DirectMessagesTopicSchema = obj({
  topic_id: z.number().int(),
  user: UserSchema.optional(),
});
export type DirectMessagesTopic = z.infer<typeof DirectMessagesTopicSchema>;
export const ChatSchema = obj({
  id: z.number().int(),
  type: z.enum(["private", "group", "supergroup", "channel"]),
  title: z.string().optional(),
  username: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  is_forum: z.literal(true).optional(),
  is_direct_messages: z.literal(true).optional(),
});
export type Chat = z.infer<typeof ChatSchema>;
export const MessageOriginUserSchema = obj({
  type: z.literal("user"),
  date: z.number().int(),
  sender_user: UserSchema,
});
export type MessageOriginUser = z.infer<typeof MessageOriginUserSchema>;
export const MessageOriginHiddenUserSchema = obj({
  type: z.literal("hidden_user"),
  date: z.number().int(),
  sender_user_name: z.string(),
});
export type MessageOriginHiddenUser = z.infer<typeof MessageOriginHiddenUserSchema>;
export const MessageOriginChatSchema = obj({
  type: z.literal("chat"),
  date: z.number().int(),
  sender_chat: ChatSchema,
  author_signature: z.string().optional(),
});
export type MessageOriginChat = z.infer<typeof MessageOriginChatSchema>;
export const MessageOriginChannelSchema = obj({
  type: z.literal("channel"),
  date: z.number().int(),
  chat: ChatSchema,
  message_id: z.number().int(),
  author_signature: z.string().optional(),
});
export type MessageOriginChannel = z.infer<typeof MessageOriginChannelSchema>;
export type MessageOrigin = MessageOriginUser | MessageOriginHiddenUser | MessageOriginChat | MessageOriginChannel;
export const MessageOriginSchema: z.ZodType<MessageOrigin> = z.union([
  MessageOriginUserSchema,
  MessageOriginHiddenUserSchema,
  MessageOriginChatSchema,
  MessageOriginChannelSchema,
]);
export const LinkPreviewOptionsSchema = obj({
  is_disabled: z.boolean().optional(),
  url: z.string().optional(),
  prefer_small_media: z.boolean().optional(),
  prefer_large_media: z.boolean().optional(),
  show_above_text: z.boolean().optional(),
});
export type LinkPreviewOptions = z.infer<typeof LinkPreviewOptionsSchema>;
export const PhotoSizeSchema = obj({
  file_id: z.string(),
  file_unique_id: z.string(),
  width: z.number().int(),
  height: z.number().int(),
  file_size: z.number().int().optional(),
});
export type PhotoSize = z.infer<typeof PhotoSizeSchema>;
export const AnimationSchema = obj({
  file_id: z.string(),
  file_unique_id: z.string(),
  width: z.number().int(),
  height: z.number().int(),
  duration: z.number().int(),
  thumbnail: PhotoSizeSchema.optional(),
  file_name: z.string().optional(),
  mime_type: z.string().optional(),
  file_size: z.number().int().optional(),
});
export type Animation = z.infer<typeof AnimationSchema>;
export const AudioSchema = obj({
  file_id: z.string(),
  file_unique_id: z.string(),
  duration: z.number().int(),
  performer: z.string().optional(),
  title: z.string().optional(),
  file_name: z.string().optional(),
  mime_type: z.string().optional(),
  file_size: z.number().int().optional(),
  thumbnail: PhotoSizeSchema.optional(),
});
export type Audio = z.infer<typeof AudioSchema>;
export const DocumentSchema = obj({
  file_id: z.string(),
  file_unique_id: z.string(),
  thumbnail: PhotoSizeSchema.optional(),
  file_name: z.string().optional(),
  mime_type: z.string().optional(),
  file_size: z.number().int().optional(),
});
export type Document = z.infer<typeof DocumentSchema>;
export const LivePhotoSchema = obj({
  photo: z.array(PhotoSizeSchema).optional(),
  file_id: z.string(),
  file_unique_id: z.string(),
  width: z.number().int(),
  height: z.number().int(),
  duration: z.number().int(),
  mime_type: z.string().optional(),
  file_size: z.number().int().optional(),
});
export type LivePhoto = z.infer<typeof LivePhotoSchema>;
export const PaidMediaLivePhotoSchema = obj({
  type: z.literal("live_photo"),
  live_photo: LivePhotoSchema,
});
export type PaidMediaLivePhoto = z.infer<typeof PaidMediaLivePhotoSchema>;
export const PaidMediaPhotoSchema = obj({
  type: z.literal("photo"),
  photo: z.array(PhotoSizeSchema),
});
export type PaidMediaPhoto = z.infer<typeof PaidMediaPhotoSchema>;
export const PaidMediaPreviewSchema = obj({
  type: z.literal("preview"),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  duration: z.number().int().optional(),
});
export type PaidMediaPreview = z.infer<typeof PaidMediaPreviewSchema>;
export const VideoQualitySchema = obj({
  file_id: z.string(),
  file_unique_id: z.string(),
  width: z.number().int(),
  height: z.number().int(),
  codec: z.string(),
  file_size: z.number().int().optional(),
});
export type VideoQuality = z.infer<typeof VideoQualitySchema>;
export const VideoSchema = obj({
  file_id: z.string(),
  file_unique_id: z.string(),
  width: z.number().int(),
  height: z.number().int(),
  duration: z.number().int(),
  thumbnail: PhotoSizeSchema.optional(),
  cover: z.array(PhotoSizeSchema).optional(),
  start_timestamp: z.number().int().optional(),
  qualities: z.array(VideoQualitySchema).optional(),
  file_name: z.string().optional(),
  mime_type: z.string().optional(),
  file_size: z.number().int().optional(),
});
export type Video = z.infer<typeof VideoSchema>;
export const PaidMediaVideoSchema = obj({
  type: z.literal("video"),
  video: VideoSchema,
});
export type PaidMediaVideo = z.infer<typeof PaidMediaVideoSchema>;
export type PaidMedia = PaidMediaLivePhoto | PaidMediaPhoto | PaidMediaPreview | PaidMediaVideo;
export const PaidMediaSchema: z.ZodType<PaidMedia> = z.union([
  PaidMediaLivePhotoSchema,
  PaidMediaPhotoSchema,
  PaidMediaPreviewSchema,
  PaidMediaVideoSchema,
]);
export const PaidMediaInfoSchema = obj({
  star_count: z.number().int(),
  paid_media: z.array(PaidMediaSchema),
});
export type PaidMediaInfo = z.infer<typeof PaidMediaInfoSchema>;
export const FileSchema = obj({
  file_id: z.string(),
  file_unique_id: z.string(),
  file_size: z.number().int().optional(),
  file_path: z.string().optional(),
});
export type File = z.infer<typeof FileSchema>;
export const MaskPositionSchema = obj({
  point: z.string(),
  x_shift: z.number(),
  y_shift: z.number(),
  scale: z.number(),
});
export type MaskPosition = z.infer<typeof MaskPositionSchema>;
export const StickerSchema = obj({
  file_id: z.string(),
  file_unique_id: z.string(),
  type: z.enum(["regular", "mask", "custom_emoji"]),
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
  needs_repainting: z.literal(true).optional(),
  file_size: z.number().int().optional(),
});
export type Sticker = z.infer<typeof StickerSchema>;
export const StorySchema = obj({
  chat: ChatSchema,
  id: z.number().int(),
});
export type Story = z.infer<typeof StorySchema>;
export const VideoNoteSchema = obj({
  file_id: z.string(),
  file_unique_id: z.string(),
  length: z.number().int(),
  duration: z.number().int(),
  thumbnail: PhotoSizeSchema.optional(),
  file_size: z.number().int().optional(),
});
export type VideoNote = z.infer<typeof VideoNoteSchema>;
export const VoiceSchema = obj({
  file_id: z.string(),
  file_unique_id: z.string(),
  duration: z.number().int(),
  mime_type: z.string().optional(),
  file_size: z.number().int().optional(),
});
export type Voice = z.infer<typeof VoiceSchema>;
export const MessageEntitySchema = obj({
  type: z.string(),
  offset: z.number().int(),
  length: z.number().int(),
  url: z.string().optional(),
  user: UserSchema.optional(),
  language: z.string().optional(),
  custom_emoji_id: z.string().optional(),
  unix_time: z.number().int().optional(),
  date_time_format: z.string().optional(),
});
export type MessageEntity = z.infer<typeof MessageEntitySchema>;
export const ChecklistTaskSchema = obj({
  id: z.number().int(),
  text: z.string(),
  text_entities: z.array(MessageEntitySchema).optional(),
  completed_by_user: UserSchema.optional(),
  completed_by_chat: ChatSchema.optional(),
  completion_date: z.number().int().optional(),
});
export type ChecklistTask = z.infer<typeof ChecklistTaskSchema>;
export const ChecklistSchema = obj({
  title: z.string(),
  title_entities: z.array(MessageEntitySchema).optional(),
  tasks: z.array(ChecklistTaskSchema),
  others_can_add_tasks: z.literal(true).optional(),
  others_can_mark_tasks_as_done: z.literal(true).optional(),
});
export type Checklist = z.infer<typeof ChecklistSchema>;
export const ContactSchema = obj({
  phone_number: z.string(),
  first_name: z.string(),
  last_name: z.string().optional(),
  user_id: z.number().int().optional(),
  vcard: z.string().optional(),
});
export type Contact = z.infer<typeof ContactSchema>;
export const DiceSchema = obj({
  emoji: z.string(),
  value: z.number().int(),
});
export type Dice = z.infer<typeof DiceSchema>;
export const GameSchema = obj({
  title: z.string(),
  description: z.string(),
  photo: z.array(PhotoSizeSchema),
  text: z.string().optional(),
  text_entities: z.array(MessageEntitySchema).optional(),
  animation: AnimationSchema.optional(),
});
export type Game = z.infer<typeof GameSchema>;
export const GiveawaySchema = obj({
  chats: z.array(ChatSchema),
  winners_selection_date: z.number().int(),
  winner_count: z.number().int(),
  only_new_members: z.literal(true).optional(),
  has_public_winners: z.literal(true).optional(),
  prize_description: z.string().optional(),
  country_codes: z.array(z.string()).optional(),
  prize_star_count: z.number().int().optional(),
  premium_subscription_month_count: z.number().int().optional(),
});
export type Giveaway = z.infer<typeof GiveawaySchema>;
export const GiveawayWinnersSchema = obj({
  chat: ChatSchema,
  giveaway_message_id: z.number().int(),
  winners_selection_date: z.number().int(),
  winner_count: z.number().int(),
  winners: z.array(UserSchema),
  additional_chat_count: z.number().int().optional(),
  prize_star_count: z.number().int().optional(),
  premium_subscription_month_count: z.number().int().optional(),
  unclaimed_prize_count: z.number().int().optional(),
  only_new_members: z.literal(true).optional(),
  was_refunded: z.literal(true).optional(),
  prize_description: z.string().optional(),
});
export type GiveawayWinners = z.infer<typeof GiveawayWinnersSchema>;
export const InvoiceSchema = obj({
  title: z.string(),
  description: z.string(),
  start_parameter: z.string(),
  currency: z.string(),
  total_amount: z.number().int(),
});
export type Invoice = z.infer<typeof InvoiceSchema>;
export const LocationSchema = obj({
  latitude: z.number(),
  longitude: z.number(),
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
export const PollMediaSchema = obj({
  animation: AnimationSchema.optional(),
  audio: AudioSchema.optional(),
  document: DocumentSchema.optional(),
  live_photo: LivePhotoSchema.optional(),
  location: LocationSchema.optional(),
  photo: z.array(PhotoSizeSchema).optional(),
  sticker: StickerSchema.optional(),
  venue: VenueSchema.optional(),
  video: VideoSchema.optional(),
});
export type PollMedia = z.infer<typeof PollMediaSchema>;
export const PollOptionSchema = obj({
  persistent_id: z.string(),
  text: z.string(),
  text_entities: z.array(MessageEntitySchema).optional(),
  media: PollMediaSchema.optional(),
  voter_count: z.number().int(),
  added_by_user: UserSchema.optional(),
  added_by_chat: ChatSchema.optional(),
  addition_date: z.number().int().optional(),
});
export type PollOption = z.infer<typeof PollOptionSchema>;
export const PollSchema = obj({
  id: z.string(),
  question: z.string(),
  question_entities: z.array(MessageEntitySchema).optional(),
  options: z.array(PollOptionSchema),
  total_voter_count: z.number().int(),
  is_closed: z.boolean(),
  is_anonymous: z.boolean(),
  type: z.string(),
  allows_multiple_answers: z.boolean(),
  allows_revoting: z.boolean(),
  members_only: z.boolean(),
  country_codes: z.array(z.string()).optional(),
  correct_option_ids: z.array(z.number().int()).optional(),
  explanation: z.string().optional(),
  explanation_entities: z.array(MessageEntitySchema).optional(),
  explanation_media: PollMediaSchema.optional(),
  open_period: z.number().int().optional(),
  close_date: z.number().int().optional(),
  description: z.string().optional(),
  description_entities: z.array(MessageEntitySchema).optional(),
  media: PollMediaSchema.optional(),
});
export type Poll = z.infer<typeof PollSchema>;
export interface ExternalReplyInfo {
  origin: MessageOrigin;
  chat?: Chat;
  message_id?: number;
  link_preview_options?: LinkPreviewOptions;
  animation?: Animation;
  audio?: Audio;
  document?: Document;
  live_photo?: LivePhoto;
  paid_media?: PaidMediaInfo;
  photo?: Array<PhotoSize>;
  sticker?: Sticker;
  story?: Story;
  video?: Video;
  video_note?: VideoNote;
  voice?: Voice;
  has_media_spoiler?: true;
  checklist?: Checklist;
  contact?: Contact;
  dice?: Dice;
  game?: Game;
  giveaway?: Giveaway;
  giveaway_winners?: GiveawayWinners;
  invoice?: Invoice;
  location?: Location;
  poll?: Poll;
  venue?: Venue;
}
export const ExternalReplyInfoSchema: z.ZodType<ExternalReplyInfo> = obj({
  origin: MessageOriginSchema,
  chat: ChatSchema.optional(),
  message_id: z.number().int().optional(),
  link_preview_options: LinkPreviewOptionsSchema.optional(),
  animation: AnimationSchema.optional(),
  audio: AudioSchema.optional(),
  document: DocumentSchema.optional(),
  live_photo: LivePhotoSchema.optional(),
  paid_media: PaidMediaInfoSchema.optional(),
  photo: z.array(PhotoSizeSchema).optional(),
  sticker: StickerSchema.optional(),
  story: StorySchema.optional(),
  video: VideoSchema.optional(),
  video_note: VideoNoteSchema.optional(),
  voice: VoiceSchema.optional(),
  has_media_spoiler: z.literal(true).optional(),
  checklist: ChecklistSchema.optional(),
  contact: ContactSchema.optional(),
  dice: DiceSchema.optional(),
  game: GameSchema.optional(),
  giveaway: GiveawaySchema.optional(),
  giveaway_winners: GiveawayWinnersSchema.optional(),
  invoice: InvoiceSchema.optional(),
  location: LocationSchema.optional(),
  poll: PollSchema.optional(),
  venue: VenueSchema.optional(),
});
export const TextQuoteSchema = obj({
  text: z.string(),
  entities: z.array(MessageEntitySchema).optional(),
  position: z.number().int(),
  is_manual: z.literal(true).optional(),
});
export type TextQuote = z.infer<typeof TextQuoteSchema>;
export const SuggestedPostPriceSchema = obj({
  currency: z.enum(["XTR", "TON"]),
  amount: z.number().int(),
});
export type SuggestedPostPrice = z.infer<typeof SuggestedPostPriceSchema>;
export const SuggestedPostInfoSchema = obj({
  state: z.enum(["pending", "approved", "declined"]),
  price: SuggestedPostPriceSchema.optional(),
  send_date: z.number().int().optional(),
});
export type SuggestedPostInfo = z.infer<typeof SuggestedPostInfoSchema>;
export const ChatOwnerLeftSchema = obj({
  new_owner: UserSchema.optional(),
});
export type ChatOwnerLeft = z.infer<typeof ChatOwnerLeftSchema>;
export const ChatOwnerChangedSchema = obj({
  new_owner: UserSchema,
});
export type ChatOwnerChanged = z.infer<typeof ChatOwnerChangedSchema>;
export const MessageAutoDeleteTimerChangedSchema = obj({
  message_auto_delete_time: z.number().int(),
});
export type MessageAutoDeleteTimerChanged = z.infer<typeof MessageAutoDeleteTimerChangedSchema>;
export const InaccessibleMessageSchema = obj({
  chat: ChatSchema,
  message_id: z.number().int(),
  date: z.number().int(),
});
export type InaccessibleMessage = z.infer<typeof InaccessibleMessageSchema>;
export type MaybeInaccessibleMessage = Message | InaccessibleMessage;
export const MaybeInaccessibleMessageSchema: z.ZodType<MaybeInaccessibleMessage> = z.lazy(() => z.union([
  MessageSchema,
  InaccessibleMessageSchema,
]));
export const ShippingAddressSchema = obj({
  country_code: z.string(),
  state: z.string(),
  city: z.string(),
  street_line1: z.string(),
  street_line2: z.string(),
  post_code: z.string(),
});
export type ShippingAddress = z.infer<typeof ShippingAddressSchema>;
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
  subscription_expiration_date: z.number().int().optional(),
  is_recurring: z.literal(true).optional(),
  is_first_recurring: z.literal(true).optional(),
  shipping_option_id: z.string().optional(),
  order_info: OrderInfoSchema.optional(),
  telegram_payment_charge_id: z.string(),
  provider_payment_charge_id: z.string(),
});
export type SuccessfulPayment = z.infer<typeof SuccessfulPaymentSchema>;
export const RefundedPaymentSchema = obj({
  currency: z.literal("XTR"),
  total_amount: z.number().int(),
  invoice_payload: z.string(),
  telegram_payment_charge_id: z.string(),
  provider_payment_charge_id: z.string().optional(),
});
export type RefundedPayment = z.infer<typeof RefundedPaymentSchema>;
export const SharedUserSchema = obj({
  user_id: z.number().int(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  photo: z.array(PhotoSizeSchema).optional(),
});
export type SharedUser = z.infer<typeof SharedUserSchema>;
export const UsersSharedSchema = obj({
  request_id: z.number().int(),
  users: z.array(SharedUserSchema),
});
export type UsersShared = z.infer<typeof UsersSharedSchema>;
export const ChatSharedSchema = obj({
  request_id: z.number().int(),
  chat_id: z.number().int(),
  title: z.string().optional(),
  username: z.string().optional(),
  photo: z.array(PhotoSizeSchema).optional(),
});
export type ChatShared = z.infer<typeof ChatSharedSchema>;
export const GiftBackgroundSchema = obj({
  center_color: z.number().int(),
  edge_color: z.number().int(),
  text_color: z.number().int(),
});
export type GiftBackground = z.infer<typeof GiftBackgroundSchema>;
export const GiftSchema = obj({
  id: z.string(),
  sticker: StickerSchema,
  star_count: z.number().int(),
  upgrade_star_count: z.number().int().optional(),
  is_premium: z.literal(true).optional(),
  has_colors: z.literal(true).optional(),
  total_count: z.number().int().optional(),
  remaining_count: z.number().int().optional(),
  personal_total_count: z.number().int().optional(),
  personal_remaining_count: z.number().int().optional(),
  background: GiftBackgroundSchema.optional(),
  unique_gift_variant_count: z.number().int().optional(),
  publisher_chat: ChatSchema.optional(),
});
export type Gift = z.infer<typeof GiftSchema>;
export const GiftInfoSchema = obj({
  gift: GiftSchema,
  owned_gift_id: z.string().optional(),
  convert_star_count: z.number().int().optional(),
  prepaid_upgrade_star_count: z.number().int().optional(),
  is_upgrade_separate: z.literal(true).optional(),
  can_be_upgraded: z.literal(true).optional(),
  text: z.string().optional(),
  entities: z.array(MessageEntitySchema).optional(),
  is_private: z.literal(true).optional(),
  unique_gift_number: z.number().int().optional(),
});
export type GiftInfo = z.infer<typeof GiftInfoSchema>;
export const UniqueGiftModelSchema = obj({
  name: z.string(),
  sticker: StickerSchema,
  rarity_per_mille: z.number().int(),
  rarity: z.string().optional(),
});
export type UniqueGiftModel = z.infer<typeof UniqueGiftModelSchema>;
export const UniqueGiftSymbolSchema = obj({
  name: z.string(),
  sticker: StickerSchema,
  rarity_per_mille: z.number().int(),
});
export type UniqueGiftSymbol = z.infer<typeof UniqueGiftSymbolSchema>;
export const UniqueGiftBackdropColorsSchema = obj({
  center_color: z.number().int(),
  edge_color: z.number().int(),
  symbol_color: z.number().int(),
  text_color: z.number().int(),
});
export type UniqueGiftBackdropColors = z.infer<typeof UniqueGiftBackdropColorsSchema>;
export const UniqueGiftBackdropSchema = obj({
  name: z.string(),
  colors: UniqueGiftBackdropColorsSchema,
  rarity_per_mille: z.number().int(),
});
export type UniqueGiftBackdrop = z.infer<typeof UniqueGiftBackdropSchema>;
export const UniqueGiftColorsSchema = obj({
  model_custom_emoji_id: z.string(),
  symbol_custom_emoji_id: z.string(),
  light_theme_main_color: z.number().int(),
  light_theme_other_colors: z.array(z.number().int()),
  dark_theme_main_color: z.number().int(),
  dark_theme_other_colors: z.array(z.number().int()),
});
export type UniqueGiftColors = z.infer<typeof UniqueGiftColorsSchema>;
export const UniqueGiftSchema = obj({
  gift_id: z.string(),
  base_name: z.string(),
  name: z.string(),
  number: z.number().int(),
  model: UniqueGiftModelSchema,
  symbol: UniqueGiftSymbolSchema,
  backdrop: UniqueGiftBackdropSchema,
  is_premium: z.literal(true).optional(),
  is_burned: z.literal(true).optional(),
  is_from_blockchain: z.literal(true).optional(),
  colors: UniqueGiftColorsSchema.optional(),
  publisher_chat: ChatSchema.optional(),
});
export type UniqueGift = z.infer<typeof UniqueGiftSchema>;
export const UniqueGiftInfoSchema = obj({
  gift: UniqueGiftSchema,
  origin: z.enum(["upgrade", "transfer", "resale", "gifted_upgrade", "offer"]),
  last_resale_currency: z.enum(["XTR", "TON"]).optional(),
  last_resale_amount: z.number().int().optional(),
  owned_gift_id: z.string().optional(),
  transfer_star_count: z.number().int().optional(),
  next_transfer_date: z.number().int().optional(),
});
export type UniqueGiftInfo = z.infer<typeof UniqueGiftInfoSchema>;
export const WriteAccessAllowedSchema = obj({
  from_request: z.boolean().optional(),
  web_app_name: z.string().optional(),
  from_attachment_menu: z.boolean().optional(),
});
export type WriteAccessAllowed = z.infer<typeof WriteAccessAllowedSchema>;
export const PassportFileSchema = obj({
  file_id: z.string(),
  file_unique_id: z.string(),
  file_size: z.number().int(),
  file_date: z.number().int(),
});
export type PassportFile = z.infer<typeof PassportFileSchema>;
export const EncryptedPassportElementSchema = obj({
  type: z.string(),
  data: z.string().optional(),
  phone_number: z.string().optional(),
  email: z.string().optional(),
  files: z.array(PassportFileSchema).optional(),
  front_side: PassportFileSchema.optional(),
  reverse_side: PassportFileSchema.optional(),
  selfie: PassportFileSchema.optional(),
  translation: z.array(PassportFileSchema).optional(),
  hash: z.string(),
});
export type EncryptedPassportElement = z.infer<typeof EncryptedPassportElementSchema>;
export const EncryptedCredentialsSchema = obj({
  data: z.string(),
  hash: z.string(),
  secret: z.string(),
});
export type EncryptedCredentials = z.infer<typeof EncryptedCredentialsSchema>;
export const PassportDataSchema = obj({
  data: z.array(EncryptedPassportElementSchema),
  credentials: EncryptedCredentialsSchema,
});
export type PassportData = z.infer<typeof PassportDataSchema>;
export const ProximityAlertTriggeredSchema = obj({
  traveler: UserSchema,
  watcher: UserSchema,
  distance: z.number().int(),
});
export type ProximityAlertTriggered = z.infer<typeof ProximityAlertTriggeredSchema>;
export const ChatBoostAddedSchema = obj({
  boost_count: z.number().int(),
});
export type ChatBoostAdded = z.infer<typeof ChatBoostAddedSchema>;
export const BackgroundFillSolidSchema = obj({
  type: z.literal("solid"),
  color: z.number().int(),
});
export type BackgroundFillSolid = z.infer<typeof BackgroundFillSolidSchema>;
export const BackgroundFillGradientSchema = obj({
  type: z.literal("gradient"),
  top_color: z.number().int(),
  bottom_color: z.number().int(),
  rotation_angle: z.number().int(),
});
export type BackgroundFillGradient = z.infer<typeof BackgroundFillGradientSchema>;
export const BackgroundFillFreeformGradientSchema = obj({
  type: z.literal("freeform_gradient"),
  colors: z.array(z.number().int()),
});
export type BackgroundFillFreeformGradient = z.infer<typeof BackgroundFillFreeformGradientSchema>;
export type BackgroundFill = BackgroundFillSolid | BackgroundFillGradient | BackgroundFillFreeformGradient;
export const BackgroundFillSchema: z.ZodType<BackgroundFill> = z.union([
  BackgroundFillSolidSchema,
  BackgroundFillGradientSchema,
  BackgroundFillFreeformGradientSchema,
]);
export const BackgroundTypeFillSchema = obj({
  type: z.literal("fill"),
  fill: BackgroundFillSchema,
  dark_theme_dimming: z.number().int(),
});
export type BackgroundTypeFill = z.infer<typeof BackgroundTypeFillSchema>;
export const BackgroundTypeWallpaperSchema = obj({
  type: z.literal("wallpaper"),
  document: DocumentSchema,
  dark_theme_dimming: z.number().int(),
  is_blurred: z.literal(true).optional(),
  is_moving: z.literal(true).optional(),
});
export type BackgroundTypeWallpaper = z.infer<typeof BackgroundTypeWallpaperSchema>;
export const BackgroundTypePatternSchema = obj({
  type: z.literal("pattern"),
  document: DocumentSchema,
  fill: BackgroundFillSchema,
  intensity: z.number().int(),
  is_inverted: z.literal(true).optional(),
  is_moving: z.literal(true).optional(),
});
export type BackgroundTypePattern = z.infer<typeof BackgroundTypePatternSchema>;
export const BackgroundTypeChatThemeSchema = obj({
  type: z.literal("chat_theme"),
  theme_name: z.string(),
});
export type BackgroundTypeChatTheme = z.infer<typeof BackgroundTypeChatThemeSchema>;
export type BackgroundType = BackgroundTypeFill | BackgroundTypeWallpaper | BackgroundTypePattern | BackgroundTypeChatTheme;
export const BackgroundTypeSchema: z.ZodType<BackgroundType> = z.union([
  BackgroundTypeFillSchema,
  BackgroundTypeWallpaperSchema,
  BackgroundTypePatternSchema,
  BackgroundTypeChatThemeSchema,
]);
export const ChatBackgroundSchema = obj({
  type: BackgroundTypeSchema,
});
export type ChatBackground = z.infer<typeof ChatBackgroundSchema>;
export interface ChecklistTasksDone {
  checklist_message?: Message;
  marked_as_done_task_ids?: Array<number>;
  marked_as_not_done_task_ids?: Array<number>;
}
export const ChecklistTasksDoneSchema: z.ZodType<ChecklistTasksDone> = z.lazy(() => obj({
  checklist_message: MessageSchema.optional(),
  marked_as_done_task_ids: z.array(z.number().int()).optional(),
  marked_as_not_done_task_ids: z.array(z.number().int()).optional(),
}));
export interface ChecklistTasksAdded {
  checklist_message?: Message;
  tasks: Array<ChecklistTask>;
}
export const ChecklistTasksAddedSchema: z.ZodType<ChecklistTasksAdded> = z.lazy(() => obj({
  checklist_message: MessageSchema.optional(),
  tasks: z.array(ChecklistTaskSchema),
}));
export const DirectMessagePriceChangedSchema = obj({
  are_direct_messages_enabled: z.boolean(),
  direct_message_star_count: z.number().int().optional(),
});
export type DirectMessagePriceChanged = z.infer<typeof DirectMessagePriceChangedSchema>;
export const ForumTopicCreatedSchema = obj({
  name: z.string(),
  icon_color: z.number().int(),
  icon_custom_emoji_id: z.string().optional(),
  is_name_implicit: z.literal(true).optional(),
});
export type ForumTopicCreated = z.infer<typeof ForumTopicCreatedSchema>;
export const ForumTopicEditedSchema = obj({
  name: z.string().optional(),
  icon_custom_emoji_id: z.string().optional(),
});
export type ForumTopicEdited = z.infer<typeof ForumTopicEditedSchema>;
export const ForumTopicClosedSchema = obj({});
export type ForumTopicClosed = z.infer<typeof ForumTopicClosedSchema>;
export const ForumTopicReopenedSchema = obj({});
export type ForumTopicReopened = z.infer<typeof ForumTopicReopenedSchema>;
export const GeneralForumTopicHiddenSchema = obj({});
export type GeneralForumTopicHidden = z.infer<typeof GeneralForumTopicHiddenSchema>;
export const GeneralForumTopicUnhiddenSchema = obj({});
export type GeneralForumTopicUnhidden = z.infer<typeof GeneralForumTopicUnhiddenSchema>;
export const GiveawayCreatedSchema = obj({
  prize_star_count: z.number().int().optional(),
});
export type GiveawayCreated = z.infer<typeof GiveawayCreatedSchema>;
export interface GiveawayCompleted {
  winner_count: number;
  unclaimed_prize_count?: number;
  giveaway_message?: Message;
  is_star_giveaway?: true;
}
export const GiveawayCompletedSchema: z.ZodType<GiveawayCompleted> = z.lazy(() => obj({
  winner_count: z.number().int(),
  unclaimed_prize_count: z.number().int().optional(),
  giveaway_message: MessageSchema.optional(),
  is_star_giveaway: z.literal(true).optional(),
}));
export const ManagedBotCreatedSchema = obj({
  bot: UserSchema,
});
export type ManagedBotCreated = z.infer<typeof ManagedBotCreatedSchema>;
export const PaidMessagePriceChangedSchema = obj({
  paid_message_star_count: z.number().int(),
});
export type PaidMessagePriceChanged = z.infer<typeof PaidMessagePriceChangedSchema>;
export interface PollOptionAdded {
  poll_message?: MaybeInaccessibleMessage;
  option_persistent_id: string;
  option_text: string;
  option_text_entities?: Array<MessageEntity>;
}
export const PollOptionAddedSchema: z.ZodType<PollOptionAdded> = z.lazy(() => obj({
  poll_message: MaybeInaccessibleMessageSchema.optional(),
  option_persistent_id: z.string(),
  option_text: z.string(),
  option_text_entities: z.array(MessageEntitySchema).optional(),
}));
export interface PollOptionDeleted {
  poll_message?: MaybeInaccessibleMessage;
  option_persistent_id: string;
  option_text: string;
  option_text_entities?: Array<MessageEntity>;
}
export const PollOptionDeletedSchema: z.ZodType<PollOptionDeleted> = z.lazy(() => obj({
  poll_message: MaybeInaccessibleMessageSchema.optional(),
  option_persistent_id: z.string(),
  option_text: z.string(),
  option_text_entities: z.array(MessageEntitySchema).optional(),
}));
export interface SuggestedPostApproved {
  suggested_post_message?: Message;
  price?: SuggestedPostPrice;
  send_date: number;
}
export const SuggestedPostApprovedSchema: z.ZodType<SuggestedPostApproved> = z.lazy(() => obj({
  suggested_post_message: MessageSchema.optional(),
  price: SuggestedPostPriceSchema.optional(),
  send_date: z.number().int(),
}));
export interface SuggestedPostApprovalFailed {
  suggested_post_message?: Message;
  price: SuggestedPostPrice;
}
export const SuggestedPostApprovalFailedSchema: z.ZodType<SuggestedPostApprovalFailed> = z.lazy(() => obj({
  suggested_post_message: MessageSchema.optional(),
  price: SuggestedPostPriceSchema,
}));
export interface SuggestedPostDeclined {
  suggested_post_message?: Message;
  comment?: string;
}
export const SuggestedPostDeclinedSchema: z.ZodType<SuggestedPostDeclined> = z.lazy(() => obj({
  suggested_post_message: MessageSchema.optional(),
  comment: z.string().optional(),
}));
export const StarAmountSchema = obj({
  amount: z.number().int(),
  nanostar_amount: z.number().int().optional(),
});
export type StarAmount = z.infer<typeof StarAmountSchema>;
export interface SuggestedPostPaid {
  suggested_post_message?: Message;
  currency: "XTR" | "TON";
  amount?: number;
  star_amount?: StarAmount;
}
export const SuggestedPostPaidSchema: z.ZodType<SuggestedPostPaid> = z.lazy(() => obj({
  suggested_post_message: MessageSchema.optional(),
  currency: z.enum(["XTR", "TON"]),
  amount: z.number().int().optional(),
  star_amount: StarAmountSchema.optional(),
}));
export interface SuggestedPostRefunded {
  suggested_post_message?: Message;
  reason: "post_deleted" | "payment_refunded";
}
export const SuggestedPostRefundedSchema: z.ZodType<SuggestedPostRefunded> = z.lazy(() => obj({
  suggested_post_message: MessageSchema.optional(),
  reason: z.enum(["post_deleted", "payment_refunded"]),
}));
export const VideoChatScheduledSchema = obj({
  start_date: z.number().int(),
});
export type VideoChatScheduled = z.infer<typeof VideoChatScheduledSchema>;
export const VideoChatStartedSchema = obj({});
export type VideoChatStarted = z.infer<typeof VideoChatStartedSchema>;
export const VideoChatEndedSchema = obj({
  duration: z.number().int(),
});
export type VideoChatEnded = z.infer<typeof VideoChatEndedSchema>;
export const VideoChatParticipantsInvitedSchema = obj({
  users: z.array(UserSchema),
});
export type VideoChatParticipantsInvited = z.infer<typeof VideoChatParticipantsInvitedSchema>;
export const WebAppDataSchema = obj({
  data: z.string(),
  button_text: z.string(),
});
export type WebAppData = z.infer<typeof WebAppDataSchema>;
export const WebAppInfoSchema = obj({
  url: z.string(),
});
export type WebAppInfo = z.infer<typeof WebAppInfoSchema>;
export const LoginUrlSchema = obj({
  url: z.string(),
  forward_text: z.string().optional(),
  bot_username: z.string().optional(),
  request_write_access: z.boolean().optional(),
});
export type LoginUrl = z.infer<typeof LoginUrlSchema>;
export const SwitchInlineQueryChosenChatSchema = obj({
  query: z.string().optional(),
  allow_user_chats: z.boolean().optional(),
  allow_bot_chats: z.boolean().optional(),
  allow_group_chats: z.boolean().optional(),
  allow_channel_chats: z.boolean().optional(),
});
export type SwitchInlineQueryChosenChat = z.infer<typeof SwitchInlineQueryChosenChatSchema>;
export const CopyTextButtonSchema = obj({
  text: z.string(),
});
export type CopyTextButton = z.infer<typeof CopyTextButtonSchema>;
export type CallbackGame = Record<string, unknown>;
export const CallbackGameSchema: z.ZodType<CallbackGame> = obj({});
export const InlineKeyboardButtonSchema = obj({
  text: z.string(),
  icon_custom_emoji_id: z.string().optional(),
  style: z.enum(["danger", "success", "primary"]).optional(),
  url: z.string().optional(),
  callback_data: z.string().optional(),
  web_app: WebAppInfoSchema.optional(),
  login_url: LoginUrlSchema.optional(),
  switch_inline_query: z.string().optional(),
  switch_inline_query_current_chat: z.string().optional(),
  switch_inline_query_chosen_chat: SwitchInlineQueryChosenChatSchema.optional(),
  copy_text: CopyTextButtonSchema.optional(),
  callback_game: obj({}).optional(),
  pay: z.boolean().optional(),
});
export type InlineKeyboardButton = z.infer<typeof InlineKeyboardButtonSchema>;
export const InlineKeyboardMarkupSchema = obj({
  inline_keyboard: z.array(z.array(InlineKeyboardButtonSchema)),
});
export type InlineKeyboardMarkup = z.infer<typeof InlineKeyboardMarkupSchema>;
export interface Message {
  message_id: number;
  message_thread_id?: number;
  direct_messages_topic?: DirectMessagesTopic;
  from?: User;
  sender_chat?: Chat;
  sender_boost_count?: number;
  sender_business_bot?: User;
  sender_tag?: string;
  date: number;
  guest_query_id?: string;
  business_connection_id?: string;
  chat: Chat;
  forward_origin?: MessageOrigin;
  is_topic_message?: true;
  is_automatic_forward?: true;
  reply_to_message?: Message;
  external_reply?: ExternalReplyInfo;
  quote?: TextQuote;
  reply_to_story?: Story;
  reply_to_checklist_task_id?: number;
  reply_to_poll_option_id?: string;
  via_bot?: User;
  guest_bot_caller_user?: User;
  guest_bot_caller_chat?: Chat;
  edit_date?: number;
  has_protected_content?: true;
  is_from_offline?: true;
  is_paid_post?: true;
  media_group_id?: string;
  author_signature?: string;
  paid_star_count?: number;
  text?: string;
  entities?: Array<MessageEntity>;
  link_preview_options?: LinkPreviewOptions;
  suggested_post_info?: SuggestedPostInfo;
  effect_id?: string;
  animation?: Animation;
  audio?: Audio;
  document?: Document;
  live_photo?: LivePhoto;
  paid_media?: PaidMediaInfo;
  photo?: Array<PhotoSize>;
  sticker?: Sticker;
  story?: Story;
  video?: Video;
  video_note?: VideoNote;
  voice?: Voice;
  caption?: string;
  caption_entities?: Array<MessageEntity>;
  show_caption_above_media?: true;
  has_media_spoiler?: true;
  checklist?: Checklist;
  contact?: Contact;
  dice?: Dice;
  game?: Game;
  poll?: Poll;
  venue?: Venue;
  location?: Location;
  new_chat_members?: Array<User>;
  left_chat_member?: User;
  chat_owner_left?: ChatOwnerLeft;
  chat_owner_changed?: ChatOwnerChanged;
  new_chat_title?: string;
  new_chat_photo?: Array<PhotoSize>;
  delete_chat_photo?: true;
  group_chat_created?: true;
  supergroup_chat_created?: true;
  channel_chat_created?: true;
  message_auto_delete_timer_changed?: MessageAutoDeleteTimerChanged;
  migrate_to_chat_id?: number;
  migrate_from_chat_id?: number;
  pinned_message?: MaybeInaccessibleMessage;
  invoice?: Invoice;
  successful_payment?: SuccessfulPayment;
  refunded_payment?: RefundedPayment;
  users_shared?: UsersShared;
  chat_shared?: ChatShared;
  gift?: GiftInfo;
  unique_gift?: UniqueGiftInfo;
  gift_upgrade_sent?: GiftInfo;
  connected_website?: string;
  write_access_allowed?: WriteAccessAllowed;
  passport_data?: PassportData;
  proximity_alert_triggered?: ProximityAlertTriggered;
  boost_added?: ChatBoostAdded;
  chat_background_set?: ChatBackground;
  checklist_tasks_done?: ChecklistTasksDone;
  checklist_tasks_added?: ChecklistTasksAdded;
  direct_message_price_changed?: DirectMessagePriceChanged;
  forum_topic_created?: ForumTopicCreated;
  forum_topic_edited?: ForumTopicEdited;
  forum_topic_closed?: ForumTopicClosed;
  forum_topic_reopened?: ForumTopicReopened;
  general_forum_topic_hidden?: GeneralForumTopicHidden;
  general_forum_topic_unhidden?: GeneralForumTopicUnhidden;
  giveaway_created?: GiveawayCreated;
  giveaway?: Giveaway;
  giveaway_winners?: GiveawayWinners;
  giveaway_completed?: GiveawayCompleted;
  managed_bot_created?: ManagedBotCreated;
  paid_message_price_changed?: PaidMessagePriceChanged;
  poll_option_added?: PollOptionAdded;
  poll_option_deleted?: PollOptionDeleted;
  suggested_post_approved?: SuggestedPostApproved;
  suggested_post_approval_failed?: SuggestedPostApprovalFailed;
  suggested_post_declined?: SuggestedPostDeclined;
  suggested_post_paid?: SuggestedPostPaid;
  suggested_post_refunded?: SuggestedPostRefunded;
  video_chat_scheduled?: VideoChatScheduled;
  video_chat_started?: VideoChatStarted;
  video_chat_ended?: VideoChatEnded;
  video_chat_participants_invited?: VideoChatParticipantsInvited;
  web_app_data?: WebAppData;
  reply_markup?: InlineKeyboardMarkup;
}
export const MessageSchema: z.ZodType<Message> = z.lazy(() => obj({
  message_id: z.number().int(),
  message_thread_id: z.number().int().optional(),
  direct_messages_topic: DirectMessagesTopicSchema.optional(),
  from: UserSchema.optional(),
  sender_chat: ChatSchema.optional(),
  sender_boost_count: z.number().int().optional(),
  sender_business_bot: UserSchema.optional(),
  sender_tag: z.string().optional(),
  date: z.number().int(),
  guest_query_id: z.string().optional(),
  business_connection_id: z.string().optional(),
  chat: ChatSchema,
  forward_origin: MessageOriginSchema.optional(),
  is_topic_message: z.literal(true).optional(),
  is_automatic_forward: z.literal(true).optional(),
  reply_to_message: MessageSchema.optional(),
  external_reply: ExternalReplyInfoSchema.optional(),
  quote: TextQuoteSchema.optional(),
  reply_to_story: StorySchema.optional(),
  reply_to_checklist_task_id: z.number().int().optional(),
  reply_to_poll_option_id: z.string().optional(),
  via_bot: UserSchema.optional(),
  guest_bot_caller_user: UserSchema.optional(),
  guest_bot_caller_chat: ChatSchema.optional(),
  edit_date: z.number().int().optional(),
  has_protected_content: z.literal(true).optional(),
  is_from_offline: z.literal(true).optional(),
  is_paid_post: z.literal(true).optional(),
  media_group_id: z.string().optional(),
  author_signature: z.string().optional(),
  paid_star_count: z.number().int().optional(),
  text: z.string().optional(),
  entities: z.array(MessageEntitySchema).optional(),
  link_preview_options: LinkPreviewOptionsSchema.optional(),
  suggested_post_info: SuggestedPostInfoSchema.optional(),
  effect_id: z.string().optional(),
  animation: AnimationSchema.optional(),
  audio: AudioSchema.optional(),
  document: DocumentSchema.optional(),
  live_photo: LivePhotoSchema.optional(),
  paid_media: PaidMediaInfoSchema.optional(),
  photo: z.array(PhotoSizeSchema).optional(),
  sticker: StickerSchema.optional(),
  story: StorySchema.optional(),
  video: VideoSchema.optional(),
  video_note: VideoNoteSchema.optional(),
  voice: VoiceSchema.optional(),
  caption: z.string().optional(),
  caption_entities: z.array(MessageEntitySchema).optional(),
  show_caption_above_media: z.literal(true).optional(),
  has_media_spoiler: z.literal(true).optional(),
  checklist: ChecklistSchema.optional(),
  contact: ContactSchema.optional(),
  dice: DiceSchema.optional(),
  game: GameSchema.optional(),
  poll: PollSchema.optional(),
  venue: VenueSchema.optional(),
  location: LocationSchema.optional(),
  new_chat_members: z.array(UserSchema).optional(),
  left_chat_member: UserSchema.optional(),
  chat_owner_left: ChatOwnerLeftSchema.optional(),
  chat_owner_changed: ChatOwnerChangedSchema.optional(),
  new_chat_title: z.string().optional(),
  new_chat_photo: z.array(PhotoSizeSchema).optional(),
  delete_chat_photo: z.literal(true).optional(),
  group_chat_created: z.literal(true).optional(),
  supergroup_chat_created: z.literal(true).optional(),
  channel_chat_created: z.literal(true).optional(),
  message_auto_delete_timer_changed: MessageAutoDeleteTimerChangedSchema.optional(),
  migrate_to_chat_id: z.number().int().optional(),
  migrate_from_chat_id: z.number().int().optional(),
  pinned_message: MaybeInaccessibleMessageSchema.optional(),
  invoice: InvoiceSchema.optional(),
  successful_payment: SuccessfulPaymentSchema.optional(),
  refunded_payment: RefundedPaymentSchema.optional(),
  users_shared: UsersSharedSchema.optional(),
  chat_shared: ChatSharedSchema.optional(),
  gift: GiftInfoSchema.optional(),
  unique_gift: UniqueGiftInfoSchema.optional(),
  gift_upgrade_sent: GiftInfoSchema.optional(),
  connected_website: z.string().optional(),
  write_access_allowed: WriteAccessAllowedSchema.optional(),
  passport_data: PassportDataSchema.optional(),
  proximity_alert_triggered: ProximityAlertTriggeredSchema.optional(),
  boost_added: ChatBoostAddedSchema.optional(),
  chat_background_set: ChatBackgroundSchema.optional(),
  checklist_tasks_done: ChecklistTasksDoneSchema.optional(),
  checklist_tasks_added: ChecklistTasksAddedSchema.optional(),
  direct_message_price_changed: DirectMessagePriceChangedSchema.optional(),
  forum_topic_created: ForumTopicCreatedSchema.optional(),
  forum_topic_edited: ForumTopicEditedSchema.optional(),
  forum_topic_closed: ForumTopicClosedSchema.optional(),
  forum_topic_reopened: ForumTopicReopenedSchema.optional(),
  general_forum_topic_hidden: GeneralForumTopicHiddenSchema.optional(),
  general_forum_topic_unhidden: GeneralForumTopicUnhiddenSchema.optional(),
  giveaway_created: GiveawayCreatedSchema.optional(),
  giveaway: GiveawaySchema.optional(),
  giveaway_winners: GiveawayWinnersSchema.optional(),
  giveaway_completed: GiveawayCompletedSchema.optional(),
  managed_bot_created: ManagedBotCreatedSchema.optional(),
  paid_message_price_changed: PaidMessagePriceChangedSchema.optional(),
  poll_option_added: PollOptionAddedSchema.optional(),
  poll_option_deleted: PollOptionDeletedSchema.optional(),
  suggested_post_approved: SuggestedPostApprovedSchema.optional(),
  suggested_post_approval_failed: SuggestedPostApprovalFailedSchema.optional(),
  suggested_post_declined: SuggestedPostDeclinedSchema.optional(),
  suggested_post_paid: SuggestedPostPaidSchema.optional(),
  suggested_post_refunded: SuggestedPostRefundedSchema.optional(),
  video_chat_scheduled: VideoChatScheduledSchema.optional(),
  video_chat_started: VideoChatStartedSchema.optional(),
  video_chat_ended: VideoChatEndedSchema.optional(),
  video_chat_participants_invited: VideoChatParticipantsInvitedSchema.optional(),
  web_app_data: WebAppDataSchema.optional(),
  reply_markup: InlineKeyboardMarkupSchema.optional(),
}));
export const BusinessBotRightsSchema = obj({
  can_reply: z.literal(true).optional(),
  can_read_messages: z.literal(true).optional(),
  can_delete_sent_messages: z.literal(true).optional(),
  can_delete_all_messages: z.literal(true).optional(),
  can_edit_name: z.literal(true).optional(),
  can_edit_bio: z.literal(true).optional(),
  can_edit_profile_photo: z.literal(true).optional(),
  can_edit_username: z.literal(true).optional(),
  can_change_gift_settings: z.literal(true).optional(),
  can_view_gifts_and_stars: z.literal(true).optional(),
  can_convert_gifts_to_stars: z.literal(true).optional(),
  can_transfer_and_upgrade_gifts: z.literal(true).optional(),
  can_transfer_stars: z.literal(true).optional(),
  can_manage_stories: z.literal(true).optional(),
});
export type BusinessBotRights = z.infer<typeof BusinessBotRightsSchema>;
export const BusinessConnectionSchema = obj({
  id: z.string(),
  user: UserSchema,
  user_chat_id: z.number().int(),
  date: z.number().int(),
  rights: BusinessBotRightsSchema.optional(),
  is_enabled: z.boolean(),
});
export type BusinessConnection = z.infer<typeof BusinessConnectionSchema>;
export const BusinessMessagesDeletedSchema = obj({
  business_connection_id: z.string(),
  chat: ChatSchema,
  message_ids: z.array(z.number().int()),
});
export type BusinessMessagesDeleted = z.infer<typeof BusinessMessagesDeletedSchema>;
export const ReactionTypeEmojiSchema = obj({
  type: z.literal("emoji"),
  emoji: z.string(),
});
export type ReactionTypeEmoji = z.infer<typeof ReactionTypeEmojiSchema>;
export const ReactionTypeCustomEmojiSchema = obj({
  type: z.literal("custom_emoji"),
  custom_emoji_id: z.string(),
});
export type ReactionTypeCustomEmoji = z.infer<typeof ReactionTypeCustomEmojiSchema>;
export const ReactionTypePaidSchema = obj({
  type: z.literal("paid"),
});
export type ReactionTypePaid = z.infer<typeof ReactionTypePaidSchema>;
export type ReactionType = ReactionTypeEmoji | ReactionTypeCustomEmoji | ReactionTypePaid;
export const ReactionTypeSchema: z.ZodType<ReactionType> = z.union([
  ReactionTypeEmojiSchema,
  ReactionTypeCustomEmojiSchema,
  ReactionTypePaidSchema,
]);
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
export type ReactionCount = z.infer<typeof ReactionCountSchema>;
export const MessageReactionCountUpdatedSchema = obj({
  chat: ChatSchema,
  message_id: z.number().int(),
  date: z.number().int(),
  reactions: z.array(ReactionCountSchema),
});
export type MessageReactionCountUpdated = z.infer<typeof MessageReactionCountUpdatedSchema>;
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
export const CallbackQuerySchema = obj({
  id: z.string(),
  from: UserSchema,
  message: MaybeInaccessibleMessageSchema.optional(),
  inline_message_id: z.string().optional(),
  chat_instance: z.string(),
  data: z.string().optional(),
  game_short_name: z.string().optional(),
});
export type CallbackQuery = z.infer<typeof CallbackQuerySchema>;
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
export const PaidMediaPurchasedSchema = obj({
  from: UserSchema,
  paid_media_payload: z.string(),
});
export type PaidMediaPurchased = z.infer<typeof PaidMediaPurchasedSchema>;
export const PollAnswerSchema = obj({
  poll_id: z.string(),
  voter_chat: ChatSchema.optional(),
  user: UserSchema.optional(),
  option_ids: z.array(z.number().int()),
  option_persistent_ids: z.array(z.string()),
});
export type PollAnswer = z.infer<typeof PollAnswerSchema>;
export const ChatMemberOwnerSchema = obj({
  status: z.literal("creator"),
  user: UserSchema,
  is_anonymous: z.boolean(),
  custom_title: z.string().optional(),
});
export type ChatMemberOwner = z.infer<typeof ChatMemberOwnerSchema>;
export const ChatMemberAdministratorSchema = obj({
  status: z.literal("administrator"),
  user: UserSchema,
  can_be_edited: z.boolean(),
  is_anonymous: z.boolean(),
  can_manage_chat: z.boolean(),
  can_delete_messages: z.boolean(),
  can_manage_video_chats: z.boolean(),
  can_restrict_members: z.boolean(),
  can_promote_members: z.boolean(),
  can_change_info: z.boolean(),
  can_invite_users: z.boolean(),
  can_post_stories: z.boolean(),
  can_edit_stories: z.boolean(),
  can_delete_stories: z.boolean(),
  can_post_messages: z.boolean().optional(),
  can_edit_messages: z.boolean().optional(),
  can_pin_messages: z.boolean().optional(),
  can_manage_topics: z.boolean().optional(),
  can_manage_direct_messages: z.boolean().optional(),
  can_manage_tags: z.boolean().optional(),
  custom_title: z.string().optional(),
});
export type ChatMemberAdministrator = z.infer<typeof ChatMemberAdministratorSchema>;
export const ChatMemberMemberSchema = obj({
  status: z.literal("member"),
  tag: z.string().optional(),
  user: UserSchema,
  until_date: z.number().int().optional(),
});
export type ChatMemberMember = z.infer<typeof ChatMemberMemberSchema>;
export const ChatMemberRestrictedSchema = obj({
  status: z.literal("restricted"),
  tag: z.string().optional(),
  user: UserSchema,
  is_member: z.boolean(),
  can_send_messages: z.boolean(),
  can_send_audios: z.boolean(),
  can_send_documents: z.boolean(),
  can_send_photos: z.boolean(),
  can_send_videos: z.boolean(),
  can_send_video_notes: z.boolean(),
  can_send_voice_notes: z.boolean(),
  can_send_polls: z.boolean(),
  can_send_other_messages: z.boolean(),
  can_add_web_page_previews: z.boolean(),
  can_react_to_messages: z.boolean(),
  can_edit_tag: z.boolean(),
  can_change_info: z.boolean(),
  can_invite_users: z.boolean(),
  can_pin_messages: z.boolean(),
  can_manage_topics: z.boolean(),
  until_date: z.number().int(),
});
export type ChatMemberRestricted = z.infer<typeof ChatMemberRestrictedSchema>;
export const ChatMemberLeftSchema = obj({
  status: z.literal("left"),
  user: UserSchema,
});
export type ChatMemberLeft = z.infer<typeof ChatMemberLeftSchema>;
export const ChatMemberBannedSchema = obj({
  status: z.literal("kicked"),
  user: UserSchema,
  until_date: z.number().int(),
});
export type ChatMemberBanned = z.infer<typeof ChatMemberBannedSchema>;
export type ChatMember = ChatMemberOwner | ChatMemberAdministrator | ChatMemberMember | ChatMemberRestricted | ChatMemberLeft | ChatMemberBanned;
export const ChatMemberSchema: z.ZodType<ChatMember> = z.union([
  ChatMemberOwnerSchema,
  ChatMemberAdministratorSchema,
  ChatMemberMemberSchema,
  ChatMemberRestrictedSchema,
  ChatMemberLeftSchema,
  ChatMemberBannedSchema,
]);
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
export const ChatMemberUpdatedSchema = obj({
  chat: ChatSchema,
  from: UserSchema,
  date: z.number().int(),
  old_chat_member: ChatMemberSchema,
  new_chat_member: ChatMemberSchema,
  invite_link: ChatInviteLinkSchema.optional(),
  via_join_request: z.boolean().optional(),
  via_chat_folder_invite_link: z.boolean().optional(),
});
export type ChatMemberUpdated = z.infer<typeof ChatMemberUpdatedSchema>;
export const ChatJoinRequestSchema = obj({
  chat: ChatSchema,
  from: UserSchema,
  user_chat_id: z.number().int(),
  date: z.number().int(),
  bio: z.string().optional(),
  invite_link: ChatInviteLinkSchema.optional(),
});
export type ChatJoinRequest = z.infer<typeof ChatJoinRequestSchema>;
export const ChatBoostSourcePremiumSchema = obj({
  source: z.literal("premium"),
  user: UserSchema,
});
export type ChatBoostSourcePremium = z.infer<typeof ChatBoostSourcePremiumSchema>;
export const ChatBoostSourceGiftCodeSchema = obj({
  source: z.literal("gift_code"),
  user: UserSchema,
});
export type ChatBoostSourceGiftCode = z.infer<typeof ChatBoostSourceGiftCodeSchema>;
export const ChatBoostSourceGiveawaySchema = obj({
  source: z.literal("giveaway"),
  giveaway_message_id: z.number().int(),
  user: UserSchema.optional(),
  prize_star_count: z.number().int().optional(),
  is_unclaimed: z.literal(true).optional(),
});
export type ChatBoostSourceGiveaway = z.infer<typeof ChatBoostSourceGiveawaySchema>;
export type ChatBoostSource = ChatBoostSourcePremium | ChatBoostSourceGiftCode | ChatBoostSourceGiveaway;
export const ChatBoostSourceSchema: z.ZodType<ChatBoostSource> = z.union([
  ChatBoostSourcePremiumSchema,
  ChatBoostSourceGiftCodeSchema,
  ChatBoostSourceGiveawaySchema,
]);
export const ChatBoostSchema = obj({
  boost_id: z.string(),
  add_date: z.number().int(),
  expiration_date: z.number().int(),
  source: ChatBoostSourceSchema,
});
export type ChatBoost = z.infer<typeof ChatBoostSchema>;
export const ChatBoostUpdatedSchema = obj({
  chat: ChatSchema,
  boost: ChatBoostSchema,
});
export type ChatBoostUpdated = z.infer<typeof ChatBoostUpdatedSchema>;
export const ChatBoostRemovedSchema = obj({
  chat: ChatSchema,
  boost_id: z.string(),
  remove_date: z.number().int(),
  source: ChatBoostSourceSchema,
});
export type ChatBoostRemoved = z.infer<typeof ChatBoostRemovedSchema>;
export const ManagedBotUpdatedSchema = obj({
  user: UserSchema,
  bot: UserSchema,
});
export type ManagedBotUpdated = z.infer<typeof ManagedBotUpdatedSchema>;
export interface Update {
  update_id: number;
  message?: Message;
  edited_message?: Message;
  channel_post?: Message;
  edited_channel_post?: Message;
  business_connection?: BusinessConnection;
  business_message?: Message;
  edited_business_message?: Message;
  deleted_business_messages?: BusinessMessagesDeleted;
  guest_message?: Message;
  message_reaction?: MessageReactionUpdated;
  message_reaction_count?: MessageReactionCountUpdated;
  inline_query?: InlineQuery;
  chosen_inline_result?: ChosenInlineResult;
  callback_query?: CallbackQuery;
  shipping_query?: ShippingQuery;
  pre_checkout_query?: PreCheckoutQuery;
  purchased_paid_media?: PaidMediaPurchased;
  poll?: Poll;
  poll_answer?: PollAnswer;
  my_chat_member?: ChatMemberUpdated;
  chat_member?: ChatMemberUpdated;
  chat_join_request?: ChatJoinRequest;
  chat_boost?: ChatBoostUpdated;
  removed_chat_boost?: ChatBoostRemoved;
  managed_bot?: ManagedBotUpdated;
}
export const UpdateSchema: z.ZodType<Update> = obj({
  update_id: z.number().int(),
  message: MessageSchema.optional(),
  edited_message: MessageSchema.optional(),
  channel_post: MessageSchema.optional(),
  edited_channel_post: MessageSchema.optional(),
  business_connection: BusinessConnectionSchema.optional(),
  business_message: MessageSchema.optional(),
  edited_business_message: MessageSchema.optional(),
  deleted_business_messages: BusinessMessagesDeletedSchema.optional(),
  guest_message: MessageSchema.optional(),
  message_reaction: MessageReactionUpdatedSchema.optional(),
  message_reaction_count: MessageReactionCountUpdatedSchema.optional(),
  inline_query: InlineQuerySchema.optional(),
  chosen_inline_result: ChosenInlineResultSchema.optional(),
  callback_query: CallbackQuerySchema.optional(),
  shipping_query: ShippingQuerySchema.optional(),
  pre_checkout_query: PreCheckoutQuerySchema.optional(),
  purchased_paid_media: PaidMediaPurchasedSchema.optional(),
  poll: PollSchema.optional(),
  poll_answer: PollAnswerSchema.optional(),
  my_chat_member: ChatMemberUpdatedSchema.optional(),
  chat_member: ChatMemberUpdatedSchema.optional(),
  chat_join_request: ChatJoinRequestSchema.optional(),
  chat_boost: ChatBoostUpdatedSchema.optional(),
  removed_chat_boost: ChatBoostRemovedSchema.optional(),
  managed_bot: ManagedBotUpdatedSchema.optional(),
});
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
export const ChatPhotoSchema = obj({
  small_file_id: z.string(),
  small_file_unique_id: z.string(),
  big_file_id: z.string(),
  big_file_unique_id: z.string(),
});
export type ChatPhoto = z.infer<typeof ChatPhotoSchema>;
export const BirthdateSchema = obj({
  day: z.number().int(),
  month: z.number().int(),
  year: z.number().int().optional(),
});
export type Birthdate = z.infer<typeof BirthdateSchema>;
export const BusinessIntroSchema = obj({
  title: z.string().optional(),
  message: z.string().optional(),
  sticker: StickerSchema.optional(),
});
export type BusinessIntro = z.infer<typeof BusinessIntroSchema>;
export const BusinessLocationSchema = obj({
  address: z.string(),
  location: LocationSchema.optional(),
});
export type BusinessLocation = z.infer<typeof BusinessLocationSchema>;
export const BusinessOpeningHoursIntervalSchema = obj({
  opening_minute: z.number().int(),
  closing_minute: z.number().int(),
});
export type BusinessOpeningHoursInterval = z.infer<typeof BusinessOpeningHoursIntervalSchema>;
export const BusinessOpeningHoursSchema = obj({
  time_zone_name: z.string(),
  opening_hours: z.array(BusinessOpeningHoursIntervalSchema),
});
export type BusinessOpeningHours = z.infer<typeof BusinessOpeningHoursSchema>;
export const ChatPermissionsSchema = obj({
  can_send_messages: z.boolean().optional(),
  can_send_audios: z.boolean().optional(),
  can_send_documents: z.boolean().optional(),
  can_send_photos: z.boolean().optional(),
  can_send_videos: z.boolean().optional(),
  can_send_video_notes: z.boolean().optional(),
  can_send_voice_notes: z.boolean().optional(),
  can_send_polls: z.boolean().optional(),
  can_send_other_messages: z.boolean().optional(),
  can_add_web_page_previews: z.boolean().optional(),
  can_react_to_messages: z.boolean().optional(),
  can_edit_tag: z.boolean().optional(),
  can_change_info: z.boolean().optional(),
  can_invite_users: z.boolean().optional(),
  can_pin_messages: z.boolean().optional(),
  can_manage_topics: z.boolean().optional(),
});
export type ChatPermissions = z.infer<typeof ChatPermissionsSchema>;
export const AcceptedGiftTypesSchema = obj({
  unlimited_gifts: z.boolean(),
  limited_gifts: z.boolean(),
  unique_gifts: z.boolean(),
  premium_subscription: z.boolean(),
  gifts_from_channels: z.boolean(),
});
export type AcceptedGiftTypes = z.infer<typeof AcceptedGiftTypesSchema>;
export const ChatLocationSchema = obj({
  location: LocationSchema,
  address: z.string(),
});
export type ChatLocation = z.infer<typeof ChatLocationSchema>;
export const UserRatingSchema = obj({
  level: z.number().int(),
  rating: z.number().int(),
  current_level_rating: z.number().int(),
  next_level_rating: z.number().int().optional(),
});
export type UserRating = z.infer<typeof UserRatingSchema>;
export const ChatFullInfoSchema = obj({
  id: z.number().int(),
  type: z.enum(["private", "group", "supergroup", "channel"]),
  title: z.string().optional(),
  username: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  is_forum: z.literal(true).optional(),
  is_direct_messages: z.literal(true).optional(),
  accent_color_id: z.number().int(),
  max_reaction_count: z.number().int(),
  photo: ChatPhotoSchema.optional(),
  active_usernames: z.array(z.string()).optional(),
  birthdate: BirthdateSchema.optional(),
  business_intro: BusinessIntroSchema.optional(),
  business_location: BusinessLocationSchema.optional(),
  business_opening_hours: BusinessOpeningHoursSchema.optional(),
  personal_chat: ChatSchema.optional(),
  parent_chat: ChatSchema.optional(),
  available_reactions: z.array(ReactionTypeSchema).optional(),
  background_custom_emoji_id: z.string().optional(),
  profile_accent_color_id: z.number().int().optional(),
  profile_background_custom_emoji_id: z.string().optional(),
  emoji_status_custom_emoji_id: z.string().optional(),
  emoji_status_expiration_date: z.number().int().optional(),
  bio: z.string().optional(),
  has_private_forwards: z.literal(true).optional(),
  has_restricted_voice_and_video_messages: z.literal(true).optional(),
  join_to_send_messages: z.literal(true).optional(),
  join_by_request: z.literal(true).optional(),
  description: z.string().optional(),
  invite_link: z.string().optional(),
  pinned_message: MessageSchema.optional(),
  permissions: ChatPermissionsSchema.optional(),
  accepted_gift_types: AcceptedGiftTypesSchema,
  can_send_paid_media: z.literal(true).optional(),
  slow_mode_delay: z.number().int().optional(),
  unrestrict_boost_count: z.number().int().optional(),
  message_auto_delete_time: z.number().int().optional(),
  has_aggressive_anti_spam_enabled: z.literal(true).optional(),
  has_hidden_members: z.literal(true).optional(),
  has_protected_content: z.literal(true).optional(),
  has_visible_history: z.literal(true).optional(),
  sticker_set_name: z.string().optional(),
  can_set_sticker_set: z.literal(true).optional(),
  custom_emoji_sticker_set_name: z.string().optional(),
  linked_chat_id: z.number().int().optional(),
  location: ChatLocationSchema.optional(),
  rating: UserRatingSchema.optional(),
  first_profile_audio: AudioSchema.optional(),
  unique_gift_colors: UniqueGiftColorsSchema.optional(),
  paid_message_star_count: z.number().int().optional(),
});
export type ChatFullInfo = z.infer<typeof ChatFullInfoSchema>;
export const MessageIdSchema = obj({
  message_id: z.number().int(),
});
export type MessageId = z.infer<typeof MessageIdSchema>;
export const ReplyParametersSchema = obj({
  message_id: z.number().int(),
  chat_id: ChatIdSchema.optional(),
  allow_sending_without_reply: z.boolean().optional(),
  quote: z.string().optional(),
  quote_parse_mode: z.string().optional(),
  quote_entities: z.array(MessageEntitySchema).optional(),
  quote_position: z.number().int().optional(),
  checklist_task_id: z.number().int().optional(),
  poll_option_id: z.string().optional(),
});
export type ReplyParameters = z.infer<typeof ReplyParametersSchema>;
export const InputMediaAnimationSchema = obj({
  type: z.string(),
  media: z.string(),
  thumbnail: z.string().optional(),
  caption: z.string().optional(),
  parse_mode: ParseModeSchema.optional(),
  caption_entities: z.array(MessageEntitySchema).optional(),
  show_caption_above_media: z.boolean().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  duration: z.number().int().optional(),
  has_spoiler: z.boolean().optional(),
});
export type InputMediaAnimation = z.infer<typeof InputMediaAnimationSchema>;
export const InputMediaAudioSchema = obj({
  type: z.string(),
  media: z.string(),
  thumbnail: z.string().optional(),
  caption: z.string().optional(),
  parse_mode: ParseModeSchema.optional(),
  caption_entities: z.array(MessageEntitySchema).optional(),
  duration: z.number().int().optional(),
  performer: z.string().optional(),
  title: z.string().optional(),
});
export type InputMediaAudio = z.infer<typeof InputMediaAudioSchema>;
export const InputMediaDocumentSchema = obj({
  type: z.string(),
  media: z.string(),
  thumbnail: z.string().optional(),
  caption: z.string().optional(),
  parse_mode: ParseModeSchema.optional(),
  caption_entities: z.array(MessageEntitySchema).optional(),
  disable_content_type_detection: z.boolean().optional(),
});
export type InputMediaDocument = z.infer<typeof InputMediaDocumentSchema>;
export const InputMediaLivePhotoSchema = obj({
  type: z.string(),
  media: z.string(),
  photo: z.string(),
  caption: z.string().optional(),
  parse_mode: ParseModeSchema.optional(),
  caption_entities: z.array(MessageEntitySchema).optional(),
  show_caption_above_media: z.boolean().optional(),
  has_spoiler: z.boolean().optional(),
});
export type InputMediaLivePhoto = z.infer<typeof InputMediaLivePhotoSchema>;
export const InputMediaLocationSchema = obj({
  type: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  horizontal_accuracy: z.number().optional(),
});
export type InputMediaLocation = z.infer<typeof InputMediaLocationSchema>;
export const InputMediaPhotoSchema = obj({
  type: z.string(),
  media: z.string(),
  caption: z.string().optional(),
  parse_mode: ParseModeSchema.optional(),
  caption_entities: z.array(MessageEntitySchema).optional(),
  show_caption_above_media: z.boolean().optional(),
  has_spoiler: z.boolean().optional(),
});
export type InputMediaPhoto = z.infer<typeof InputMediaPhotoSchema>;
export const InputMediaVenueSchema = obj({
  type: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  title: z.string(),
  address: z.string(),
  foursquare_id: z.string().optional(),
  foursquare_type: z.string().optional(),
  google_place_id: z.string().optional(),
  google_place_type: z.string().optional(),
});
export type InputMediaVenue = z.infer<typeof InputMediaVenueSchema>;
export const InputMediaVideoSchema = obj({
  type: z.string(),
  media: z.string(),
  thumbnail: z.string().optional(),
  cover: z.string().optional(),
  start_timestamp: z.number().int().optional(),
  caption: z.string().optional(),
  parse_mode: ParseModeSchema.optional(),
  caption_entities: z.array(MessageEntitySchema).optional(),
  show_caption_above_media: z.boolean().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  duration: z.number().int().optional(),
  supports_streaming: z.boolean().optional(),
  has_spoiler: z.boolean().optional(),
});
export type InputMediaVideo = z.infer<typeof InputMediaVideoSchema>;
export type InputPollMedia = InputMediaAnimation | InputMediaAudio | InputMediaDocument | InputMediaLivePhoto | InputMediaLocation | InputMediaPhoto | InputMediaVenue | InputMediaVideo;
export const InputPollMediaSchema: z.ZodType<InputPollMedia> = z.union([
  InputMediaAnimationSchema,
  InputMediaAudioSchema,
  InputMediaDocumentSchema,
  InputMediaLivePhotoSchema,
  InputMediaLocationSchema,
  InputMediaPhotoSchema,
  InputMediaVenueSchema,
  InputMediaVideoSchema,
]);
export const InputMediaStickerSchema = obj({
  type: z.string(),
  media: z.string(),
  emoji: z.string().optional(),
});
export type InputMediaSticker = z.infer<typeof InputMediaStickerSchema>;
export type InputPollOptionMedia = InputMediaAnimation | InputMediaLivePhoto | InputMediaLocation | InputMediaPhoto | InputMediaSticker | InputMediaVenue | InputMediaVideo;
export const InputPollOptionMediaSchema: z.ZodType<InputPollOptionMedia> = z.union([
  InputMediaAnimationSchema,
  InputMediaLivePhotoSchema,
  InputMediaLocationSchema,
  InputMediaPhotoSchema,
  InputMediaStickerSchema,
  InputMediaVenueSchema,
  InputMediaVideoSchema,
]);
export const InputPollOptionSchema = obj({
  text: z.string(),
  text_parse_mode: z.string().optional(),
  text_entities: z.array(MessageEntitySchema).optional(),
  media: InputPollOptionMediaSchema.optional(),
});
export type InputPollOption = z.infer<typeof InputPollOptionSchema>;
export const InputChecklistTaskSchema = obj({
  id: z.number().int(),
  text: z.string(),
  parse_mode: ParseModeSchema.optional(),
  text_entities: z.array(MessageEntitySchema).optional(),
});
export type InputChecklistTask = z.infer<typeof InputChecklistTaskSchema>;
export const InputChecklistSchema = obj({
  title: z.string(),
  parse_mode: ParseModeSchema.optional(),
  title_entities: z.array(MessageEntitySchema).optional(),
  tasks: z.array(InputChecklistTaskSchema),
  others_can_add_tasks: z.boolean().optional(),
  others_can_mark_tasks_as_done: z.boolean().optional(),
});
export type InputChecklist = z.infer<typeof InputChecklistSchema>;
export const SuggestedPostParametersSchema = obj({
  price: SuggestedPostPriceSchema.optional(),
  send_date: z.number().int().optional(),
});
export type SuggestedPostParameters = z.infer<typeof SuggestedPostParametersSchema>;
export const UserProfilePhotosSchema = obj({
  total_count: z.number().int(),
  photos: z.array(z.array(PhotoSizeSchema)),
});
export type UserProfilePhotos = z.infer<typeof UserProfilePhotosSchema>;
export const UserProfileAudiosSchema = obj({
  total_count: z.number().int(),
  audios: z.array(AudioSchema),
});
export type UserProfileAudios = z.infer<typeof UserProfileAudiosSchema>;
export const KeyboardButtonRequestUsersSchema = obj({
  request_id: z.number().int(),
  user_is_bot: z.boolean().optional(),
  user_is_premium: z.boolean().optional(),
  max_quantity: z.number().int().optional(),
  request_name: z.boolean().optional(),
  request_username: z.boolean().optional(),
  request_photo: z.boolean().optional(),
});
export type KeyboardButtonRequestUsers = z.infer<typeof KeyboardButtonRequestUsersSchema>;
export const ChatAdministratorRightsSchema = obj({
  is_anonymous: z.boolean(),
  can_manage_chat: z.boolean(),
  can_delete_messages: z.boolean(),
  can_manage_video_chats: z.boolean(),
  can_restrict_members: z.boolean(),
  can_promote_members: z.boolean(),
  can_change_info: z.boolean(),
  can_invite_users: z.boolean(),
  can_post_stories: z.boolean(),
  can_edit_stories: z.boolean(),
  can_delete_stories: z.boolean(),
  can_post_messages: z.boolean().optional(),
  can_edit_messages: z.boolean().optional(),
  can_pin_messages: z.boolean().optional(),
  can_manage_topics: z.boolean().optional(),
  can_manage_direct_messages: z.boolean().optional(),
  can_manage_tags: z.boolean().optional(),
});
export type ChatAdministratorRights = z.infer<typeof ChatAdministratorRightsSchema>;
export const KeyboardButtonRequestChatSchema = obj({
  request_id: z.number().int(),
  chat_is_channel: z.boolean(),
  chat_is_forum: z.boolean().optional(),
  chat_has_username: z.boolean().optional(),
  chat_is_created: z.boolean().optional(),
  user_administrator_rights: ChatAdministratorRightsSchema.optional(),
  bot_administrator_rights: ChatAdministratorRightsSchema.optional(),
  bot_is_member: z.boolean().optional(),
  request_title: z.boolean().optional(),
  request_username: z.boolean().optional(),
  request_photo: z.boolean().optional(),
});
export type KeyboardButtonRequestChat = z.infer<typeof KeyboardButtonRequestChatSchema>;
export const KeyboardButtonRequestManagedBotSchema = obj({
  request_id: z.number().int(),
  suggested_name: z.string().optional(),
  suggested_username: z.string().optional(),
});
export type KeyboardButtonRequestManagedBot = z.infer<typeof KeyboardButtonRequestManagedBotSchema>;
export const KeyboardButtonPollTypeSchema = obj({
  type: z.string().optional(),
});
export type KeyboardButtonPollType = z.infer<typeof KeyboardButtonPollTypeSchema>;
export const KeyboardButtonSchema = obj({
  text: z.string(),
  icon_custom_emoji_id: z.string().optional(),
  style: z.enum(["danger", "success", "primary"]).optional(),
  request_users: KeyboardButtonRequestUsersSchema.optional(),
  request_chat: KeyboardButtonRequestChatSchema.optional(),
  request_managed_bot: KeyboardButtonRequestManagedBotSchema.optional(),
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
export const StoryAreaPositionSchema = obj({
  x_percentage: z.number(),
  y_percentage: z.number(),
  width_percentage: z.number(),
  height_percentage: z.number(),
  rotation_angle: z.number(),
  corner_radius_percentage: z.number(),
});
export type StoryAreaPosition = z.infer<typeof StoryAreaPositionSchema>;
export const LocationAddressSchema = obj({
  country_code: z.string(),
  state: z.string().optional(),
  city: z.string().optional(),
  street: z.string().optional(),
});
export type LocationAddress = z.infer<typeof LocationAddressSchema>;
export const StoryAreaTypeLocationSchema = obj({
  type: z.literal("location"),
  latitude: z.number(),
  longitude: z.number(),
  address: LocationAddressSchema.optional(),
});
export type StoryAreaTypeLocation = z.infer<typeof StoryAreaTypeLocationSchema>;
export const StoryAreaTypeSuggestedReactionSchema = obj({
  type: z.literal("suggested_reaction"),
  reaction_type: ReactionTypeSchema,
  is_dark: z.boolean().optional(),
  is_flipped: z.boolean().optional(),
});
export type StoryAreaTypeSuggestedReaction = z.infer<typeof StoryAreaTypeSuggestedReactionSchema>;
export const StoryAreaTypeLinkSchema = obj({
  type: z.literal("link"),
  url: z.string(),
});
export type StoryAreaTypeLink = z.infer<typeof StoryAreaTypeLinkSchema>;
export const StoryAreaTypeWeatherSchema = obj({
  type: z.literal("weather"),
  temperature: z.number(),
  emoji: z.string(),
  background_color: z.number().int(),
});
export type StoryAreaTypeWeather = z.infer<typeof StoryAreaTypeWeatherSchema>;
export const StoryAreaTypeUniqueGiftSchema = obj({
  type: z.literal("unique_gift"),
  name: z.string(),
});
export type StoryAreaTypeUniqueGift = z.infer<typeof StoryAreaTypeUniqueGiftSchema>;
export type StoryAreaType = StoryAreaTypeLocation | StoryAreaTypeSuggestedReaction | StoryAreaTypeLink | StoryAreaTypeWeather | StoryAreaTypeUniqueGift;
export const StoryAreaTypeSchema: z.ZodType<StoryAreaType> = z.union([
  StoryAreaTypeLocationSchema,
  StoryAreaTypeSuggestedReactionSchema,
  StoryAreaTypeLinkSchema,
  StoryAreaTypeWeatherSchema,
  StoryAreaTypeUniqueGiftSchema,
]);
export const StoryAreaSchema = obj({
  position: StoryAreaPositionSchema,
  type: StoryAreaTypeSchema,
});
export type StoryArea = z.infer<typeof StoryAreaSchema>;
export const ForumTopicSchema = obj({
  message_thread_id: z.number().int(),
  name: z.string(),
  icon_color: z.number().int(),
  icon_custom_emoji_id: z.string().optional(),
  is_name_implicit: z.literal(true).optional(),
});
export type ForumTopic = z.infer<typeof ForumTopicSchema>;
export const GiftsSchema = obj({
  gifts: z.array(GiftSchema),
});
export type Gifts = z.infer<typeof GiftsSchema>;
export const OwnedGiftRegularSchema = obj({
  type: z.literal("regular"),
  gift: GiftSchema,
  owned_gift_id: z.string().optional(),
  sender_user: UserSchema.optional(),
  send_date: z.number().int(),
  text: z.string().optional(),
  entities: z.array(MessageEntitySchema).optional(),
  is_private: z.literal(true).optional(),
  is_saved: z.literal(true).optional(),
  can_be_upgraded: z.literal(true).optional(),
  was_refunded: z.literal(true).optional(),
  convert_star_count: z.number().int().optional(),
  prepaid_upgrade_star_count: z.number().int().optional(),
  is_upgrade_separate: z.literal(true).optional(),
  unique_gift_number: z.number().int().optional(),
});
export type OwnedGiftRegular = z.infer<typeof OwnedGiftRegularSchema>;
export const OwnedGiftUniqueSchema = obj({
  type: z.literal("unique"),
  gift: UniqueGiftSchema,
  owned_gift_id: z.string().optional(),
  sender_user: UserSchema.optional(),
  send_date: z.number().int(),
  is_saved: z.literal(true).optional(),
  can_be_transferred: z.literal(true).optional(),
  transfer_star_count: z.number().int().optional(),
  next_transfer_date: z.number().int().optional(),
});
export type OwnedGiftUnique = z.infer<typeof OwnedGiftUniqueSchema>;
export type OwnedGift = OwnedGiftRegular | OwnedGiftUnique;
export const OwnedGiftSchema: z.ZodType<OwnedGift> = z.union([
  OwnedGiftRegularSchema,
  OwnedGiftUniqueSchema,
]);
export const OwnedGiftsSchema = obj({
  total_count: z.number().int(),
  gifts: z.array(OwnedGiftSchema),
  next_offset: z.string().optional(),
});
export type OwnedGifts = z.infer<typeof OwnedGiftsSchema>;
export const BotAccessSettingsSchema = obj({
  is_access_restricted: z.boolean(),
  added_users: z.array(UserSchema).optional(),
});
export type BotAccessSettings = z.infer<typeof BotAccessSettingsSchema>;
export const BotCommandSchema = obj({
  command: z.string(),
  description: z.string(),
});
export type BotCommand = z.infer<typeof BotCommandSchema>;
export const BotCommandScopeDefaultSchema = obj({
  type: z.string(),
});
export type BotCommandScopeDefault = z.infer<typeof BotCommandScopeDefaultSchema>;
export const BotCommandScopeAllPrivateChatsSchema = obj({
  type: z.string(),
});
export type BotCommandScopeAllPrivateChats = z.infer<typeof BotCommandScopeAllPrivateChatsSchema>;
export const BotCommandScopeAllGroupChatsSchema = obj({
  type: z.string(),
});
export type BotCommandScopeAllGroupChats = z.infer<typeof BotCommandScopeAllGroupChatsSchema>;
export const BotCommandScopeAllChatAdministratorsSchema = obj({
  type: z.string(),
});
export type BotCommandScopeAllChatAdministrators = z.infer<typeof BotCommandScopeAllChatAdministratorsSchema>;
export const BotCommandScopeChatSchema = obj({
  type: z.string(),
  chat_id: ChatIdSchema,
});
export type BotCommandScopeChat = z.infer<typeof BotCommandScopeChatSchema>;
export const BotCommandScopeChatAdministratorsSchema = obj({
  type: z.string(),
  chat_id: ChatIdSchema,
});
export type BotCommandScopeChatAdministrators = z.infer<typeof BotCommandScopeChatAdministratorsSchema>;
export const BotCommandScopeChatMemberSchema = obj({
  type: z.string(),
  chat_id: ChatIdSchema,
  user_id: z.number().int(),
});
export type BotCommandScopeChatMember = z.infer<typeof BotCommandScopeChatMemberSchema>;
export type BotCommandScope = BotCommandScopeDefault | BotCommandScopeAllPrivateChats | BotCommandScopeAllGroupChats | BotCommandScopeAllChatAdministrators | BotCommandScopeChat | BotCommandScopeChatAdministrators | BotCommandScopeChatMember;
export const BotCommandScopeSchema: z.ZodType<BotCommandScope> = z.union([
  BotCommandScopeDefaultSchema,
  BotCommandScopeAllPrivateChatsSchema,
  BotCommandScopeAllGroupChatsSchema,
  BotCommandScopeAllChatAdministratorsSchema,
  BotCommandScopeChatSchema,
  BotCommandScopeChatAdministratorsSchema,
  BotCommandScopeChatMemberSchema,
]);
export const BotNameSchema = obj({
  name: z.string(),
});
export type BotName = z.infer<typeof BotNameSchema>;
export const BotDescriptionSchema = obj({
  description: z.string(),
});
export type BotDescription = z.infer<typeof BotDescriptionSchema>;
export const BotShortDescriptionSchema = obj({
  short_description: z.string(),
});
export type BotShortDescription = z.infer<typeof BotShortDescriptionSchema>;
export const MenuButtonCommandsSchema = obj({
  type: z.string(),
});
export type MenuButtonCommands = z.infer<typeof MenuButtonCommandsSchema>;
export const MenuButtonWebAppSchema = obj({
  type: z.string(),
  text: z.string(),
  web_app: WebAppInfoSchema,
});
export type MenuButtonWebApp = z.infer<typeof MenuButtonWebAppSchema>;
export const MenuButtonDefaultSchema = obj({
  type: z.string(),
});
export type MenuButtonDefault = z.infer<typeof MenuButtonDefaultSchema>;
export type MenuButton = MenuButtonCommands | MenuButtonWebApp | MenuButtonDefault;
export const MenuButtonSchema: z.ZodType<MenuButton> = z.union([
  MenuButtonCommandsSchema,
  MenuButtonWebAppSchema,
  MenuButtonDefaultSchema,
]);
export const UserChatBoostsSchema = obj({
  boosts: z.array(ChatBoostSchema),
});
export type UserChatBoosts = z.infer<typeof UserChatBoostsSchema>;
export const SentWebAppMessageSchema = obj({
  inline_message_id: z.string().optional(),
});
export type SentWebAppMessage = z.infer<typeof SentWebAppMessageSchema>;
export const SentGuestMessageSchema = obj({
  inline_message_id: z.string(),
});
export type SentGuestMessage = z.infer<typeof SentGuestMessageSchema>;
export const PreparedInlineMessageSchema = obj({
  id: z.string(),
  expiration_date: z.number().int(),
});
export type PreparedInlineMessage = z.infer<typeof PreparedInlineMessageSchema>;
export const PreparedKeyboardButtonSchema = obj({
  id: z.string(),
});
export type PreparedKeyboardButton = z.infer<typeof PreparedKeyboardButtonSchema>;
export const ResponseParametersSchema = obj({
  migrate_to_chat_id: z.number().int().optional(),
  retry_after: z.number().int().optional(),
});
export type ResponseParameters = z.infer<typeof ResponseParametersSchema>;
export type InputMedia = InputMediaAnimation | InputMediaAudio | InputMediaDocument | InputMediaLivePhoto | InputMediaPhoto | InputMediaVideo;
export const InputMediaSchema: z.ZodType<InputMedia> = z.union([
  InputMediaAnimationSchema,
  InputMediaAudioSchema,
  InputMediaDocumentSchema,
  InputMediaLivePhotoSchema,
  InputMediaPhotoSchema,
  InputMediaVideoSchema,
]);
export type InputFile = unknown;
export const InputFileSchema: z.ZodType<InputFile> = z.custom<unknown>(() => true);
export const InputPaidMediaLivePhotoSchema = obj({
  type: z.string(),
  media: z.string(),
  photo: z.string(),
});
export type InputPaidMediaLivePhoto = z.infer<typeof InputPaidMediaLivePhotoSchema>;
export const InputPaidMediaPhotoSchema = obj({
  type: z.string(),
  media: z.string(),
});
export type InputPaidMediaPhoto = z.infer<typeof InputPaidMediaPhotoSchema>;
export const InputPaidMediaVideoSchema = obj({
  type: z.string(),
  media: z.string(),
  thumbnail: z.string().optional(),
  cover: z.string().optional(),
  start_timestamp: z.number().int().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  duration: z.number().int().optional(),
  supports_streaming: z.boolean().optional(),
});
export type InputPaidMediaVideo = z.infer<typeof InputPaidMediaVideoSchema>;
export type InputPaidMedia = InputPaidMediaLivePhoto | InputPaidMediaPhoto | InputPaidMediaVideo;
export const InputPaidMediaSchema: z.ZodType<InputPaidMedia> = z.union([
  InputPaidMediaLivePhotoSchema,
  InputPaidMediaPhotoSchema,
  InputPaidMediaVideoSchema,
]);
export const InputProfilePhotoStaticSchema = obj({
  type: z.string(),
  photo: z.string(),
});
export type InputProfilePhotoStatic = z.infer<typeof InputProfilePhotoStaticSchema>;
export const InputProfilePhotoAnimatedSchema = obj({
  type: z.string(),
  animation: z.string(),
  main_frame_timestamp: z.number().optional(),
});
export type InputProfilePhotoAnimated = z.infer<typeof InputProfilePhotoAnimatedSchema>;
export type InputProfilePhoto = InputProfilePhotoStatic | InputProfilePhotoAnimated;
export const InputProfilePhotoSchema: z.ZodType<InputProfilePhoto> = z.union([
  InputProfilePhotoStaticSchema,
  InputProfilePhotoAnimatedSchema,
]);
export const InputStoryContentPhotoSchema = obj({
  type: z.string(),
  photo: z.string(),
});
export type InputStoryContentPhoto = z.infer<typeof InputStoryContentPhotoSchema>;
export const InputStoryContentVideoSchema = obj({
  type: z.string(),
  video: z.string(),
  duration: z.number().optional(),
  cover_frame_timestamp: z.number().optional(),
  is_animation: z.boolean().optional(),
});
export type InputStoryContentVideo = z.infer<typeof InputStoryContentVideoSchema>;
export type InputStoryContent = InputStoryContentPhoto | InputStoryContentVideo;
export const InputStoryContentSchema: z.ZodType<InputStoryContent> = z.union([
  InputStoryContentPhotoSchema,
  InputStoryContentVideoSchema,
]);
export const StickerSetSchema = obj({
  name: z.string(),
  title: z.string(),
  sticker_type: z.enum(["regular", "mask", "custom_emoji"]),
  stickers: z.array(StickerSchema),
  thumbnail: PhotoSizeSchema.optional(),
});
export type StickerSet = z.infer<typeof StickerSetSchema>;
export const InputStickerSchema = obj({
  sticker: z.string(),
  format: z.enum(["static", "animated", "video"]),
  emoji_list: z.array(z.string()),
  mask_position: MaskPositionSchema.optional(),
  keywords: z.array(z.string()).optional(),
});
export type InputSticker = z.infer<typeof InputStickerSchema>;
export const InlineQueryResultsButtonSchema = obj({
  text: z.string(),
  web_app: WebAppInfoSchema.optional(),
  start_parameter: z.string().optional(),
});
export type InlineQueryResultsButton = z.infer<typeof InlineQueryResultsButtonSchema>;
export const InputTextMessageContentSchema = obj({
  message_text: z.string(),
  parse_mode: ParseModeSchema.optional(),
  entities: z.array(MessageEntitySchema).optional(),
  link_preview_options: LinkPreviewOptionsSchema.optional(),
});
export type InputTextMessageContent = z.infer<typeof InputTextMessageContentSchema>;
export const InputLocationMessageContentSchema = obj({
  latitude: z.number(),
  longitude: z.number(),
  horizontal_accuracy: z.number().optional(),
  live_period: z.number().int().optional(),
  heading: z.number().int().optional(),
  proximity_alert_radius: z.number().int().optional(),
});
export type InputLocationMessageContent = z.infer<typeof InputLocationMessageContentSchema>;
export const InputVenueMessageContentSchema = obj({
  latitude: z.number(),
  longitude: z.number(),
  title: z.string(),
  address: z.string(),
  foursquare_id: z.string().optional(),
  foursquare_type: z.string().optional(),
  google_place_id: z.string().optional(),
  google_place_type: z.string().optional(),
});
export type InputVenueMessageContent = z.infer<typeof InputVenueMessageContentSchema>;
export const InputContactMessageContentSchema = obj({
  phone_number: z.string(),
  first_name: z.string(),
  last_name: z.string().optional(),
  vcard: z.string().optional(),
});
export type InputContactMessageContent = z.infer<typeof InputContactMessageContentSchema>;
export const LabeledPriceSchema = obj({
  label: z.string(),
  amount: z.number().int(),
});
export type LabeledPrice = z.infer<typeof LabeledPriceSchema>;
export const InputInvoiceMessageContentSchema = obj({
  title: z.string(),
  description: z.string(),
  payload: z.string(),
  provider_token: z.string().optional(),
  currency: z.string(),
  prices: z.array(LabeledPriceSchema),
  max_tip_amount: z.number().int().optional(),
  suggested_tip_amounts: z.array(z.number().int()).optional(),
  provider_data: z.string().optional(),
  photo_url: z.string().optional(),
  photo_size: z.number().int().optional(),
  photo_width: z.number().int().optional(),
  photo_height: z.number().int().optional(),
  need_name: z.boolean().optional(),
  need_phone_number: z.boolean().optional(),
  need_email: z.boolean().optional(),
  need_shipping_address: z.boolean().optional(),
  send_phone_number_to_provider: z.boolean().optional(),
  send_email_to_provider: z.boolean().optional(),
  is_flexible: z.boolean().optional(),
});
export type InputInvoiceMessageContent = z.infer<typeof InputInvoiceMessageContentSchema>;
export type InputMessageContent = InputTextMessageContent | InputLocationMessageContent | InputVenueMessageContent | InputContactMessageContent | InputInvoiceMessageContent;
export const InputMessageContentSchema: z.ZodType<InputMessageContent> = z.union([
  InputTextMessageContentSchema,
  InputLocationMessageContentSchema,
  InputVenueMessageContentSchema,
  InputContactMessageContentSchema,
  InputInvoiceMessageContentSchema,
]);
export const InlineQueryResultCachedAudioSchema = obj({
  type: z.string(),
  id: z.string(),
  audio_file_id: z.string(),
  caption: z.string().optional(),
  parse_mode: ParseModeSchema.optional(),
  caption_entities: z.array(MessageEntitySchema).optional(),
  reply_markup: InlineKeyboardMarkupSchema.optional(),
  input_message_content: InputMessageContentSchema.optional(),
});
export type InlineQueryResultCachedAudio = z.infer<typeof InlineQueryResultCachedAudioSchema>;
export const InlineQueryResultCachedDocumentSchema = obj({
  type: z.string(),
  id: z.string(),
  title: z.string(),
  document_file_id: z.string(),
  description: z.string().optional(),
  caption: z.string().optional(),
  parse_mode: ParseModeSchema.optional(),
  caption_entities: z.array(MessageEntitySchema).optional(),
  reply_markup: InlineKeyboardMarkupSchema.optional(),
  input_message_content: InputMessageContentSchema.optional(),
});
export type InlineQueryResultCachedDocument = z.infer<typeof InlineQueryResultCachedDocumentSchema>;
export const InlineQueryResultCachedGifSchema = obj({
  type: z.string(),
  id: z.string(),
  gif_file_id: z.string(),
  title: z.string().optional(),
  caption: z.string().optional(),
  parse_mode: ParseModeSchema.optional(),
  caption_entities: z.array(MessageEntitySchema).optional(),
  show_caption_above_media: z.boolean().optional(),
  reply_markup: InlineKeyboardMarkupSchema.optional(),
  input_message_content: InputMessageContentSchema.optional(),
});
export type InlineQueryResultCachedGif = z.infer<typeof InlineQueryResultCachedGifSchema>;
export const InlineQueryResultCachedMpeg4GifSchema = obj({
  type: z.string(),
  id: z.string(),
  mpeg4_file_id: z.string(),
  title: z.string().optional(),
  caption: z.string().optional(),
  parse_mode: ParseModeSchema.optional(),
  caption_entities: z.array(MessageEntitySchema).optional(),
  show_caption_above_media: z.boolean().optional(),
  reply_markup: InlineKeyboardMarkupSchema.optional(),
  input_message_content: InputMessageContentSchema.optional(),
});
export type InlineQueryResultCachedMpeg4Gif = z.infer<typeof InlineQueryResultCachedMpeg4GifSchema>;
export const InlineQueryResultCachedPhotoSchema = obj({
  type: z.string(),
  id: z.string(),
  photo_file_id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  caption: z.string().optional(),
  parse_mode: ParseModeSchema.optional(),
  caption_entities: z.array(MessageEntitySchema).optional(),
  show_caption_above_media: z.boolean().optional(),
  reply_markup: InlineKeyboardMarkupSchema.optional(),
  input_message_content: InputMessageContentSchema.optional(),
});
export type InlineQueryResultCachedPhoto = z.infer<typeof InlineQueryResultCachedPhotoSchema>;
export const InlineQueryResultCachedStickerSchema = obj({
  type: z.string(),
  id: z.string(),
  sticker_file_id: z.string(),
  reply_markup: InlineKeyboardMarkupSchema.optional(),
  input_message_content: InputMessageContentSchema.optional(),
});
export type InlineQueryResultCachedSticker = z.infer<typeof InlineQueryResultCachedStickerSchema>;
export const InlineQueryResultCachedVideoSchema = obj({
  type: z.string(),
  id: z.string(),
  video_file_id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  caption: z.string().optional(),
  parse_mode: ParseModeSchema.optional(),
  caption_entities: z.array(MessageEntitySchema).optional(),
  show_caption_above_media: z.boolean().optional(),
  reply_markup: InlineKeyboardMarkupSchema.optional(),
  input_message_content: InputMessageContentSchema.optional(),
});
export type InlineQueryResultCachedVideo = z.infer<typeof InlineQueryResultCachedVideoSchema>;
export const InlineQueryResultCachedVoiceSchema = obj({
  type: z.string(),
  id: z.string(),
  voice_file_id: z.string(),
  title: z.string(),
  caption: z.string().optional(),
  parse_mode: ParseModeSchema.optional(),
  caption_entities: z.array(MessageEntitySchema).optional(),
  reply_markup: InlineKeyboardMarkupSchema.optional(),
  input_message_content: InputMessageContentSchema.optional(),
});
export type InlineQueryResultCachedVoice = z.infer<typeof InlineQueryResultCachedVoiceSchema>;
export const InlineQueryResultArticleSchema = obj({
  type: z.string(),
  id: z.string(),
  title: z.string(),
  input_message_content: InputMessageContentSchema,
  reply_markup: InlineKeyboardMarkupSchema.optional(),
  url: z.string().optional(),
  description: z.string().optional(),
  thumbnail_url: z.string().optional(),
  thumbnail_width: z.number().int().optional(),
  thumbnail_height: z.number().int().optional(),
});
export type InlineQueryResultArticle = z.infer<typeof InlineQueryResultArticleSchema>;
export const InlineQueryResultAudioSchema = obj({
  type: z.string(),
  id: z.string(),
  audio_url: z.string(),
  title: z.string(),
  caption: z.string().optional(),
  parse_mode: ParseModeSchema.optional(),
  caption_entities: z.array(MessageEntitySchema).optional(),
  performer: z.string().optional(),
  audio_duration: z.number().int().optional(),
  reply_markup: InlineKeyboardMarkupSchema.optional(),
  input_message_content: InputMessageContentSchema.optional(),
});
export type InlineQueryResultAudio = z.infer<typeof InlineQueryResultAudioSchema>;
export const InlineQueryResultContactSchema = obj({
  type: z.string(),
  id: z.string(),
  phone_number: z.string(),
  first_name: z.string(),
  last_name: z.string().optional(),
  vcard: z.string().optional(),
  reply_markup: InlineKeyboardMarkupSchema.optional(),
  input_message_content: InputMessageContentSchema.optional(),
  thumbnail_url: z.string().optional(),
  thumbnail_width: z.number().int().optional(),
  thumbnail_height: z.number().int().optional(),
});
export type InlineQueryResultContact = z.infer<typeof InlineQueryResultContactSchema>;
export const InlineQueryResultGameSchema = obj({
  type: z.string(),
  id: z.string(),
  game_short_name: z.string(),
  reply_markup: InlineKeyboardMarkupSchema.optional(),
});
export type InlineQueryResultGame = z.infer<typeof InlineQueryResultGameSchema>;
export const InlineQueryResultDocumentSchema = obj({
  type: z.string(),
  id: z.string(),
  title: z.string(),
  caption: z.string().optional(),
  parse_mode: ParseModeSchema.optional(),
  caption_entities: z.array(MessageEntitySchema).optional(),
  document_url: z.string(),
  mime_type: z.string(),
  description: z.string().optional(),
  reply_markup: InlineKeyboardMarkupSchema.optional(),
  input_message_content: InputMessageContentSchema.optional(),
  thumbnail_url: z.string().optional(),
  thumbnail_width: z.number().int().optional(),
  thumbnail_height: z.number().int().optional(),
});
export type InlineQueryResultDocument = z.infer<typeof InlineQueryResultDocumentSchema>;
export const InlineQueryResultGifSchema = obj({
  type: z.string(),
  id: z.string(),
  gif_url: z.string(),
  gif_width: z.number().int().optional(),
  gif_height: z.number().int().optional(),
  gif_duration: z.number().int().optional(),
  thumbnail_url: z.string(),
  thumbnail_mime_type: z.string().optional(),
  title: z.string().optional(),
  caption: z.string().optional(),
  parse_mode: ParseModeSchema.optional(),
  caption_entities: z.array(MessageEntitySchema).optional(),
  show_caption_above_media: z.boolean().optional(),
  reply_markup: InlineKeyboardMarkupSchema.optional(),
  input_message_content: InputMessageContentSchema.optional(),
});
export type InlineQueryResultGif = z.infer<typeof InlineQueryResultGifSchema>;
export const InlineQueryResultLocationSchema = obj({
  type: z.string(),
  id: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  title: z.string(),
  horizontal_accuracy: z.number().optional(),
  live_period: z.number().int().optional(),
  heading: z.number().int().optional(),
  proximity_alert_radius: z.number().int().optional(),
  reply_markup: InlineKeyboardMarkupSchema.optional(),
  input_message_content: InputMessageContentSchema.optional(),
  thumbnail_url: z.string().optional(),
  thumbnail_width: z.number().int().optional(),
  thumbnail_height: z.number().int().optional(),
});
export type InlineQueryResultLocation = z.infer<typeof InlineQueryResultLocationSchema>;
export const InlineQueryResultMpeg4GifSchema = obj({
  type: z.string(),
  id: z.string(),
  mpeg4_url: z.string(),
  mpeg4_width: z.number().int().optional(),
  mpeg4_height: z.number().int().optional(),
  mpeg4_duration: z.number().int().optional(),
  thumbnail_url: z.string(),
  thumbnail_mime_type: z.string().optional(),
  title: z.string().optional(),
  caption: z.string().optional(),
  parse_mode: ParseModeSchema.optional(),
  caption_entities: z.array(MessageEntitySchema).optional(),
  show_caption_above_media: z.boolean().optional(),
  reply_markup: InlineKeyboardMarkupSchema.optional(),
  input_message_content: InputMessageContentSchema.optional(),
});
export type InlineQueryResultMpeg4Gif = z.infer<typeof InlineQueryResultMpeg4GifSchema>;
export const InlineQueryResultPhotoSchema = obj({
  type: z.string(),
  id: z.string(),
  photo_url: z.string(),
  thumbnail_url: z.string(),
  photo_width: z.number().int().optional(),
  photo_height: z.number().int().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  caption: z.string().optional(),
  parse_mode: ParseModeSchema.optional(),
  caption_entities: z.array(MessageEntitySchema).optional(),
  show_caption_above_media: z.boolean().optional(),
  reply_markup: InlineKeyboardMarkupSchema.optional(),
  input_message_content: InputMessageContentSchema.optional(),
});
export type InlineQueryResultPhoto = z.infer<typeof InlineQueryResultPhotoSchema>;
export const InlineQueryResultVenueSchema = obj({
  type: z.string(),
  id: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  title: z.string(),
  address: z.string(),
  foursquare_id: z.string().optional(),
  foursquare_type: z.string().optional(),
  google_place_id: z.string().optional(),
  google_place_type: z.string().optional(),
  reply_markup: InlineKeyboardMarkupSchema.optional(),
  input_message_content: InputMessageContentSchema.optional(),
  thumbnail_url: z.string().optional(),
  thumbnail_width: z.number().int().optional(),
  thumbnail_height: z.number().int().optional(),
});
export type InlineQueryResultVenue = z.infer<typeof InlineQueryResultVenueSchema>;
export const InlineQueryResultVideoSchema = obj({
  type: z.string(),
  id: z.string(),
  video_url: z.string(),
  mime_type: z.string(),
  thumbnail_url: z.string(),
  title: z.string(),
  caption: z.string().optional(),
  parse_mode: ParseModeSchema.optional(),
  caption_entities: z.array(MessageEntitySchema).optional(),
  show_caption_above_media: z.boolean().optional(),
  video_width: z.number().int().optional(),
  video_height: z.number().int().optional(),
  video_duration: z.number().int().optional(),
  description: z.string().optional(),
  reply_markup: InlineKeyboardMarkupSchema.optional(),
  input_message_content: InputMessageContentSchema.optional(),
});
export type InlineQueryResultVideo = z.infer<typeof InlineQueryResultVideoSchema>;
export const InlineQueryResultVoiceSchema = obj({
  type: z.string(),
  id: z.string(),
  voice_url: z.string(),
  title: z.string(),
  caption: z.string().optional(),
  parse_mode: ParseModeSchema.optional(),
  caption_entities: z.array(MessageEntitySchema).optional(),
  voice_duration: z.number().int().optional(),
  reply_markup: InlineKeyboardMarkupSchema.optional(),
  input_message_content: InputMessageContentSchema.optional(),
});
export type InlineQueryResultVoice = z.infer<typeof InlineQueryResultVoiceSchema>;
export type InlineQueryResult = InlineQueryResultCachedAudio | InlineQueryResultCachedDocument | InlineQueryResultCachedGif | InlineQueryResultCachedMpeg4Gif | InlineQueryResultCachedPhoto | InlineQueryResultCachedSticker | InlineQueryResultCachedVideo | InlineQueryResultCachedVoice | InlineQueryResultArticle | InlineQueryResultAudio | InlineQueryResultContact | InlineQueryResultGame | InlineQueryResultDocument | InlineQueryResultGif | InlineQueryResultLocation | InlineQueryResultMpeg4Gif | InlineQueryResultPhoto | InlineQueryResultVenue | InlineQueryResultVideo | InlineQueryResultVoice;
export const InlineQueryResultSchema: z.ZodType<InlineQueryResult> = z.union([
  InlineQueryResultCachedAudioSchema,
  InlineQueryResultCachedDocumentSchema,
  InlineQueryResultCachedGifSchema,
  InlineQueryResultCachedMpeg4GifSchema,
  InlineQueryResultCachedPhotoSchema,
  InlineQueryResultCachedStickerSchema,
  InlineQueryResultCachedVideoSchema,
  InlineQueryResultCachedVoiceSchema,
  InlineQueryResultArticleSchema,
  InlineQueryResultAudioSchema,
  InlineQueryResultContactSchema,
  InlineQueryResultGameSchema,
  InlineQueryResultDocumentSchema,
  InlineQueryResultGifSchema,
  InlineQueryResultLocationSchema,
  InlineQueryResultMpeg4GifSchema,
  InlineQueryResultPhotoSchema,
  InlineQueryResultVenueSchema,
  InlineQueryResultVideoSchema,
  InlineQueryResultVoiceSchema,
]);
export const ShippingOptionSchema = obj({
  id: z.string(),
  title: z.string(),
  prices: z.array(LabeledPriceSchema),
});
export type ShippingOption = z.infer<typeof ShippingOptionSchema>;
export const RevenueWithdrawalStatePendingSchema = obj({
  type: z.literal("pending"),
});
export type RevenueWithdrawalStatePending = z.infer<typeof RevenueWithdrawalStatePendingSchema>;
export const RevenueWithdrawalStateSucceededSchema = obj({
  type: z.literal("succeeded"),
  date: z.number().int(),
  url: z.string(),
});
export type RevenueWithdrawalStateSucceeded = z.infer<typeof RevenueWithdrawalStateSucceededSchema>;
export const RevenueWithdrawalStateFailedSchema = obj({
  type: z.literal("failed"),
});
export type RevenueWithdrawalStateFailed = z.infer<typeof RevenueWithdrawalStateFailedSchema>;
export type RevenueWithdrawalState = RevenueWithdrawalStatePending | RevenueWithdrawalStateSucceeded | RevenueWithdrawalStateFailed;
export const RevenueWithdrawalStateSchema: z.ZodType<RevenueWithdrawalState> = z.union([
  RevenueWithdrawalStatePendingSchema,
  RevenueWithdrawalStateSucceededSchema,
  RevenueWithdrawalStateFailedSchema,
]);
export const AffiliateInfoSchema = obj({
  affiliate_user: UserSchema.optional(),
  affiliate_chat: ChatSchema.optional(),
  commission_per_mille: z.number().int(),
  amount: z.number().int(),
  nanostar_amount: z.number().int().optional(),
});
export type AffiliateInfo = z.infer<typeof AffiliateInfoSchema>;
export const TransactionPartnerUserSchema = obj({
  type: z.literal("user"),
  transaction_type: z.enum(["invoice_payment", "paid_media_payment", "gift_purchase", "premium_purchase", "business_account_transfer"]),
  user: UserSchema,
  affiliate: AffiliateInfoSchema.optional(),
  invoice_payload: z.string().optional(),
  subscription_period: z.number().int().optional(),
  paid_media: z.array(PaidMediaSchema).optional(),
  paid_media_payload: z.string().optional(),
  gift: GiftSchema.optional(),
  premium_subscription_duration: z.number().int().optional(),
});
export type TransactionPartnerUser = z.infer<typeof TransactionPartnerUserSchema>;
export const TransactionPartnerChatSchema = obj({
  type: z.literal("chat"),
  chat: ChatSchema,
  gift: GiftSchema.optional(),
});
export type TransactionPartnerChat = z.infer<typeof TransactionPartnerChatSchema>;
export const TransactionPartnerAffiliateProgramSchema = obj({
  type: z.literal("affiliate_program"),
  sponsor_user: UserSchema.optional(),
  commission_per_mille: z.number().int(),
});
export type TransactionPartnerAffiliateProgram = z.infer<typeof TransactionPartnerAffiliateProgramSchema>;
export const TransactionPartnerFragmentSchema = obj({
  type: z.literal("fragment"),
  withdrawal_state: RevenueWithdrawalStateSchema.optional(),
});
export type TransactionPartnerFragment = z.infer<typeof TransactionPartnerFragmentSchema>;
export const TransactionPartnerTelegramAdsSchema = obj({
  type: z.literal("telegram_ads"),
});
export type TransactionPartnerTelegramAds = z.infer<typeof TransactionPartnerTelegramAdsSchema>;
export const TransactionPartnerTelegramApiSchema = obj({
  type: z.literal("telegram_api"),
  request_count: z.number().int(),
});
export type TransactionPartnerTelegramApi = z.infer<typeof TransactionPartnerTelegramApiSchema>;
export const TransactionPartnerOtherSchema = obj({
  type: z.literal("other"),
});
export type TransactionPartnerOther = z.infer<typeof TransactionPartnerOtherSchema>;
export type TransactionPartner = TransactionPartnerUser | TransactionPartnerChat | TransactionPartnerAffiliateProgram | TransactionPartnerFragment | TransactionPartnerTelegramAds | TransactionPartnerTelegramApi | TransactionPartnerOther;
export const TransactionPartnerSchema: z.ZodType<TransactionPartner> = z.union([
  TransactionPartnerUserSchema,
  TransactionPartnerChatSchema,
  TransactionPartnerAffiliateProgramSchema,
  TransactionPartnerFragmentSchema,
  TransactionPartnerTelegramAdsSchema,
  TransactionPartnerTelegramApiSchema,
  TransactionPartnerOtherSchema,
]);
export const StarTransactionSchema = obj({
  id: z.string(),
  amount: z.number().int(),
  nanostar_amount: z.number().int().optional(),
  date: z.number().int(),
  source: TransactionPartnerSchema.optional(),
  receiver: TransactionPartnerSchema.optional(),
});
export type StarTransaction = z.infer<typeof StarTransactionSchema>;
export const StarTransactionsSchema = obj({
  transactions: z.array(StarTransactionSchema),
});
export type StarTransactions = z.infer<typeof StarTransactionsSchema>;
export const PassportElementErrorDataFieldSchema = obj({
  source: z.string(),
  type: z.string(),
  field_name: z.string(),
  data_hash: z.string(),
  message: z.string(),
});
export type PassportElementErrorDataField = z.infer<typeof PassportElementErrorDataFieldSchema>;
export const PassportElementErrorFrontSideSchema = obj({
  source: z.string(),
  type: z.string(),
  file_hash: z.string(),
  message: z.string(),
});
export type PassportElementErrorFrontSide = z.infer<typeof PassportElementErrorFrontSideSchema>;
export const PassportElementErrorReverseSideSchema = obj({
  source: z.string(),
  type: z.string(),
  file_hash: z.string(),
  message: z.string(),
});
export type PassportElementErrorReverseSide = z.infer<typeof PassportElementErrorReverseSideSchema>;
export const PassportElementErrorSelfieSchema = obj({
  source: z.string(),
  type: z.string(),
  file_hash: z.string(),
  message: z.string(),
});
export type PassportElementErrorSelfie = z.infer<typeof PassportElementErrorSelfieSchema>;
export const PassportElementErrorFileSchema = obj({
  source: z.string(),
  type: z.string(),
  file_hash: z.string(),
  message: z.string(),
});
export type PassportElementErrorFile = z.infer<typeof PassportElementErrorFileSchema>;
export const PassportElementErrorFilesSchema = obj({
  source: z.string(),
  type: z.string(),
  file_hashes: z.array(z.string()),
  message: z.string(),
});
export type PassportElementErrorFiles = z.infer<typeof PassportElementErrorFilesSchema>;
export const PassportElementErrorTranslationFileSchema = obj({
  source: z.string(),
  type: z.string(),
  file_hash: z.string(),
  message: z.string(),
});
export type PassportElementErrorTranslationFile = z.infer<typeof PassportElementErrorTranslationFileSchema>;
export const PassportElementErrorTranslationFilesSchema = obj({
  source: z.string(),
  type: z.string(),
  file_hashes: z.array(z.string()),
  message: z.string(),
});
export type PassportElementErrorTranslationFiles = z.infer<typeof PassportElementErrorTranslationFilesSchema>;
export const PassportElementErrorUnspecifiedSchema = obj({
  source: z.string(),
  type: z.string(),
  element_hash: z.string(),
  message: z.string(),
});
export type PassportElementErrorUnspecified = z.infer<typeof PassportElementErrorUnspecifiedSchema>;
export type PassportElementError = PassportElementErrorDataField | PassportElementErrorFrontSide | PassportElementErrorReverseSide | PassportElementErrorSelfie | PassportElementErrorFile | PassportElementErrorFiles | PassportElementErrorTranslationFile | PassportElementErrorTranslationFiles | PassportElementErrorUnspecified;
export const PassportElementErrorSchema: z.ZodType<PassportElementError> = z.union([
  PassportElementErrorDataFieldSchema,
  PassportElementErrorFrontSideSchema,
  PassportElementErrorReverseSideSchema,
  PassportElementErrorSelfieSchema,
  PassportElementErrorFileSchema,
  PassportElementErrorFilesSchema,
  PassportElementErrorTranslationFileSchema,
  PassportElementErrorTranslationFilesSchema,
  PassportElementErrorUnspecifiedSchema,
]);
export const GameHighScoreSchema = obj({
  position: z.number().int(),
  user: UserSchema,
  score: z.number().int(),
});
export type GameHighScore = z.infer<typeof GameHighScoreSchema>;

// ---------------------------------------------------------------------------
// Methods (request params + response result)
// ---------------------------------------------------------------------------

export const GetUpdatesParamsSchema = obj({
  offset: z.number().int().optional(),
  limit: z.number().int().optional(),
  timeout: z.number().int().optional(),
  allowed_updates: z.array(z.string()).optional(),
});
export type GetUpdatesParams = z.infer<typeof GetUpdatesParamsSchema>;
export const GetUpdatesResultSchema = z.array(UpdateSchema);
export type GetUpdatesResult = z.infer<typeof GetUpdatesResultSchema>;
export const SetWebhookParamsSchema = obj({
  url: z.string(),
  certificate: z.custom<unknown>(() => true).optional(),
  ip_address: z.string().optional(),
  max_connections: z.number().int().optional(),
  allowed_updates: z.array(z.string()).optional(),
  drop_pending_updates: z.boolean().optional(),
  secret_token: z.string().optional(),
});
export type SetWebhookParams = z.infer<typeof SetWebhookParamsSchema>;
export const SetWebhookResultSchema = z.literal(true);
export type SetWebhookResult = z.infer<typeof SetWebhookResultSchema>;
export const DeleteWebhookParamsSchema = obj({
  drop_pending_updates: z.boolean().optional(),
});
export type DeleteWebhookParams = z.infer<typeof DeleteWebhookParamsSchema>;
export const DeleteWebhookResultSchema = z.literal(true);
export type DeleteWebhookResult = z.infer<typeof DeleteWebhookResultSchema>;
export const GetWebhookInfoParamsSchema = obj({});
export type GetWebhookInfoParams = z.infer<typeof GetWebhookInfoParamsSchema>;
export const GetWebhookInfoResultSchema = z.unknown();
export type GetWebhookInfoResult = z.infer<typeof GetWebhookInfoResultSchema>;
export const GetMeParamsSchema = obj({});
export type GetMeParams = z.infer<typeof GetMeParamsSchema>;
export const GetMeResultSchema = z.unknown();
export type GetMeResult = z.infer<typeof GetMeResultSchema>;
export const LogOutParamsSchema = obj({});
export type LogOutParams = z.infer<typeof LogOutParamsSchema>;
export const LogOutResultSchema = z.literal(true);
export type LogOutResult = z.infer<typeof LogOutResultSchema>;
export const CloseParamsSchema = obj({});
export type CloseParams = z.infer<typeof CloseParamsSchema>;
export const CloseResultSchema = z.literal(true);
export type CloseResult = z.infer<typeof CloseResultSchema>;
export const SendMessageParamsSchema = obj({
  business_connection_id: z.string().optional(),
  chat_id: ChatIdSchema,
  message_thread_id: z.number().int().optional(),
  direct_messages_topic_id: z.number().int().optional(),
  text: z.string(),
  parse_mode: ParseModeSchema.optional(),
  entities: z.array(MessageEntitySchema).optional(),
  link_preview_options: LinkPreviewOptionsSchema.optional(),
  disable_notification: z.boolean().optional(),
  protect_content: z.boolean().optional(),
  allow_paid_broadcast: z.boolean().optional(),
  message_effect_id: z.string().optional(),
  suggested_post_parameters: SuggestedPostParametersSchema.optional(),
  reply_parameters: ReplyParametersSchema.optional(),
  reply_markup: z.union([InlineKeyboardMarkupSchema, ReplyKeyboardMarkupSchema, ReplyKeyboardRemoveSchema, ForceReplySchema]).optional(),
});
export type SendMessageParams = z.infer<typeof SendMessageParamsSchema>;
export const SendMessageResultSchema = MessageSchema;
export type SendMessageResult = z.infer<typeof SendMessageResultSchema>;
export const ForwardMessageParamsSchema = obj({
  chat_id: ChatIdSchema,
  message_thread_id: z.number().int().optional(),
  direct_messages_topic_id: z.number().int().optional(),
  from_chat_id: ChatIdSchema,
  video_start_timestamp: z.number().int().optional(),
  disable_notification: z.boolean().optional(),
  protect_content: z.boolean().optional(),
  message_effect_id: z.string().optional(),
  suggested_post_parameters: SuggestedPostParametersSchema.optional(),
  message_id: z.number().int(),
});
export type ForwardMessageParams = z.infer<typeof ForwardMessageParamsSchema>;
export const ForwardMessageResultSchema = MessageSchema;
export type ForwardMessageResult = z.infer<typeof ForwardMessageResultSchema>;
export const ForwardMessagesParamsSchema = obj({
  chat_id: ChatIdSchema,
  message_thread_id: z.number().int().optional(),
  direct_messages_topic_id: z.number().int().optional(),
  from_chat_id: ChatIdSchema,
  message_ids: z.array(z.number().int()),
  disable_notification: z.boolean().optional(),
  protect_content: z.boolean().optional(),
});
export type ForwardMessagesParams = z.infer<typeof ForwardMessagesParamsSchema>;
export const ForwardMessagesResultSchema = z.unknown();
export type ForwardMessagesResult = z.infer<typeof ForwardMessagesResultSchema>;
export const CopyMessageParamsSchema = obj({
  chat_id: ChatIdSchema,
  message_thread_id: z.number().int().optional(),
  direct_messages_topic_id: z.number().int().optional(),
  from_chat_id: ChatIdSchema,
  message_id: z.number().int(),
  video_start_timestamp: z.number().int().optional(),
  caption: z.string().optional(),
  parse_mode: ParseModeSchema.optional(),
  caption_entities: z.array(MessageEntitySchema).optional(),
  show_caption_above_media: z.boolean().optional(),
  disable_notification: z.boolean().optional(),
  protect_content: z.boolean().optional(),
  allow_paid_broadcast: z.boolean().optional(),
  message_effect_id: z.string().optional(),
  suggested_post_parameters: SuggestedPostParametersSchema.optional(),
  reply_parameters: ReplyParametersSchema.optional(),
  reply_markup: z.union([InlineKeyboardMarkupSchema, ReplyKeyboardMarkupSchema, ReplyKeyboardRemoveSchema, ForceReplySchema]).optional(),
});
export type CopyMessageParams = z.infer<typeof CopyMessageParamsSchema>;
export const CopyMessageResultSchema = z.unknown();
export type CopyMessageResult = z.infer<typeof CopyMessageResultSchema>;
export const CopyMessagesParamsSchema = obj({
  chat_id: ChatIdSchema,
  message_thread_id: z.number().int().optional(),
  direct_messages_topic_id: z.number().int().optional(),
  from_chat_id: ChatIdSchema,
  message_ids: z.array(z.number().int()),
  disable_notification: z.boolean().optional(),
  protect_content: z.boolean().optional(),
  remove_caption: z.boolean().optional(),
});
export type CopyMessagesParams = z.infer<typeof CopyMessagesParamsSchema>;
export const CopyMessagesResultSchema = z.unknown();
export type CopyMessagesResult = z.infer<typeof CopyMessagesResultSchema>;
export const SendPhotoParamsSchema = obj({
  business_connection_id: z.string().optional(),
  chat_id: ChatIdSchema,
  message_thread_id: z.number().int().optional(),
  direct_messages_topic_id: z.number().int().optional(),
  photo: z.union([z.custom<unknown>(() => true), z.string()]),
  caption: z.string().optional(),
  parse_mode: ParseModeSchema.optional(),
  caption_entities: z.array(MessageEntitySchema).optional(),
  show_caption_above_media: z.boolean().optional(),
  has_spoiler: z.boolean().optional(),
  disable_notification: z.boolean().optional(),
  protect_content: z.boolean().optional(),
  allow_paid_broadcast: z.boolean().optional(),
  message_effect_id: z.string().optional(),
  suggested_post_parameters: SuggestedPostParametersSchema.optional(),
  reply_parameters: ReplyParametersSchema.optional(),
  reply_markup: z.union([InlineKeyboardMarkupSchema, ReplyKeyboardMarkupSchema, ReplyKeyboardRemoveSchema, ForceReplySchema]).optional(),
});
export type SendPhotoParams = z.infer<typeof SendPhotoParamsSchema>;
export const SendPhotoResultSchema = MessageSchema;
export type SendPhotoResult = z.infer<typeof SendPhotoResultSchema>;
export const SendLivePhotoParamsSchema = obj({
  business_connection_id: z.string().optional(),
  chat_id: ChatIdSchema,
  message_thread_id: z.number().int().optional(),
  direct_messages_topic_id: z.number().int().optional(),
  live_photo: z.union([z.custom<unknown>(() => true), z.string()]),
  photo: z.union([z.custom<unknown>(() => true), z.string()]),
  caption: z.string().optional(),
  parse_mode: ParseModeSchema.optional(),
  caption_entities: z.array(MessageEntitySchema).optional(),
  show_caption_above_media: z.boolean().optional(),
  has_spoiler: z.boolean().optional(),
  disable_notification: z.boolean().optional(),
  protect_content: z.boolean().optional(),
  allow_paid_broadcast: z.boolean().optional(),
  message_effect_id: z.string().optional(),
  suggested_post_parameters: SuggestedPostParametersSchema.optional(),
  reply_parameters: ReplyParametersSchema.optional(),
  reply_markup: z.union([InlineKeyboardMarkupSchema, ReplyKeyboardMarkupSchema, ReplyKeyboardRemoveSchema, ForceReplySchema]).optional(),
});
export type SendLivePhotoParams = z.infer<typeof SendLivePhotoParamsSchema>;
export const SendLivePhotoResultSchema = MessageSchema;
export type SendLivePhotoResult = z.infer<typeof SendLivePhotoResultSchema>;
export const SendAudioParamsSchema = obj({
  business_connection_id: z.string().optional(),
  chat_id: ChatIdSchema,
  message_thread_id: z.number().int().optional(),
  direct_messages_topic_id: z.number().int().optional(),
  audio: z.union([z.custom<unknown>(() => true), z.string()]),
  caption: z.string().optional(),
  parse_mode: ParseModeSchema.optional(),
  caption_entities: z.array(MessageEntitySchema).optional(),
  duration: z.number().int().optional(),
  performer: z.string().optional(),
  title: z.string().optional(),
  thumbnail: z.union([z.custom<unknown>(() => true), z.string()]).optional(),
  disable_notification: z.boolean().optional(),
  protect_content: z.boolean().optional(),
  allow_paid_broadcast: z.boolean().optional(),
  message_effect_id: z.string().optional(),
  suggested_post_parameters: SuggestedPostParametersSchema.optional(),
  reply_parameters: ReplyParametersSchema.optional(),
  reply_markup: z.union([InlineKeyboardMarkupSchema, ReplyKeyboardMarkupSchema, ReplyKeyboardRemoveSchema, ForceReplySchema]).optional(),
});
export type SendAudioParams = z.infer<typeof SendAudioParamsSchema>;
export const SendAudioResultSchema = MessageSchema;
export type SendAudioResult = z.infer<typeof SendAudioResultSchema>;
export const SendDocumentParamsSchema = obj({
  business_connection_id: z.string().optional(),
  chat_id: ChatIdSchema,
  message_thread_id: z.number().int().optional(),
  direct_messages_topic_id: z.number().int().optional(),
  document: z.union([z.custom<unknown>(() => true), z.string()]),
  thumbnail: z.union([z.custom<unknown>(() => true), z.string()]).optional(),
  caption: z.string().optional(),
  parse_mode: ParseModeSchema.optional(),
  caption_entities: z.array(MessageEntitySchema).optional(),
  disable_content_type_detection: z.boolean().optional(),
  disable_notification: z.boolean().optional(),
  protect_content: z.boolean().optional(),
  allow_paid_broadcast: z.boolean().optional(),
  message_effect_id: z.string().optional(),
  suggested_post_parameters: SuggestedPostParametersSchema.optional(),
  reply_parameters: ReplyParametersSchema.optional(),
  reply_markup: z.union([InlineKeyboardMarkupSchema, ReplyKeyboardMarkupSchema, ReplyKeyboardRemoveSchema, ForceReplySchema]).optional(),
});
export type SendDocumentParams = z.infer<typeof SendDocumentParamsSchema>;
export const SendDocumentResultSchema = MessageSchema;
export type SendDocumentResult = z.infer<typeof SendDocumentResultSchema>;
export const SendVideoParamsSchema = obj({
  business_connection_id: z.string().optional(),
  chat_id: ChatIdSchema,
  message_thread_id: z.number().int().optional(),
  direct_messages_topic_id: z.number().int().optional(),
  video: z.union([z.custom<unknown>(() => true), z.string()]),
  duration: z.number().int().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  thumbnail: z.union([z.custom<unknown>(() => true), z.string()]).optional(),
  cover: z.union([z.custom<unknown>(() => true), z.string()]).optional(),
  start_timestamp: z.number().int().optional(),
  caption: z.string().optional(),
  parse_mode: ParseModeSchema.optional(),
  caption_entities: z.array(MessageEntitySchema).optional(),
  show_caption_above_media: z.boolean().optional(),
  has_spoiler: z.boolean().optional(),
  supports_streaming: z.boolean().optional(),
  disable_notification: z.boolean().optional(),
  protect_content: z.boolean().optional(),
  allow_paid_broadcast: z.boolean().optional(),
  message_effect_id: z.string().optional(),
  suggested_post_parameters: SuggestedPostParametersSchema.optional(),
  reply_parameters: ReplyParametersSchema.optional(),
  reply_markup: z.union([InlineKeyboardMarkupSchema, ReplyKeyboardMarkupSchema, ReplyKeyboardRemoveSchema, ForceReplySchema]).optional(),
});
export type SendVideoParams = z.infer<typeof SendVideoParamsSchema>;
export const SendVideoResultSchema = MessageSchema;
export type SendVideoResult = z.infer<typeof SendVideoResultSchema>;
export const SendAnimationParamsSchema = obj({
  business_connection_id: z.string().optional(),
  chat_id: ChatIdSchema,
  message_thread_id: z.number().int().optional(),
  direct_messages_topic_id: z.number().int().optional(),
  animation: z.union([z.custom<unknown>(() => true), z.string()]),
  duration: z.number().int().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  thumbnail: z.union([z.custom<unknown>(() => true), z.string()]).optional(),
  caption: z.string().optional(),
  parse_mode: ParseModeSchema.optional(),
  caption_entities: z.array(MessageEntitySchema).optional(),
  show_caption_above_media: z.boolean().optional(),
  has_spoiler: z.boolean().optional(),
  disable_notification: z.boolean().optional(),
  protect_content: z.boolean().optional(),
  allow_paid_broadcast: z.boolean().optional(),
  message_effect_id: z.string().optional(),
  suggested_post_parameters: SuggestedPostParametersSchema.optional(),
  reply_parameters: ReplyParametersSchema.optional(),
  reply_markup: z.union([InlineKeyboardMarkupSchema, ReplyKeyboardMarkupSchema, ReplyKeyboardRemoveSchema, ForceReplySchema]).optional(),
});
export type SendAnimationParams = z.infer<typeof SendAnimationParamsSchema>;
export const SendAnimationResultSchema = MessageSchema;
export type SendAnimationResult = z.infer<typeof SendAnimationResultSchema>;
export const SendVoiceParamsSchema = obj({
  business_connection_id: z.string().optional(),
  chat_id: ChatIdSchema,
  message_thread_id: z.number().int().optional(),
  direct_messages_topic_id: z.number().int().optional(),
  voice: z.union([z.custom<unknown>(() => true), z.string()]),
  caption: z.string().optional(),
  parse_mode: ParseModeSchema.optional(),
  caption_entities: z.array(MessageEntitySchema).optional(),
  duration: z.number().int().optional(),
  disable_notification: z.boolean().optional(),
  protect_content: z.boolean().optional(),
  allow_paid_broadcast: z.boolean().optional(),
  message_effect_id: z.string().optional(),
  suggested_post_parameters: SuggestedPostParametersSchema.optional(),
  reply_parameters: ReplyParametersSchema.optional(),
  reply_markup: z.union([InlineKeyboardMarkupSchema, ReplyKeyboardMarkupSchema, ReplyKeyboardRemoveSchema, ForceReplySchema]).optional(),
});
export type SendVoiceParams = z.infer<typeof SendVoiceParamsSchema>;
export const SendVoiceResultSchema = MessageSchema;
export type SendVoiceResult = z.infer<typeof SendVoiceResultSchema>;
export const SendVideoNoteParamsSchema = obj({
  business_connection_id: z.string().optional(),
  chat_id: ChatIdSchema,
  message_thread_id: z.number().int().optional(),
  direct_messages_topic_id: z.number().int().optional(),
  video_note: z.union([z.custom<unknown>(() => true), z.string()]),
  duration: z.number().int().optional(),
  length: z.number().int().optional(),
  thumbnail: z.union([z.custom<unknown>(() => true), z.string()]).optional(),
  disable_notification: z.boolean().optional(),
  protect_content: z.boolean().optional(),
  allow_paid_broadcast: z.boolean().optional(),
  message_effect_id: z.string().optional(),
  suggested_post_parameters: SuggestedPostParametersSchema.optional(),
  reply_parameters: ReplyParametersSchema.optional(),
  reply_markup: z.union([InlineKeyboardMarkupSchema, ReplyKeyboardMarkupSchema, ReplyKeyboardRemoveSchema, ForceReplySchema]).optional(),
});
export type SendVideoNoteParams = z.infer<typeof SendVideoNoteParamsSchema>;
export const SendVideoNoteResultSchema = MessageSchema;
export type SendVideoNoteResult = z.infer<typeof SendVideoNoteResultSchema>;
export const SendPaidMediaParamsSchema = obj({
  business_connection_id: z.string().optional(),
  chat_id: ChatIdSchema,
  message_thread_id: z.number().int().optional(),
  direct_messages_topic_id: z.number().int().optional(),
  star_count: z.number().int(),
  media: z.array(InputPaidMediaSchema),
  payload: z.string().optional(),
  caption: z.string().optional(),
  parse_mode: ParseModeSchema.optional(),
  caption_entities: z.array(MessageEntitySchema).optional(),
  show_caption_above_media: z.boolean().optional(),
  disable_notification: z.boolean().optional(),
  protect_content: z.boolean().optional(),
  allow_paid_broadcast: z.boolean().optional(),
  suggested_post_parameters: SuggestedPostParametersSchema.optional(),
  reply_parameters: ReplyParametersSchema.optional(),
  reply_markup: z.union([InlineKeyboardMarkupSchema, ReplyKeyboardMarkupSchema, ReplyKeyboardRemoveSchema, ForceReplySchema]).optional(),
});
export type SendPaidMediaParams = z.infer<typeof SendPaidMediaParamsSchema>;
export const SendPaidMediaResultSchema = MessageSchema;
export type SendPaidMediaResult = z.infer<typeof SendPaidMediaResultSchema>;
export const SendMediaGroupParamsSchema = obj({
  business_connection_id: z.string().optional(),
  chat_id: ChatIdSchema,
  message_thread_id: z.number().int().optional(),
  direct_messages_topic_id: z.number().int().optional(),
  media: z.array(z.union([InputMediaAudioSchema, InputMediaDocumentSchema, InputMediaLivePhotoSchema, InputMediaPhotoSchema, InputMediaVideoSchema])),
  disable_notification: z.boolean().optional(),
  protect_content: z.boolean().optional(),
  allow_paid_broadcast: z.boolean().optional(),
  message_effect_id: z.string().optional(),
  reply_parameters: ReplyParametersSchema.optional(),
});
export type SendMediaGroupParams = z.infer<typeof SendMediaGroupParamsSchema>;
export const SendMediaGroupResultSchema = MessageSchema;
export type SendMediaGroupResult = z.infer<typeof SendMediaGroupResultSchema>;
export const SendLocationParamsSchema = obj({
  business_connection_id: z.string().optional(),
  chat_id: ChatIdSchema,
  message_thread_id: z.number().int().optional(),
  direct_messages_topic_id: z.number().int().optional(),
  latitude: z.number(),
  longitude: z.number(),
  horizontal_accuracy: z.number().optional(),
  live_period: z.number().int().optional(),
  heading: z.number().int().optional(),
  proximity_alert_radius: z.number().int().optional(),
  disable_notification: z.boolean().optional(),
  protect_content: z.boolean().optional(),
  allow_paid_broadcast: z.boolean().optional(),
  message_effect_id: z.string().optional(),
  suggested_post_parameters: SuggestedPostParametersSchema.optional(),
  reply_parameters: ReplyParametersSchema.optional(),
  reply_markup: z.union([InlineKeyboardMarkupSchema, ReplyKeyboardMarkupSchema, ReplyKeyboardRemoveSchema, ForceReplySchema]).optional(),
});
export type SendLocationParams = z.infer<typeof SendLocationParamsSchema>;
export const SendLocationResultSchema = MessageSchema;
export type SendLocationResult = z.infer<typeof SendLocationResultSchema>;
export const SendVenueParamsSchema = obj({
  business_connection_id: z.string().optional(),
  chat_id: ChatIdSchema,
  message_thread_id: z.number().int().optional(),
  direct_messages_topic_id: z.number().int().optional(),
  latitude: z.number(),
  longitude: z.number(),
  title: z.string(),
  address: z.string(),
  foursquare_id: z.string().optional(),
  foursquare_type: z.string().optional(),
  google_place_id: z.string().optional(),
  google_place_type: z.string().optional(),
  disable_notification: z.boolean().optional(),
  protect_content: z.boolean().optional(),
  allow_paid_broadcast: z.boolean().optional(),
  message_effect_id: z.string().optional(),
  suggested_post_parameters: SuggestedPostParametersSchema.optional(),
  reply_parameters: ReplyParametersSchema.optional(),
  reply_markup: z.union([InlineKeyboardMarkupSchema, ReplyKeyboardMarkupSchema, ReplyKeyboardRemoveSchema, ForceReplySchema]).optional(),
});
export type SendVenueParams = z.infer<typeof SendVenueParamsSchema>;
export const SendVenueResultSchema = MessageSchema;
export type SendVenueResult = z.infer<typeof SendVenueResultSchema>;
export const SendContactParamsSchema = obj({
  business_connection_id: z.string().optional(),
  chat_id: ChatIdSchema,
  message_thread_id: z.number().int().optional(),
  direct_messages_topic_id: z.number().int().optional(),
  phone_number: z.string(),
  first_name: z.string(),
  last_name: z.string().optional(),
  vcard: z.string().optional(),
  disable_notification: z.boolean().optional(),
  protect_content: z.boolean().optional(),
  allow_paid_broadcast: z.boolean().optional(),
  message_effect_id: z.string().optional(),
  suggested_post_parameters: SuggestedPostParametersSchema.optional(),
  reply_parameters: ReplyParametersSchema.optional(),
  reply_markup: z.union([InlineKeyboardMarkupSchema, ReplyKeyboardMarkupSchema, ReplyKeyboardRemoveSchema, ForceReplySchema]).optional(),
});
export type SendContactParams = z.infer<typeof SendContactParamsSchema>;
export const SendContactResultSchema = MessageSchema;
export type SendContactResult = z.infer<typeof SendContactResultSchema>;
export interface SendPollParams {
  business_connection_id?: string;
  chat_id: ChatId;
  message_thread_id?: number;
  question: string;
  question_parse_mode?: string;
  question_entities?: Array<MessageEntity>;
  options: Array<InputPollOption>;
  is_anonymous?: boolean;
  type?: string;
  allows_multiple_answers?: boolean;
  allows_revoting?: boolean;
  shuffle_options?: boolean;
  allow_adding_options?: boolean;
  hide_results_until_closes?: boolean;
  members_only?: boolean;
  country_codes?: Array<string>;
  correct_option_ids?: Array<number>;
  explanation?: string;
  explanation_parse_mode?: string;
  explanation_entities?: Array<MessageEntity>;
  explanation_media?: InputPollMedia;
  open_period?: number;
  close_date?: number;
  is_closed?: boolean;
  description?: string;
  description_parse_mode?: string;
  description_entities?: Array<MessageEntity>;
  media?: InputPollMedia;
  disable_notification?: boolean;
  protect_content?: boolean;
  allow_paid_broadcast?: boolean;
  message_effect_id?: string;
  reply_parameters?: ReplyParameters;
  reply_markup?: InlineKeyboardMarkup | ReplyKeyboardMarkup | ReplyKeyboardRemove | ForceReply;
}
export const SendPollParamsSchema: z.ZodType<SendPollParams> = obj({
  business_connection_id: z.string().optional(),
  chat_id: ChatIdSchema,
  message_thread_id: z.number().int().optional(),
  question: z.string(),
  question_parse_mode: z.string().optional(),
  question_entities: z.array(MessageEntitySchema).optional(),
  options: z.array(InputPollOptionSchema),
  is_anonymous: z.boolean().optional(),
  type: z.string().optional(),
  allows_multiple_answers: z.boolean().optional(),
  allows_revoting: z.boolean().optional(),
  shuffle_options: z.boolean().optional(),
  allow_adding_options: z.boolean().optional(),
  hide_results_until_closes: z.boolean().optional(),
  members_only: z.boolean().optional(),
  country_codes: z.array(z.string()).optional(),
  correct_option_ids: z.array(z.number().int()).optional(),
  explanation: z.string().optional(),
  explanation_parse_mode: z.string().optional(),
  explanation_entities: z.array(MessageEntitySchema).optional(),
  explanation_media: InputPollMediaSchema.optional(),
  open_period: z.number().int().optional(),
  close_date: z.number().int().optional(),
  is_closed: z.boolean().optional(),
  description: z.string().optional(),
  description_parse_mode: z.string().optional(),
  description_entities: z.array(MessageEntitySchema).optional(),
  media: InputPollMediaSchema.optional(),
  disable_notification: z.boolean().optional(),
  protect_content: z.boolean().optional(),
  allow_paid_broadcast: z.boolean().optional(),
  message_effect_id: z.string().optional(),
  reply_parameters: ReplyParametersSchema.optional(),
  reply_markup: z.union([InlineKeyboardMarkupSchema, ReplyKeyboardMarkupSchema, ReplyKeyboardRemoveSchema, ForceReplySchema]).optional(),
});
export const SendPollResultSchema = MessageSchema;
export type SendPollResult = z.infer<typeof SendPollResultSchema>;
export const SendChecklistParamsSchema = obj({
  business_connection_id: z.string(),
  chat_id: ChatIdSchema,
  checklist: InputChecklistSchema,
  disable_notification: z.boolean().optional(),
  protect_content: z.boolean().optional(),
  message_effect_id: z.string().optional(),
  reply_parameters: ReplyParametersSchema.optional(),
  reply_markup: InlineKeyboardMarkupSchema.optional(),
});
export type SendChecklistParams = z.infer<typeof SendChecklistParamsSchema>;
export const SendChecklistResultSchema = MessageSchema;
export type SendChecklistResult = z.infer<typeof SendChecklistResultSchema>;
export const SendDiceParamsSchema = obj({
  business_connection_id: z.string().optional(),
  chat_id: ChatIdSchema,
  message_thread_id: z.number().int().optional(),
  direct_messages_topic_id: z.number().int().optional(),
  emoji: z.string().optional(),
  disable_notification: z.boolean().optional(),
  protect_content: z.boolean().optional(),
  allow_paid_broadcast: z.boolean().optional(),
  message_effect_id: z.string().optional(),
  suggested_post_parameters: SuggestedPostParametersSchema.optional(),
  reply_parameters: ReplyParametersSchema.optional(),
  reply_markup: z.union([InlineKeyboardMarkupSchema, ReplyKeyboardMarkupSchema, ReplyKeyboardRemoveSchema, ForceReplySchema]).optional(),
});
export type SendDiceParams = z.infer<typeof SendDiceParamsSchema>;
export const SendDiceResultSchema = MessageSchema;
export type SendDiceResult = z.infer<typeof SendDiceResultSchema>;
export const SendMessageDraftParamsSchema = obj({
  chat_id: z.number().int(),
  message_thread_id: z.number().int().optional(),
  draft_id: z.number().int(),
  text: z.string().optional(),
  parse_mode: ParseModeSchema.optional(),
  entities: z.array(MessageEntitySchema).optional(),
});
export type SendMessageDraftParams = z.infer<typeof SendMessageDraftParamsSchema>;
export const SendMessageDraftResultSchema = z.literal(true);
export type SendMessageDraftResult = z.infer<typeof SendMessageDraftResultSchema>;
export const SendChatActionParamsSchema = obj({
  business_connection_id: z.string().optional(),
  chat_id: ChatIdSchema,
  message_thread_id: z.number().int().optional(),
  action: z.string(),
});
export type SendChatActionParams = z.infer<typeof SendChatActionParamsSchema>;
export const SendChatActionResultSchema = z.literal(true);
export type SendChatActionResult = z.infer<typeof SendChatActionResultSchema>;
export const SetMessageReactionParamsSchema = obj({
  chat_id: ChatIdSchema,
  message_id: z.number().int(),
  reaction: z.array(ReactionTypeSchema).optional(),
  is_big: z.boolean().optional(),
});
export type SetMessageReactionParams = z.infer<typeof SetMessageReactionParamsSchema>;
export const SetMessageReactionResultSchema = z.literal(true);
export type SetMessageReactionResult = z.infer<typeof SetMessageReactionResultSchema>;
export const GetUserProfilePhotosParamsSchema = obj({
  user_id: z.number().int(),
  offset: z.number().int().optional(),
  limit: z.number().int().optional(),
});
export type GetUserProfilePhotosParams = z.infer<typeof GetUserProfilePhotosParamsSchema>;
export const GetUserProfilePhotosResultSchema = UserProfilePhotosSchema;
export type GetUserProfilePhotosResult = z.infer<typeof GetUserProfilePhotosResultSchema>;
export const GetUserProfileAudiosParamsSchema = obj({
  user_id: z.number().int(),
  offset: z.number().int().optional(),
  limit: z.number().int().optional(),
});
export type GetUserProfileAudiosParams = z.infer<typeof GetUserProfileAudiosParamsSchema>;
export const GetUserProfileAudiosResultSchema = UserProfileAudiosSchema;
export type GetUserProfileAudiosResult = z.infer<typeof GetUserProfileAudiosResultSchema>;
export const SetUserEmojiStatusParamsSchema = obj({
  user_id: z.number().int(),
  emoji_status_custom_emoji_id: z.string().optional(),
  emoji_status_expiration_date: z.number().int().optional(),
});
export type SetUserEmojiStatusParams = z.infer<typeof SetUserEmojiStatusParamsSchema>;
export const SetUserEmojiStatusResultSchema = z.literal(true);
export type SetUserEmojiStatusResult = z.infer<typeof SetUserEmojiStatusResultSchema>;
export const GetFileParamsSchema = obj({
  file_id: z.string(),
});
export type GetFileParams = z.infer<typeof GetFileParamsSchema>;
export const GetFileResultSchema = z.unknown();
export type GetFileResult = z.infer<typeof GetFileResultSchema>;
export const BanChatMemberParamsSchema = obj({
  chat_id: ChatIdSchema,
  user_id: z.number().int(),
  until_date: z.number().int().optional(),
  revoke_messages: z.boolean().optional(),
});
export type BanChatMemberParams = z.infer<typeof BanChatMemberParamsSchema>;
export const BanChatMemberResultSchema = z.literal(true);
export type BanChatMemberResult = z.infer<typeof BanChatMemberResultSchema>;
export const UnbanChatMemberParamsSchema = obj({
  chat_id: ChatIdSchema,
  user_id: z.number().int(),
  only_if_banned: z.boolean().optional(),
});
export type UnbanChatMemberParams = z.infer<typeof UnbanChatMemberParamsSchema>;
export const UnbanChatMemberResultSchema = z.literal(true);
export type UnbanChatMemberResult = z.infer<typeof UnbanChatMemberResultSchema>;
export const RestrictChatMemberParamsSchema = obj({
  chat_id: ChatIdSchema,
  user_id: z.number().int(),
  permissions: ChatPermissionsSchema,
  use_independent_chat_permissions: z.boolean().optional(),
  until_date: z.number().int().optional(),
});
export type RestrictChatMemberParams = z.infer<typeof RestrictChatMemberParamsSchema>;
export const RestrictChatMemberResultSchema = z.literal(true);
export type RestrictChatMemberResult = z.infer<typeof RestrictChatMemberResultSchema>;
export const PromoteChatMemberParamsSchema = obj({
  chat_id: ChatIdSchema,
  user_id: z.number().int(),
  is_anonymous: z.boolean().optional(),
  can_manage_chat: z.boolean().optional(),
  can_delete_messages: z.boolean().optional(),
  can_manage_video_chats: z.boolean().optional(),
  can_restrict_members: z.boolean().optional(),
  can_promote_members: z.boolean().optional(),
  can_change_info: z.boolean().optional(),
  can_invite_users: z.boolean().optional(),
  can_post_stories: z.boolean().optional(),
  can_edit_stories: z.boolean().optional(),
  can_delete_stories: z.boolean().optional(),
  can_post_messages: z.boolean().optional(),
  can_edit_messages: z.boolean().optional(),
  can_pin_messages: z.boolean().optional(),
  can_manage_topics: z.boolean().optional(),
  can_manage_direct_messages: z.boolean().optional(),
  can_manage_tags: z.boolean().optional(),
});
export type PromoteChatMemberParams = z.infer<typeof PromoteChatMemberParamsSchema>;
export const PromoteChatMemberResultSchema = z.literal(true);
export type PromoteChatMemberResult = z.infer<typeof PromoteChatMemberResultSchema>;
export const SetChatAdministratorCustomTitleParamsSchema = obj({
  chat_id: ChatIdSchema,
  user_id: z.number().int(),
  custom_title: z.string(),
});
export type SetChatAdministratorCustomTitleParams = z.infer<typeof SetChatAdministratorCustomTitleParamsSchema>;
export const SetChatAdministratorCustomTitleResultSchema = z.literal(true);
export type SetChatAdministratorCustomTitleResult = z.infer<typeof SetChatAdministratorCustomTitleResultSchema>;
export const SetChatMemberTagParamsSchema = obj({
  chat_id: ChatIdSchema,
  user_id: z.number().int(),
  tag: z.string().optional(),
});
export type SetChatMemberTagParams = z.infer<typeof SetChatMemberTagParamsSchema>;
export const SetChatMemberTagResultSchema = z.literal(true);
export type SetChatMemberTagResult = z.infer<typeof SetChatMemberTagResultSchema>;
export const BanChatSenderChatParamsSchema = obj({
  chat_id: ChatIdSchema,
  sender_chat_id: z.number().int(),
});
export type BanChatSenderChatParams = z.infer<typeof BanChatSenderChatParamsSchema>;
export const BanChatSenderChatResultSchema = z.literal(true);
export type BanChatSenderChatResult = z.infer<typeof BanChatSenderChatResultSchema>;
export const UnbanChatSenderChatParamsSchema = obj({
  chat_id: ChatIdSchema,
  sender_chat_id: z.number().int(),
});
export type UnbanChatSenderChatParams = z.infer<typeof UnbanChatSenderChatParamsSchema>;
export const UnbanChatSenderChatResultSchema = z.literal(true);
export type UnbanChatSenderChatResult = z.infer<typeof UnbanChatSenderChatResultSchema>;
export const SetChatPermissionsParamsSchema = obj({
  chat_id: ChatIdSchema,
  permissions: ChatPermissionsSchema,
  use_independent_chat_permissions: z.boolean().optional(),
});
export type SetChatPermissionsParams = z.infer<typeof SetChatPermissionsParamsSchema>;
export const SetChatPermissionsResultSchema = z.literal(true);
export type SetChatPermissionsResult = z.infer<typeof SetChatPermissionsResultSchema>;
export const ExportChatInviteLinkParamsSchema = obj({
  chat_id: ChatIdSchema,
});
export type ExportChatInviteLinkParams = z.infer<typeof ExportChatInviteLinkParamsSchema>;
export const ExportChatInviteLinkResultSchema = z.unknown();
export type ExportChatInviteLinkResult = z.infer<typeof ExportChatInviteLinkResultSchema>;
export const CreateChatInviteLinkParamsSchema = obj({
  chat_id: ChatIdSchema,
  name: z.string().optional(),
  expire_date: z.number().int().optional(),
  member_limit: z.number().int().optional(),
  creates_join_request: z.boolean().optional(),
});
export type CreateChatInviteLinkParams = z.infer<typeof CreateChatInviteLinkParamsSchema>;
export const CreateChatInviteLinkResultSchema = z.unknown();
export type CreateChatInviteLinkResult = z.infer<typeof CreateChatInviteLinkResultSchema>;
export const EditChatInviteLinkParamsSchema = obj({
  chat_id: ChatIdSchema,
  invite_link: z.string(),
  name: z.string().optional(),
  expire_date: z.number().int().optional(),
  member_limit: z.number().int().optional(),
  creates_join_request: z.boolean().optional(),
});
export type EditChatInviteLinkParams = z.infer<typeof EditChatInviteLinkParamsSchema>;
export const EditChatInviteLinkResultSchema = z.unknown();
export type EditChatInviteLinkResult = z.infer<typeof EditChatInviteLinkResultSchema>;
export const CreateChatSubscriptionInviteLinkParamsSchema = obj({
  chat_id: ChatIdSchema,
  name: z.string().optional(),
  subscription_period: z.number().int(),
  subscription_price: z.number().int(),
});
export type CreateChatSubscriptionInviteLinkParams = z.infer<typeof CreateChatSubscriptionInviteLinkParamsSchema>;
export const CreateChatSubscriptionInviteLinkResultSchema = z.unknown();
export type CreateChatSubscriptionInviteLinkResult = z.infer<typeof CreateChatSubscriptionInviteLinkResultSchema>;
export const EditChatSubscriptionInviteLinkParamsSchema = obj({
  chat_id: ChatIdSchema,
  invite_link: z.string(),
  name: z.string().optional(),
});
export type EditChatSubscriptionInviteLinkParams = z.infer<typeof EditChatSubscriptionInviteLinkParamsSchema>;
export const EditChatSubscriptionInviteLinkResultSchema = z.unknown();
export type EditChatSubscriptionInviteLinkResult = z.infer<typeof EditChatSubscriptionInviteLinkResultSchema>;
export const RevokeChatInviteLinkParamsSchema = obj({
  chat_id: ChatIdSchema,
  invite_link: z.string(),
});
export type RevokeChatInviteLinkParams = z.infer<typeof RevokeChatInviteLinkParamsSchema>;
export const RevokeChatInviteLinkResultSchema = z.unknown();
export type RevokeChatInviteLinkResult = z.infer<typeof RevokeChatInviteLinkResultSchema>;
export const ApproveChatJoinRequestParamsSchema = obj({
  chat_id: ChatIdSchema,
  user_id: z.number().int(),
});
export type ApproveChatJoinRequestParams = z.infer<typeof ApproveChatJoinRequestParamsSchema>;
export const ApproveChatJoinRequestResultSchema = z.literal(true);
export type ApproveChatJoinRequestResult = z.infer<typeof ApproveChatJoinRequestResultSchema>;
export const DeclineChatJoinRequestParamsSchema = obj({
  chat_id: ChatIdSchema,
  user_id: z.number().int(),
});
export type DeclineChatJoinRequestParams = z.infer<typeof DeclineChatJoinRequestParamsSchema>;
export const DeclineChatJoinRequestResultSchema = z.literal(true);
export type DeclineChatJoinRequestResult = z.infer<typeof DeclineChatJoinRequestResultSchema>;
export const SetChatPhotoParamsSchema = obj({
  chat_id: ChatIdSchema,
  photo: z.custom<unknown>(() => true),
});
export type SetChatPhotoParams = z.infer<typeof SetChatPhotoParamsSchema>;
export const SetChatPhotoResultSchema = z.literal(true);
export type SetChatPhotoResult = z.infer<typeof SetChatPhotoResultSchema>;
export const DeleteChatPhotoParamsSchema = obj({
  chat_id: ChatIdSchema,
});
export type DeleteChatPhotoParams = z.infer<typeof DeleteChatPhotoParamsSchema>;
export const DeleteChatPhotoResultSchema = z.literal(true);
export type DeleteChatPhotoResult = z.infer<typeof DeleteChatPhotoResultSchema>;
export const SetChatTitleParamsSchema = obj({
  chat_id: ChatIdSchema,
  title: z.string(),
});
export type SetChatTitleParams = z.infer<typeof SetChatTitleParamsSchema>;
export const SetChatTitleResultSchema = z.literal(true);
export type SetChatTitleResult = z.infer<typeof SetChatTitleResultSchema>;
export const SetChatDescriptionParamsSchema = obj({
  chat_id: ChatIdSchema,
  description: z.string().optional(),
});
export type SetChatDescriptionParams = z.infer<typeof SetChatDescriptionParamsSchema>;
export const SetChatDescriptionResultSchema = z.literal(true);
export type SetChatDescriptionResult = z.infer<typeof SetChatDescriptionResultSchema>;
export const PinChatMessageParamsSchema = obj({
  business_connection_id: z.string().optional(),
  chat_id: ChatIdSchema,
  message_id: z.number().int(),
  disable_notification: z.boolean().optional(),
});
export type PinChatMessageParams = z.infer<typeof PinChatMessageParamsSchema>;
export const PinChatMessageResultSchema = z.literal(true);
export type PinChatMessageResult = z.infer<typeof PinChatMessageResultSchema>;
export const UnpinChatMessageParamsSchema = obj({
  business_connection_id: z.string().optional(),
  chat_id: ChatIdSchema,
  message_id: z.number().int().optional(),
});
export type UnpinChatMessageParams = z.infer<typeof UnpinChatMessageParamsSchema>;
export const UnpinChatMessageResultSchema = z.literal(true);
export type UnpinChatMessageResult = z.infer<typeof UnpinChatMessageResultSchema>;
export const UnpinAllChatMessagesParamsSchema = obj({
  chat_id: ChatIdSchema,
});
export type UnpinAllChatMessagesParams = z.infer<typeof UnpinAllChatMessagesParamsSchema>;
export const UnpinAllChatMessagesResultSchema = z.literal(true);
export type UnpinAllChatMessagesResult = z.infer<typeof UnpinAllChatMessagesResultSchema>;
export const LeaveChatParamsSchema = obj({
  chat_id: ChatIdSchema,
});
export type LeaveChatParams = z.infer<typeof LeaveChatParamsSchema>;
export const LeaveChatResultSchema = z.literal(true);
export type LeaveChatResult = z.infer<typeof LeaveChatResultSchema>;
export const GetChatParamsSchema = obj({
  chat_id: ChatIdSchema,
});
export type GetChatParams = z.infer<typeof GetChatParamsSchema>;
export const GetChatResultSchema = ChatFullInfoSchema;
export type GetChatResult = z.infer<typeof GetChatResultSchema>;
export const GetChatAdministratorsParamsSchema = obj({
  chat_id: ChatIdSchema,
  return_bots: z.boolean().optional(),
});
export type GetChatAdministratorsParams = z.infer<typeof GetChatAdministratorsParamsSchema>;
export const GetChatAdministratorsResultSchema = z.array(ChatMemberSchema);
export type GetChatAdministratorsResult = z.infer<typeof GetChatAdministratorsResultSchema>;
export const GetChatMemberCountParamsSchema = obj({
  chat_id: ChatIdSchema,
});
export type GetChatMemberCountParams = z.infer<typeof GetChatMemberCountParamsSchema>;
export const GetChatMemberCountResultSchema = z.unknown();
export type GetChatMemberCountResult = z.infer<typeof GetChatMemberCountResultSchema>;
export const GetChatMemberParamsSchema = obj({
  chat_id: ChatIdSchema,
  user_id: z.number().int(),
});
export type GetChatMemberParams = z.infer<typeof GetChatMemberParamsSchema>;
export const GetChatMemberResultSchema = ChatMemberSchema;
export type GetChatMemberResult = z.infer<typeof GetChatMemberResultSchema>;
export const GetUserPersonalChatMessagesParamsSchema = obj({
  user_id: z.number().int(),
  limit: z.number().int(),
});
export type GetUserPersonalChatMessagesParams = z.infer<typeof GetUserPersonalChatMessagesParamsSchema>;
export const GetUserPersonalChatMessagesResultSchema = MessageSchema;
export type GetUserPersonalChatMessagesResult = z.infer<typeof GetUserPersonalChatMessagesResultSchema>;
export const SetChatStickerSetParamsSchema = obj({
  chat_id: ChatIdSchema,
  sticker_set_name: z.string(),
});
export type SetChatStickerSetParams = z.infer<typeof SetChatStickerSetParamsSchema>;
export const SetChatStickerSetResultSchema = z.literal(true);
export type SetChatStickerSetResult = z.infer<typeof SetChatStickerSetResultSchema>;
export const DeleteChatStickerSetParamsSchema = obj({
  chat_id: ChatIdSchema,
});
export type DeleteChatStickerSetParams = z.infer<typeof DeleteChatStickerSetParamsSchema>;
export const DeleteChatStickerSetResultSchema = z.literal(true);
export type DeleteChatStickerSetResult = z.infer<typeof DeleteChatStickerSetResultSchema>;
export const GetForumTopicIconStickersParamsSchema = obj({});
export type GetForumTopicIconStickersParams = z.infer<typeof GetForumTopicIconStickersParamsSchema>;
export const GetForumTopicIconStickersResultSchema = z.array(StickerSchema);
export type GetForumTopicIconStickersResult = z.infer<typeof GetForumTopicIconStickersResultSchema>;
export const CreateForumTopicParamsSchema = obj({
  chat_id: ChatIdSchema,
  name: z.string(),
  icon_color: z.number().int().optional(),
  icon_custom_emoji_id: z.string().optional(),
});
export type CreateForumTopicParams = z.infer<typeof CreateForumTopicParamsSchema>;
export const CreateForumTopicResultSchema = z.unknown();
export type CreateForumTopicResult = z.infer<typeof CreateForumTopicResultSchema>;
export const EditForumTopicParamsSchema = obj({
  chat_id: ChatIdSchema,
  message_thread_id: z.number().int(),
  name: z.string().optional(),
  icon_custom_emoji_id: z.string().optional(),
});
export type EditForumTopicParams = z.infer<typeof EditForumTopicParamsSchema>;
export const EditForumTopicResultSchema = z.literal(true);
export type EditForumTopicResult = z.infer<typeof EditForumTopicResultSchema>;
export const CloseForumTopicParamsSchema = obj({
  chat_id: ChatIdSchema,
  message_thread_id: z.number().int(),
});
export type CloseForumTopicParams = z.infer<typeof CloseForumTopicParamsSchema>;
export const CloseForumTopicResultSchema = z.literal(true);
export type CloseForumTopicResult = z.infer<typeof CloseForumTopicResultSchema>;
export const ReopenForumTopicParamsSchema = obj({
  chat_id: ChatIdSchema,
  message_thread_id: z.number().int(),
});
export type ReopenForumTopicParams = z.infer<typeof ReopenForumTopicParamsSchema>;
export const ReopenForumTopicResultSchema = z.literal(true);
export type ReopenForumTopicResult = z.infer<typeof ReopenForumTopicResultSchema>;
export const DeleteForumTopicParamsSchema = obj({
  chat_id: ChatIdSchema,
  message_thread_id: z.number().int(),
});
export type DeleteForumTopicParams = z.infer<typeof DeleteForumTopicParamsSchema>;
export const DeleteForumTopicResultSchema = z.literal(true);
export type DeleteForumTopicResult = z.infer<typeof DeleteForumTopicResultSchema>;
export const UnpinAllForumTopicMessagesParamsSchema = obj({
  chat_id: ChatIdSchema,
  message_thread_id: z.number().int(),
});
export type UnpinAllForumTopicMessagesParams = z.infer<typeof UnpinAllForumTopicMessagesParamsSchema>;
export const UnpinAllForumTopicMessagesResultSchema = z.literal(true);
export type UnpinAllForumTopicMessagesResult = z.infer<typeof UnpinAllForumTopicMessagesResultSchema>;
export const EditGeneralForumTopicParamsSchema = obj({
  chat_id: ChatIdSchema,
  name: z.string(),
});
export type EditGeneralForumTopicParams = z.infer<typeof EditGeneralForumTopicParamsSchema>;
export const EditGeneralForumTopicResultSchema = z.literal(true);
export type EditGeneralForumTopicResult = z.infer<typeof EditGeneralForumTopicResultSchema>;
export const CloseGeneralForumTopicParamsSchema = obj({
  chat_id: ChatIdSchema,
});
export type CloseGeneralForumTopicParams = z.infer<typeof CloseGeneralForumTopicParamsSchema>;
export const CloseGeneralForumTopicResultSchema = z.literal(true);
export type CloseGeneralForumTopicResult = z.infer<typeof CloseGeneralForumTopicResultSchema>;
export const ReopenGeneralForumTopicParamsSchema = obj({
  chat_id: ChatIdSchema,
});
export type ReopenGeneralForumTopicParams = z.infer<typeof ReopenGeneralForumTopicParamsSchema>;
export const ReopenGeneralForumTopicResultSchema = z.literal(true);
export type ReopenGeneralForumTopicResult = z.infer<typeof ReopenGeneralForumTopicResultSchema>;
export const HideGeneralForumTopicParamsSchema = obj({
  chat_id: ChatIdSchema,
});
export type HideGeneralForumTopicParams = z.infer<typeof HideGeneralForumTopicParamsSchema>;
export const HideGeneralForumTopicResultSchema = z.literal(true);
export type HideGeneralForumTopicResult = z.infer<typeof HideGeneralForumTopicResultSchema>;
export const UnhideGeneralForumTopicParamsSchema = obj({
  chat_id: ChatIdSchema,
});
export type UnhideGeneralForumTopicParams = z.infer<typeof UnhideGeneralForumTopicParamsSchema>;
export const UnhideGeneralForumTopicResultSchema = z.literal(true);
export type UnhideGeneralForumTopicResult = z.infer<typeof UnhideGeneralForumTopicResultSchema>;
export const UnpinAllGeneralForumTopicMessagesParamsSchema = obj({
  chat_id: ChatIdSchema,
});
export type UnpinAllGeneralForumTopicMessagesParams = z.infer<typeof UnpinAllGeneralForumTopicMessagesParamsSchema>;
export const UnpinAllGeneralForumTopicMessagesResultSchema = z.literal(true);
export type UnpinAllGeneralForumTopicMessagesResult = z.infer<typeof UnpinAllGeneralForumTopicMessagesResultSchema>;
export const AnswerCallbackQueryParamsSchema = obj({
  callback_query_id: z.string(),
  text: z.string().optional(),
  show_alert: z.boolean().optional(),
  url: z.string().optional(),
  cache_time: z.number().int().optional(),
});
export type AnswerCallbackQueryParams = z.infer<typeof AnswerCallbackQueryParamsSchema>;
export const AnswerCallbackQueryResultSchema = z.literal(true);
export type AnswerCallbackQueryResult = z.infer<typeof AnswerCallbackQueryResultSchema>;
export const AnswerGuestQueryParamsSchema = obj({
  guest_query_id: z.string(),
  result: InlineQueryResultSchema,
});
export type AnswerGuestQueryParams = z.infer<typeof AnswerGuestQueryParamsSchema>;
export const AnswerGuestQueryResultSchema = z.unknown();
export type AnswerGuestQueryResult = z.infer<typeof AnswerGuestQueryResultSchema>;
export const GetUserChatBoostsParamsSchema = obj({
  chat_id: ChatIdSchema,
  user_id: z.number().int(),
});
export type GetUserChatBoostsParams = z.infer<typeof GetUserChatBoostsParamsSchema>;
export const GetUserChatBoostsResultSchema = UserChatBoostsSchema;
export type GetUserChatBoostsResult = z.infer<typeof GetUserChatBoostsResultSchema>;
export const GetBusinessConnectionParamsSchema = obj({
  business_connection_id: z.string(),
});
export type GetBusinessConnectionParams = z.infer<typeof GetBusinessConnectionParamsSchema>;
export const GetBusinessConnectionResultSchema = BusinessConnectionSchema;
export type GetBusinessConnectionResult = z.infer<typeof GetBusinessConnectionResultSchema>;
export const GetManagedBotTokenParamsSchema = obj({
  user_id: z.number().int(),
});
export type GetManagedBotTokenParams = z.infer<typeof GetManagedBotTokenParamsSchema>;
export const GetManagedBotTokenResultSchema = z.unknown();
export type GetManagedBotTokenResult = z.infer<typeof GetManagedBotTokenResultSchema>;
export const ReplaceManagedBotTokenParamsSchema = obj({
  user_id: z.number().int(),
});
export type ReplaceManagedBotTokenParams = z.infer<typeof ReplaceManagedBotTokenParamsSchema>;
export const ReplaceManagedBotTokenResultSchema = z.unknown();
export type ReplaceManagedBotTokenResult = z.infer<typeof ReplaceManagedBotTokenResultSchema>;
export const GetManagedBotAccessSettingsParamsSchema = obj({
  user_id: z.number().int(),
});
export type GetManagedBotAccessSettingsParams = z.infer<typeof GetManagedBotAccessSettingsParamsSchema>;
export const GetManagedBotAccessSettingsResultSchema = BotAccessSettingsSchema;
export type GetManagedBotAccessSettingsResult = z.infer<typeof GetManagedBotAccessSettingsResultSchema>;
export const SetManagedBotAccessSettingsParamsSchema = obj({
  user_id: z.number().int(),
  is_access_restricted: z.boolean(),
  added_user_ids: z.array(z.number().int()).optional(),
});
export type SetManagedBotAccessSettingsParams = z.infer<typeof SetManagedBotAccessSettingsParamsSchema>;
export const SetManagedBotAccessSettingsResultSchema = z.literal(true);
export type SetManagedBotAccessSettingsResult = z.infer<typeof SetManagedBotAccessSettingsResultSchema>;
export const SetMyCommandsParamsSchema = obj({
  commands: z.array(BotCommandSchema),
  scope: BotCommandScopeSchema.optional(),
  language_code: z.string().optional(),
});
export type SetMyCommandsParams = z.infer<typeof SetMyCommandsParamsSchema>;
export const SetMyCommandsResultSchema = z.literal(true);
export type SetMyCommandsResult = z.infer<typeof SetMyCommandsResultSchema>;
export const DeleteMyCommandsParamsSchema = obj({
  scope: BotCommandScopeSchema.optional(),
  language_code: z.string().optional(),
});
export type DeleteMyCommandsParams = z.infer<typeof DeleteMyCommandsParamsSchema>;
export const DeleteMyCommandsResultSchema = z.literal(true);
export type DeleteMyCommandsResult = z.infer<typeof DeleteMyCommandsResultSchema>;
export const GetMyCommandsParamsSchema = obj({
  scope: BotCommandScopeSchema.optional(),
  language_code: z.string().optional(),
});
export type GetMyCommandsParams = z.infer<typeof GetMyCommandsParamsSchema>;
export const GetMyCommandsResultSchema = z.array(BotCommandSchema);
export type GetMyCommandsResult = z.infer<typeof GetMyCommandsResultSchema>;
export const SetMyNameParamsSchema = obj({
  name: z.string().optional(),
  language_code: z.string().optional(),
});
export type SetMyNameParams = z.infer<typeof SetMyNameParamsSchema>;
export const SetMyNameResultSchema = z.literal(true);
export type SetMyNameResult = z.infer<typeof SetMyNameResultSchema>;
export const GetMyNameParamsSchema = obj({
  language_code: z.string().optional(),
});
export type GetMyNameParams = z.infer<typeof GetMyNameParamsSchema>;
export const GetMyNameResultSchema = z.unknown();
export type GetMyNameResult = z.infer<typeof GetMyNameResultSchema>;
export const SetMyDescriptionParamsSchema = obj({
  description: z.string().optional(),
  language_code: z.string().optional(),
});
export type SetMyDescriptionParams = z.infer<typeof SetMyDescriptionParamsSchema>;
export const SetMyDescriptionResultSchema = z.literal(true);
export type SetMyDescriptionResult = z.infer<typeof SetMyDescriptionResultSchema>;
export const GetMyDescriptionParamsSchema = obj({
  language_code: z.string().optional(),
});
export type GetMyDescriptionParams = z.infer<typeof GetMyDescriptionParamsSchema>;
export const GetMyDescriptionResultSchema = z.unknown();
export type GetMyDescriptionResult = z.infer<typeof GetMyDescriptionResultSchema>;
export const SetMyShortDescriptionParamsSchema = obj({
  short_description: z.string().optional(),
  language_code: z.string().optional(),
});
export type SetMyShortDescriptionParams = z.infer<typeof SetMyShortDescriptionParamsSchema>;
export const SetMyShortDescriptionResultSchema = z.literal(true);
export type SetMyShortDescriptionResult = z.infer<typeof SetMyShortDescriptionResultSchema>;
export const GetMyShortDescriptionParamsSchema = obj({
  language_code: z.string().optional(),
});
export type GetMyShortDescriptionParams = z.infer<typeof GetMyShortDescriptionParamsSchema>;
export const GetMyShortDescriptionResultSchema = z.unknown();
export type GetMyShortDescriptionResult = z.infer<typeof GetMyShortDescriptionResultSchema>;
export const SetMyProfilePhotoParamsSchema = obj({
  photo: InputProfilePhotoSchema,
});
export type SetMyProfilePhotoParams = z.infer<typeof SetMyProfilePhotoParamsSchema>;
export const SetMyProfilePhotoResultSchema = z.literal(true);
export type SetMyProfilePhotoResult = z.infer<typeof SetMyProfilePhotoResultSchema>;
export const RemoveMyProfilePhotoParamsSchema = obj({});
export type RemoveMyProfilePhotoParams = z.infer<typeof RemoveMyProfilePhotoParamsSchema>;
export const RemoveMyProfilePhotoResultSchema = z.literal(true);
export type RemoveMyProfilePhotoResult = z.infer<typeof RemoveMyProfilePhotoResultSchema>;
export const SetChatMenuButtonParamsSchema = obj({
  chat_id: z.number().int().optional(),
  menu_button: MenuButtonSchema.optional(),
});
export type SetChatMenuButtonParams = z.infer<typeof SetChatMenuButtonParamsSchema>;
export const SetChatMenuButtonResultSchema = z.literal(true);
export type SetChatMenuButtonResult = z.infer<typeof SetChatMenuButtonResultSchema>;
export const GetChatMenuButtonParamsSchema = obj({
  chat_id: z.number().int().optional(),
});
export type GetChatMenuButtonParams = z.infer<typeof GetChatMenuButtonParamsSchema>;
export const GetChatMenuButtonResultSchema = z.unknown();
export type GetChatMenuButtonResult = z.infer<typeof GetChatMenuButtonResultSchema>;
export const SetMyDefaultAdministratorRightsParamsSchema = obj({
  rights: ChatAdministratorRightsSchema.optional(),
  for_channels: z.boolean().optional(),
});
export type SetMyDefaultAdministratorRightsParams = z.infer<typeof SetMyDefaultAdministratorRightsParamsSchema>;
export const SetMyDefaultAdministratorRightsResultSchema = z.literal(true);
export type SetMyDefaultAdministratorRightsResult = z.infer<typeof SetMyDefaultAdministratorRightsResultSchema>;
export const GetMyDefaultAdministratorRightsParamsSchema = obj({
  for_channels: z.boolean().optional(),
});
export type GetMyDefaultAdministratorRightsParams = z.infer<typeof GetMyDefaultAdministratorRightsParamsSchema>;
export const GetMyDefaultAdministratorRightsResultSchema = z.unknown();
export type GetMyDefaultAdministratorRightsResult = z.infer<typeof GetMyDefaultAdministratorRightsResultSchema>;
export const GetAvailableGiftsParamsSchema = obj({});
export type GetAvailableGiftsParams = z.infer<typeof GetAvailableGiftsParamsSchema>;
export const GetAvailableGiftsResultSchema = GiftsSchema;
export type GetAvailableGiftsResult = z.infer<typeof GetAvailableGiftsResultSchema>;
export const SendGiftParamsSchema = obj({
  user_id: z.number().int().optional(),
  chat_id: ChatIdSchema.optional(),
  gift_id: z.string(),
  pay_for_upgrade: z.boolean().optional(),
  text: z.string().optional(),
  text_parse_mode: z.string().optional(),
  text_entities: z.array(MessageEntitySchema).optional(),
});
export type SendGiftParams = z.infer<typeof SendGiftParamsSchema>;
export const SendGiftResultSchema = z.literal(true);
export type SendGiftResult = z.infer<typeof SendGiftResultSchema>;
export const GiftPremiumSubscriptionParamsSchema = obj({
  user_id: z.number().int(),
  month_count: z.number().int(),
  star_count: z.number().int(),
  text: z.string().optional(),
  text_parse_mode: z.string().optional(),
  text_entities: z.array(MessageEntitySchema).optional(),
});
export type GiftPremiumSubscriptionParams = z.infer<typeof GiftPremiumSubscriptionParamsSchema>;
export const GiftPremiumSubscriptionResultSchema = z.literal(true);
export type GiftPremiumSubscriptionResult = z.infer<typeof GiftPremiumSubscriptionResultSchema>;
export const VerifyUserParamsSchema = obj({
  user_id: z.number().int(),
  custom_description: z.string().optional(),
});
export type VerifyUserParams = z.infer<typeof VerifyUserParamsSchema>;
export const VerifyUserResultSchema = z.literal(true);
export type VerifyUserResult = z.infer<typeof VerifyUserResultSchema>;
export const VerifyChatParamsSchema = obj({
  chat_id: ChatIdSchema,
  custom_description: z.string().optional(),
});
export type VerifyChatParams = z.infer<typeof VerifyChatParamsSchema>;
export const VerifyChatResultSchema = z.literal(true);
export type VerifyChatResult = z.infer<typeof VerifyChatResultSchema>;
export const RemoveUserVerificationParamsSchema = obj({
  user_id: z.number().int(),
});
export type RemoveUserVerificationParams = z.infer<typeof RemoveUserVerificationParamsSchema>;
export const RemoveUserVerificationResultSchema = z.literal(true);
export type RemoveUserVerificationResult = z.infer<typeof RemoveUserVerificationResultSchema>;
export const RemoveChatVerificationParamsSchema = obj({
  chat_id: ChatIdSchema,
});
export type RemoveChatVerificationParams = z.infer<typeof RemoveChatVerificationParamsSchema>;
export const RemoveChatVerificationResultSchema = z.literal(true);
export type RemoveChatVerificationResult = z.infer<typeof RemoveChatVerificationResultSchema>;
export const ReadBusinessMessageParamsSchema = obj({
  business_connection_id: z.string(),
  chat_id: z.number().int(),
  message_id: z.number().int(),
});
export type ReadBusinessMessageParams = z.infer<typeof ReadBusinessMessageParamsSchema>;
export const ReadBusinessMessageResultSchema = z.literal(true);
export type ReadBusinessMessageResult = z.infer<typeof ReadBusinessMessageResultSchema>;
export const DeleteBusinessMessagesParamsSchema = obj({
  business_connection_id: z.string(),
  message_ids: z.array(z.number().int()),
});
export type DeleteBusinessMessagesParams = z.infer<typeof DeleteBusinessMessagesParamsSchema>;
export const DeleteBusinessMessagesResultSchema = z.literal(true);
export type DeleteBusinessMessagesResult = z.infer<typeof DeleteBusinessMessagesResultSchema>;
export const SetBusinessAccountNameParamsSchema = obj({
  business_connection_id: z.string(),
  first_name: z.string(),
  last_name: z.string().optional(),
});
export type SetBusinessAccountNameParams = z.infer<typeof SetBusinessAccountNameParamsSchema>;
export const SetBusinessAccountNameResultSchema = z.literal(true);
export type SetBusinessAccountNameResult = z.infer<typeof SetBusinessAccountNameResultSchema>;
export const SetBusinessAccountUsernameParamsSchema = obj({
  business_connection_id: z.string(),
  username: z.string().optional(),
});
export type SetBusinessAccountUsernameParams = z.infer<typeof SetBusinessAccountUsernameParamsSchema>;
export const SetBusinessAccountUsernameResultSchema = z.literal(true);
export type SetBusinessAccountUsernameResult = z.infer<typeof SetBusinessAccountUsernameResultSchema>;
export const SetBusinessAccountBioParamsSchema = obj({
  business_connection_id: z.string(),
  bio: z.string().optional(),
});
export type SetBusinessAccountBioParams = z.infer<typeof SetBusinessAccountBioParamsSchema>;
export const SetBusinessAccountBioResultSchema = z.literal(true);
export type SetBusinessAccountBioResult = z.infer<typeof SetBusinessAccountBioResultSchema>;
export const SetBusinessAccountProfilePhotoParamsSchema = obj({
  business_connection_id: z.string(),
  photo: InputProfilePhotoSchema,
  is_public: z.boolean().optional(),
});
export type SetBusinessAccountProfilePhotoParams = z.infer<typeof SetBusinessAccountProfilePhotoParamsSchema>;
export const SetBusinessAccountProfilePhotoResultSchema = z.literal(true);
export type SetBusinessAccountProfilePhotoResult = z.infer<typeof SetBusinessAccountProfilePhotoResultSchema>;
export const RemoveBusinessAccountProfilePhotoParamsSchema = obj({
  business_connection_id: z.string(),
  is_public: z.boolean().optional(),
});
export type RemoveBusinessAccountProfilePhotoParams = z.infer<typeof RemoveBusinessAccountProfilePhotoParamsSchema>;
export const RemoveBusinessAccountProfilePhotoResultSchema = z.literal(true);
export type RemoveBusinessAccountProfilePhotoResult = z.infer<typeof RemoveBusinessAccountProfilePhotoResultSchema>;
export const SetBusinessAccountGiftSettingsParamsSchema = obj({
  business_connection_id: z.string(),
  show_gift_button: z.boolean(),
  accepted_gift_types: AcceptedGiftTypesSchema,
});
export type SetBusinessAccountGiftSettingsParams = z.infer<typeof SetBusinessAccountGiftSettingsParamsSchema>;
export const SetBusinessAccountGiftSettingsResultSchema = z.literal(true);
export type SetBusinessAccountGiftSettingsResult = z.infer<typeof SetBusinessAccountGiftSettingsResultSchema>;
export const GetBusinessAccountStarBalanceParamsSchema = obj({
  business_connection_id: z.string(),
});
export type GetBusinessAccountStarBalanceParams = z.infer<typeof GetBusinessAccountStarBalanceParamsSchema>;
export const GetBusinessAccountStarBalanceResultSchema = z.unknown();
export type GetBusinessAccountStarBalanceResult = z.infer<typeof GetBusinessAccountStarBalanceResultSchema>;
export const TransferBusinessAccountStarsParamsSchema = obj({
  business_connection_id: z.string(),
  star_count: z.number().int(),
});
export type TransferBusinessAccountStarsParams = z.infer<typeof TransferBusinessAccountStarsParamsSchema>;
export const TransferBusinessAccountStarsResultSchema = z.literal(true);
export type TransferBusinessAccountStarsResult = z.infer<typeof TransferBusinessAccountStarsResultSchema>;
export const GetBusinessAccountGiftsParamsSchema = obj({
  business_connection_id: z.string(),
  exclude_unsaved: z.boolean().optional(),
  exclude_saved: z.boolean().optional(),
  exclude_unlimited: z.boolean().optional(),
  exclude_limited_upgradable: z.boolean().optional(),
  exclude_limited_non_upgradable: z.boolean().optional(),
  exclude_unique: z.boolean().optional(),
  exclude_from_blockchain: z.boolean().optional(),
  sort_by_price: z.boolean().optional(),
  offset: z.string().optional(),
  limit: z.number().int().optional(),
});
export type GetBusinessAccountGiftsParams = z.infer<typeof GetBusinessAccountGiftsParamsSchema>;
export const GetBusinessAccountGiftsResultSchema = z.unknown();
export type GetBusinessAccountGiftsResult = z.infer<typeof GetBusinessAccountGiftsResultSchema>;
export const GetUserGiftsParamsSchema = obj({
  user_id: z.number().int(),
  exclude_unlimited: z.boolean().optional(),
  exclude_limited_upgradable: z.boolean().optional(),
  exclude_limited_non_upgradable: z.boolean().optional(),
  exclude_from_blockchain: z.boolean().optional(),
  exclude_unique: z.boolean().optional(),
  sort_by_price: z.boolean().optional(),
  offset: z.string().optional(),
  limit: z.number().int().optional(),
});
export type GetUserGiftsParams = z.infer<typeof GetUserGiftsParamsSchema>;
export const GetUserGiftsResultSchema = z.unknown();
export type GetUserGiftsResult = z.infer<typeof GetUserGiftsResultSchema>;
export const GetChatGiftsParamsSchema = obj({
  chat_id: ChatIdSchema,
  exclude_unsaved: z.boolean().optional(),
  exclude_saved: z.boolean().optional(),
  exclude_unlimited: z.boolean().optional(),
  exclude_limited_upgradable: z.boolean().optional(),
  exclude_limited_non_upgradable: z.boolean().optional(),
  exclude_from_blockchain: z.boolean().optional(),
  exclude_unique: z.boolean().optional(),
  sort_by_price: z.boolean().optional(),
  offset: z.string().optional(),
  limit: z.number().int().optional(),
});
export type GetChatGiftsParams = z.infer<typeof GetChatGiftsParamsSchema>;
export const GetChatGiftsResultSchema = z.unknown();
export type GetChatGiftsResult = z.infer<typeof GetChatGiftsResultSchema>;
export const ConvertGiftToStarsParamsSchema = obj({
  business_connection_id: z.string(),
  owned_gift_id: z.string(),
});
export type ConvertGiftToStarsParams = z.infer<typeof ConvertGiftToStarsParamsSchema>;
export const ConvertGiftToStarsResultSchema = z.literal(true);
export type ConvertGiftToStarsResult = z.infer<typeof ConvertGiftToStarsResultSchema>;
export const UpgradeGiftParamsSchema = obj({
  business_connection_id: z.string(),
  owned_gift_id: z.string(),
  keep_original_details: z.boolean().optional(),
  star_count: z.number().int().optional(),
});
export type UpgradeGiftParams = z.infer<typeof UpgradeGiftParamsSchema>;
export const UpgradeGiftResultSchema = z.literal(true);
export type UpgradeGiftResult = z.infer<typeof UpgradeGiftResultSchema>;
export const TransferGiftParamsSchema = obj({
  business_connection_id: z.string(),
  owned_gift_id: z.string(),
  new_owner_chat_id: z.number().int(),
  star_count: z.number().int().optional(),
});
export type TransferGiftParams = z.infer<typeof TransferGiftParamsSchema>;
export const TransferGiftResultSchema = z.literal(true);
export type TransferGiftResult = z.infer<typeof TransferGiftResultSchema>;
export const PostStoryParamsSchema = obj({
  business_connection_id: z.string(),
  content: InputStoryContentSchema,
  active_period: z.number().int(),
  caption: z.string().optional(),
  parse_mode: ParseModeSchema.optional(),
  caption_entities: z.array(MessageEntitySchema).optional(),
  areas: z.array(StoryAreaSchema).optional(),
  post_to_chat_page: z.boolean().optional(),
  protect_content: z.boolean().optional(),
});
export type PostStoryParams = z.infer<typeof PostStoryParamsSchema>;
export const PostStoryResultSchema = z.unknown();
export type PostStoryResult = z.infer<typeof PostStoryResultSchema>;
export const RepostStoryParamsSchema = obj({
  business_connection_id: z.string(),
  from_chat_id: z.number().int(),
  from_story_id: z.number().int(),
  active_period: z.number().int(),
  post_to_chat_page: z.boolean().optional(),
  protect_content: z.boolean().optional(),
});
export type RepostStoryParams = z.infer<typeof RepostStoryParamsSchema>;
export const RepostStoryResultSchema = z.unknown();
export type RepostStoryResult = z.infer<typeof RepostStoryResultSchema>;
export const EditStoryParamsSchema = obj({
  business_connection_id: z.string(),
  story_id: z.number().int(),
  content: InputStoryContentSchema,
  caption: z.string().optional(),
  parse_mode: ParseModeSchema.optional(),
  caption_entities: z.array(MessageEntitySchema).optional(),
  areas: z.array(StoryAreaSchema).optional(),
});
export type EditStoryParams = z.infer<typeof EditStoryParamsSchema>;
export const EditStoryResultSchema = z.unknown();
export type EditStoryResult = z.infer<typeof EditStoryResultSchema>;
export const DeleteStoryParamsSchema = obj({
  business_connection_id: z.string(),
  story_id: z.number().int(),
});
export type DeleteStoryParams = z.infer<typeof DeleteStoryParamsSchema>;
export const DeleteStoryResultSchema = z.literal(true);
export type DeleteStoryResult = z.infer<typeof DeleteStoryResultSchema>;
export const AnswerWebAppQueryParamsSchema = obj({
  web_app_query_id: z.string(),
  result: InlineQueryResultSchema,
});
export type AnswerWebAppQueryParams = z.infer<typeof AnswerWebAppQueryParamsSchema>;
export const AnswerWebAppQueryResultSchema = z.unknown();
export type AnswerWebAppQueryResult = z.infer<typeof AnswerWebAppQueryResultSchema>;
export const SavePreparedInlineMessageParamsSchema = obj({
  user_id: z.number().int(),
  result: InlineQueryResultSchema,
  allow_user_chats: z.boolean().optional(),
  allow_bot_chats: z.boolean().optional(),
  allow_group_chats: z.boolean().optional(),
  allow_channel_chats: z.boolean().optional(),
});
export type SavePreparedInlineMessageParams = z.infer<typeof SavePreparedInlineMessageParamsSchema>;
export const SavePreparedInlineMessageResultSchema = PreparedInlineMessageSchema;
export type SavePreparedInlineMessageResult = z.infer<typeof SavePreparedInlineMessageResultSchema>;
export const SavePreparedKeyboardButtonParamsSchema = obj({
  user_id: z.number().int(),
  button: KeyboardButtonSchema,
});
export type SavePreparedKeyboardButtonParams = z.infer<typeof SavePreparedKeyboardButtonParamsSchema>;
export const SavePreparedKeyboardButtonResultSchema = PreparedKeyboardButtonSchema;
export type SavePreparedKeyboardButtonResult = z.infer<typeof SavePreparedKeyboardButtonResultSchema>;
export const EditMessageTextParamsSchema = obj({
  business_connection_id: z.string().optional(),
  chat_id: ChatIdSchema.optional(),
  message_id: z.number().int().optional(),
  inline_message_id: z.string().optional(),
  text: z.string(),
  parse_mode: ParseModeSchema.optional(),
  entities: z.array(MessageEntitySchema).optional(),
  link_preview_options: LinkPreviewOptionsSchema.optional(),
  reply_markup: InlineKeyboardMarkupSchema.optional(),
});
export type EditMessageTextParams = z.infer<typeof EditMessageTextParamsSchema>;
export const EditMessageTextResultSchema = z.unknown();
export type EditMessageTextResult = z.infer<typeof EditMessageTextResultSchema>;
export const EditMessageCaptionParamsSchema = obj({
  business_connection_id: z.string().optional(),
  chat_id: ChatIdSchema.optional(),
  message_id: z.number().int().optional(),
  inline_message_id: z.string().optional(),
  caption: z.string().optional(),
  parse_mode: ParseModeSchema.optional(),
  caption_entities: z.array(MessageEntitySchema).optional(),
  show_caption_above_media: z.boolean().optional(),
  reply_markup: InlineKeyboardMarkupSchema.optional(),
});
export type EditMessageCaptionParams = z.infer<typeof EditMessageCaptionParamsSchema>;
export const EditMessageCaptionResultSchema = z.unknown();
export type EditMessageCaptionResult = z.infer<typeof EditMessageCaptionResultSchema>;
export const EditMessageMediaParamsSchema = obj({
  business_connection_id: z.string().optional(),
  chat_id: ChatIdSchema.optional(),
  message_id: z.number().int().optional(),
  inline_message_id: z.string().optional(),
  media: InputMediaSchema,
  reply_markup: InlineKeyboardMarkupSchema.optional(),
});
export type EditMessageMediaParams = z.infer<typeof EditMessageMediaParamsSchema>;
export const EditMessageMediaResultSchema = z.unknown();
export type EditMessageMediaResult = z.infer<typeof EditMessageMediaResultSchema>;
export const EditMessageLiveLocationParamsSchema = obj({
  business_connection_id: z.string().optional(),
  chat_id: ChatIdSchema.optional(),
  message_id: z.number().int().optional(),
  inline_message_id: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  live_period: z.number().int().optional(),
  horizontal_accuracy: z.number().optional(),
  heading: z.number().int().optional(),
  proximity_alert_radius: z.number().int().optional(),
  reply_markup: InlineKeyboardMarkupSchema.optional(),
});
export type EditMessageLiveLocationParams = z.infer<typeof EditMessageLiveLocationParamsSchema>;
export const EditMessageLiveLocationResultSchema = z.unknown();
export type EditMessageLiveLocationResult = z.infer<typeof EditMessageLiveLocationResultSchema>;
export const StopMessageLiveLocationParamsSchema = obj({
  business_connection_id: z.string().optional(),
  chat_id: ChatIdSchema.optional(),
  message_id: z.number().int().optional(),
  inline_message_id: z.string().optional(),
  reply_markup: InlineKeyboardMarkupSchema.optional(),
});
export type StopMessageLiveLocationParams = z.infer<typeof StopMessageLiveLocationParamsSchema>;
export const StopMessageLiveLocationResultSchema = z.unknown();
export type StopMessageLiveLocationResult = z.infer<typeof StopMessageLiveLocationResultSchema>;
export const EditMessageChecklistParamsSchema = obj({
  business_connection_id: z.string(),
  chat_id: ChatIdSchema,
  message_id: z.number().int(),
  checklist: InputChecklistSchema,
  reply_markup: InlineKeyboardMarkupSchema.optional(),
});
export type EditMessageChecklistParams = z.infer<typeof EditMessageChecklistParamsSchema>;
export const EditMessageChecklistResultSchema = MessageSchema;
export type EditMessageChecklistResult = z.infer<typeof EditMessageChecklistResultSchema>;
export const EditMessageReplyMarkupParamsSchema = obj({
  business_connection_id: z.string().optional(),
  chat_id: ChatIdSchema.optional(),
  message_id: z.number().int().optional(),
  inline_message_id: z.string().optional(),
  reply_markup: InlineKeyboardMarkupSchema.optional(),
});
export type EditMessageReplyMarkupParams = z.infer<typeof EditMessageReplyMarkupParamsSchema>;
export const EditMessageReplyMarkupResultSchema = z.unknown();
export type EditMessageReplyMarkupResult = z.infer<typeof EditMessageReplyMarkupResultSchema>;
export const StopPollParamsSchema = obj({
  business_connection_id: z.string().optional(),
  chat_id: ChatIdSchema,
  message_id: z.number().int(),
  reply_markup: InlineKeyboardMarkupSchema.optional(),
});
export type StopPollParams = z.infer<typeof StopPollParamsSchema>;
export const StopPollResultSchema = PollSchema;
export type StopPollResult = z.infer<typeof StopPollResultSchema>;
export const ApproveSuggestedPostParamsSchema = obj({
  chat_id: z.number().int(),
  message_id: z.number().int(),
  send_date: z.number().int().optional(),
});
export type ApproveSuggestedPostParams = z.infer<typeof ApproveSuggestedPostParamsSchema>;
export const ApproveSuggestedPostResultSchema = z.literal(true);
export type ApproveSuggestedPostResult = z.infer<typeof ApproveSuggestedPostResultSchema>;
export const DeclineSuggestedPostParamsSchema = obj({
  chat_id: z.number().int(),
  message_id: z.number().int(),
  comment: z.string().optional(),
});
export type DeclineSuggestedPostParams = z.infer<typeof DeclineSuggestedPostParamsSchema>;
export const DeclineSuggestedPostResultSchema = z.literal(true);
export type DeclineSuggestedPostResult = z.infer<typeof DeclineSuggestedPostResultSchema>;
export const DeleteMessageParamsSchema = obj({
  chat_id: ChatIdSchema,
  message_id: z.number().int(),
});
export type DeleteMessageParams = z.infer<typeof DeleteMessageParamsSchema>;
export const DeleteMessageResultSchema = z.literal(true);
export type DeleteMessageResult = z.infer<typeof DeleteMessageResultSchema>;
export const DeleteMessagesParamsSchema = obj({
  chat_id: ChatIdSchema,
  message_ids: z.array(z.number().int()),
});
export type DeleteMessagesParams = z.infer<typeof DeleteMessagesParamsSchema>;
export const DeleteMessagesResultSchema = z.literal(true);
export type DeleteMessagesResult = z.infer<typeof DeleteMessagesResultSchema>;
export const DeleteMessageReactionParamsSchema = obj({
  chat_id: ChatIdSchema,
  message_id: z.number().int(),
  user_id: z.number().int().optional(),
  actor_chat_id: z.number().int().optional(),
});
export type DeleteMessageReactionParams = z.infer<typeof DeleteMessageReactionParamsSchema>;
export const DeleteMessageReactionResultSchema = z.literal(true);
export type DeleteMessageReactionResult = z.infer<typeof DeleteMessageReactionResultSchema>;
export const DeleteAllMessageReactionsParamsSchema = obj({
  chat_id: ChatIdSchema,
  user_id: z.number().int().optional(),
  actor_chat_id: z.number().int().optional(),
});
export type DeleteAllMessageReactionsParams = z.infer<typeof DeleteAllMessageReactionsParamsSchema>;
export const DeleteAllMessageReactionsResultSchema = z.literal(true);
export type DeleteAllMessageReactionsResult = z.infer<typeof DeleteAllMessageReactionsResultSchema>;
export const SendStickerParamsSchema = obj({
  business_connection_id: z.string().optional(),
  chat_id: ChatIdSchema,
  message_thread_id: z.number().int().optional(),
  direct_messages_topic_id: z.number().int().optional(),
  sticker: z.union([z.custom<unknown>(() => true), z.string()]),
  emoji: z.string().optional(),
  disable_notification: z.boolean().optional(),
  protect_content: z.boolean().optional(),
  allow_paid_broadcast: z.boolean().optional(),
  message_effect_id: z.string().optional(),
  suggested_post_parameters: SuggestedPostParametersSchema.optional(),
  reply_parameters: ReplyParametersSchema.optional(),
  reply_markup: z.union([InlineKeyboardMarkupSchema, ReplyKeyboardMarkupSchema, ReplyKeyboardRemoveSchema, ForceReplySchema]).optional(),
});
export type SendStickerParams = z.infer<typeof SendStickerParamsSchema>;
export const SendStickerResultSchema = MessageSchema;
export type SendStickerResult = z.infer<typeof SendStickerResultSchema>;
export const GetStickerSetParamsSchema = obj({
  name: z.string(),
});
export type GetStickerSetParams = z.infer<typeof GetStickerSetParamsSchema>;
export const GetStickerSetResultSchema = z.unknown();
export type GetStickerSetResult = z.infer<typeof GetStickerSetResultSchema>;
export const GetCustomEmojiStickersParamsSchema = obj({
  custom_emoji_ids: z.array(z.string()),
});
export type GetCustomEmojiStickersParams = z.infer<typeof GetCustomEmojiStickersParamsSchema>;
export const GetCustomEmojiStickersResultSchema = z.array(StickerSchema);
export type GetCustomEmojiStickersResult = z.infer<typeof GetCustomEmojiStickersResultSchema>;
export const UploadStickerFileParamsSchema = obj({
  user_id: z.number().int(),
  sticker: z.custom<unknown>(() => true),
  sticker_format: z.enum(["static", "animated", "video"]),
});
export type UploadStickerFileParams = z.infer<typeof UploadStickerFileParamsSchema>;
export const UploadStickerFileResultSchema = z.unknown();
export type UploadStickerFileResult = z.infer<typeof UploadStickerFileResultSchema>;
export const CreateNewStickerSetParamsSchema = obj({
  user_id: z.number().int(),
  name: z.string(),
  title: z.string(),
  stickers: z.array(InputStickerSchema),
  sticker_type: z.string().optional(),
  needs_repainting: z.boolean().optional(),
});
export type CreateNewStickerSetParams = z.infer<typeof CreateNewStickerSetParamsSchema>;
export const CreateNewStickerSetResultSchema = z.literal(true);
export type CreateNewStickerSetResult = z.infer<typeof CreateNewStickerSetResultSchema>;
export const AddStickerToSetParamsSchema = obj({
  user_id: z.number().int(),
  name: z.string(),
  sticker: InputStickerSchema,
});
export type AddStickerToSetParams = z.infer<typeof AddStickerToSetParamsSchema>;
export const AddStickerToSetResultSchema = z.literal(true);
export type AddStickerToSetResult = z.infer<typeof AddStickerToSetResultSchema>;
export const SetStickerPositionInSetParamsSchema = obj({
  sticker: z.string(),
  position: z.number().int(),
});
export type SetStickerPositionInSetParams = z.infer<typeof SetStickerPositionInSetParamsSchema>;
export const SetStickerPositionInSetResultSchema = z.literal(true);
export type SetStickerPositionInSetResult = z.infer<typeof SetStickerPositionInSetResultSchema>;
export const DeleteStickerFromSetParamsSchema = obj({
  sticker: z.string(),
});
export type DeleteStickerFromSetParams = z.infer<typeof DeleteStickerFromSetParamsSchema>;
export const DeleteStickerFromSetResultSchema = z.literal(true);
export type DeleteStickerFromSetResult = z.infer<typeof DeleteStickerFromSetResultSchema>;
export const ReplaceStickerInSetParamsSchema = obj({
  user_id: z.number().int(),
  name: z.string(),
  old_sticker: z.string(),
  sticker: InputStickerSchema,
});
export type ReplaceStickerInSetParams = z.infer<typeof ReplaceStickerInSetParamsSchema>;
export const ReplaceStickerInSetResultSchema = z.literal(true);
export type ReplaceStickerInSetResult = z.infer<typeof ReplaceStickerInSetResultSchema>;
export const SetStickerEmojiListParamsSchema = obj({
  sticker: z.string(),
  emoji_list: z.array(z.string()),
});
export type SetStickerEmojiListParams = z.infer<typeof SetStickerEmojiListParamsSchema>;
export const SetStickerEmojiListResultSchema = z.literal(true);
export type SetStickerEmojiListResult = z.infer<typeof SetStickerEmojiListResultSchema>;
export const SetStickerKeywordsParamsSchema = obj({
  sticker: z.string(),
  keywords: z.array(z.string()).optional(),
});
export type SetStickerKeywordsParams = z.infer<typeof SetStickerKeywordsParamsSchema>;
export const SetStickerKeywordsResultSchema = z.literal(true);
export type SetStickerKeywordsResult = z.infer<typeof SetStickerKeywordsResultSchema>;
export const SetStickerMaskPositionParamsSchema = obj({
  sticker: z.string(),
  mask_position: MaskPositionSchema.optional(),
});
export type SetStickerMaskPositionParams = z.infer<typeof SetStickerMaskPositionParamsSchema>;
export const SetStickerMaskPositionResultSchema = z.literal(true);
export type SetStickerMaskPositionResult = z.infer<typeof SetStickerMaskPositionResultSchema>;
export const SetStickerSetTitleParamsSchema = obj({
  name: z.string(),
  title: z.string(),
});
export type SetStickerSetTitleParams = z.infer<typeof SetStickerSetTitleParamsSchema>;
export const SetStickerSetTitleResultSchema = z.literal(true);
export type SetStickerSetTitleResult = z.infer<typeof SetStickerSetTitleResultSchema>;
export const SetStickerSetThumbnailParamsSchema = obj({
  name: z.string(),
  user_id: z.number().int(),
  thumbnail: z.union([z.custom<unknown>(() => true), z.string()]).optional(),
  format: z.enum(["static", "animated", "video"]),
});
export type SetStickerSetThumbnailParams = z.infer<typeof SetStickerSetThumbnailParamsSchema>;
export const SetStickerSetThumbnailResultSchema = z.literal(true);
export type SetStickerSetThumbnailResult = z.infer<typeof SetStickerSetThumbnailResultSchema>;
export const SetCustomEmojiStickerSetThumbnailParamsSchema = obj({
  name: z.string(),
  custom_emoji_id: z.string().optional(),
});
export type SetCustomEmojiStickerSetThumbnailParams = z.infer<typeof SetCustomEmojiStickerSetThumbnailParamsSchema>;
export const SetCustomEmojiStickerSetThumbnailResultSchema = z.literal(true);
export type SetCustomEmojiStickerSetThumbnailResult = z.infer<typeof SetCustomEmojiStickerSetThumbnailResultSchema>;
export const DeleteStickerSetParamsSchema = obj({
  name: z.string(),
});
export type DeleteStickerSetParams = z.infer<typeof DeleteStickerSetParamsSchema>;
export const DeleteStickerSetResultSchema = z.literal(true);
export type DeleteStickerSetResult = z.infer<typeof DeleteStickerSetResultSchema>;
export const AnswerInlineQueryParamsSchema = obj({
  inline_query_id: z.string(),
  results: z.array(InlineQueryResultSchema),
  cache_time: z.number().int().optional(),
  is_personal: z.boolean().optional(),
  next_offset: z.string().optional(),
  button: InlineQueryResultsButtonSchema.optional(),
});
export type AnswerInlineQueryParams = z.infer<typeof AnswerInlineQueryParamsSchema>;
export const AnswerInlineQueryResultSchema = z.literal(true);
export type AnswerInlineQueryResult = z.infer<typeof AnswerInlineQueryResultSchema>;
export const SendInvoiceParamsSchema = obj({
  chat_id: ChatIdSchema,
  message_thread_id: z.number().int().optional(),
  direct_messages_topic_id: z.number().int().optional(),
  title: z.string(),
  description: z.string(),
  payload: z.string(),
  provider_token: z.string().optional(),
  currency: z.string(),
  prices: z.array(LabeledPriceSchema),
  max_tip_amount: z.number().int().optional(),
  suggested_tip_amounts: z.array(z.number().int()).optional(),
  start_parameter: z.string().optional(),
  provider_data: z.string().optional(),
  photo_url: z.string().optional(),
  photo_size: z.number().int().optional(),
  photo_width: z.number().int().optional(),
  photo_height: z.number().int().optional(),
  need_name: z.boolean().optional(),
  need_phone_number: z.boolean().optional(),
  need_email: z.boolean().optional(),
  need_shipping_address: z.boolean().optional(),
  send_phone_number_to_provider: z.boolean().optional(),
  send_email_to_provider: z.boolean().optional(),
  is_flexible: z.boolean().optional(),
  disable_notification: z.boolean().optional(),
  protect_content: z.boolean().optional(),
  allow_paid_broadcast: z.boolean().optional(),
  message_effect_id: z.string().optional(),
  suggested_post_parameters: SuggestedPostParametersSchema.optional(),
  reply_parameters: ReplyParametersSchema.optional(),
  reply_markup: InlineKeyboardMarkupSchema.optional(),
});
export type SendInvoiceParams = z.infer<typeof SendInvoiceParamsSchema>;
export const SendInvoiceResultSchema = MessageSchema;
export type SendInvoiceResult = z.infer<typeof SendInvoiceResultSchema>;
export const CreateInvoiceLinkParamsSchema = obj({
  business_connection_id: z.string().optional(),
  title: z.string(),
  description: z.string(),
  payload: z.string(),
  provider_token: z.string().optional(),
  currency: z.string(),
  prices: z.array(LabeledPriceSchema),
  subscription_period: z.number().int().optional(),
  max_tip_amount: z.number().int().optional(),
  suggested_tip_amounts: z.array(z.number().int()).optional(),
  provider_data: z.string().optional(),
  photo_url: z.string().optional(),
  photo_size: z.number().int().optional(),
  photo_width: z.number().int().optional(),
  photo_height: z.number().int().optional(),
  need_name: z.boolean().optional(),
  need_phone_number: z.boolean().optional(),
  need_email: z.boolean().optional(),
  need_shipping_address: z.boolean().optional(),
  send_phone_number_to_provider: z.boolean().optional(),
  send_email_to_provider: z.boolean().optional(),
  is_flexible: z.boolean().optional(),
});
export type CreateInvoiceLinkParams = z.infer<typeof CreateInvoiceLinkParamsSchema>;
export const CreateInvoiceLinkResultSchema = z.unknown();
export type CreateInvoiceLinkResult = z.infer<typeof CreateInvoiceLinkResultSchema>;
export const AnswerShippingQueryParamsSchema = obj({
  shipping_query_id: z.string(),
  ok: z.boolean(),
  shipping_options: z.array(ShippingOptionSchema).optional(),
  error_message: z.string().optional(),
});
export type AnswerShippingQueryParams = z.infer<typeof AnswerShippingQueryParamsSchema>;
export const AnswerShippingQueryResultSchema = z.literal(true);
export type AnswerShippingQueryResult = z.infer<typeof AnswerShippingQueryResultSchema>;
export const AnswerPreCheckoutQueryParamsSchema = obj({
  pre_checkout_query_id: z.string(),
  ok: z.boolean(),
  error_message: z.string().optional(),
});
export type AnswerPreCheckoutQueryParams = z.infer<typeof AnswerPreCheckoutQueryParamsSchema>;
export const AnswerPreCheckoutQueryResultSchema = z.literal(true);
export type AnswerPreCheckoutQueryResult = z.infer<typeof AnswerPreCheckoutQueryResultSchema>;
export const GetMyStarBalanceParamsSchema = obj({});
export type GetMyStarBalanceParams = z.infer<typeof GetMyStarBalanceParamsSchema>;
export const GetMyStarBalanceResultSchema = z.unknown();
export type GetMyStarBalanceResult = z.infer<typeof GetMyStarBalanceResultSchema>;
export const GetStarTransactionsParamsSchema = obj({
  offset: z.number().int().optional(),
  limit: z.number().int().optional(),
});
export type GetStarTransactionsParams = z.infer<typeof GetStarTransactionsParamsSchema>;
export const GetStarTransactionsResultSchema = z.unknown();
export type GetStarTransactionsResult = z.infer<typeof GetStarTransactionsResultSchema>;
export const RefundStarPaymentParamsSchema = obj({
  user_id: z.number().int(),
  telegram_payment_charge_id: z.string(),
});
export type RefundStarPaymentParams = z.infer<typeof RefundStarPaymentParamsSchema>;
export const RefundStarPaymentResultSchema = z.literal(true);
export type RefundStarPaymentResult = z.infer<typeof RefundStarPaymentResultSchema>;
export const EditUserStarSubscriptionParamsSchema = obj({
  user_id: z.number().int(),
  telegram_payment_charge_id: z.string(),
  is_canceled: z.boolean(),
});
export type EditUserStarSubscriptionParams = z.infer<typeof EditUserStarSubscriptionParamsSchema>;
export const EditUserStarSubscriptionResultSchema = z.literal(true);
export type EditUserStarSubscriptionResult = z.infer<typeof EditUserStarSubscriptionResultSchema>;
export const SetPassportDataErrorsParamsSchema = obj({
  user_id: z.number().int(),
  errors: z.array(PassportElementErrorSchema),
});
export type SetPassportDataErrorsParams = z.infer<typeof SetPassportDataErrorsParamsSchema>;
export const SetPassportDataErrorsResultSchema = z.literal(true);
export type SetPassportDataErrorsResult = z.infer<typeof SetPassportDataErrorsResultSchema>;
export const SendGameParamsSchema = obj({
  business_connection_id: z.string().optional(),
  chat_id: ChatIdSchema,
  message_thread_id: z.number().int().optional(),
  game_short_name: z.string(),
  disable_notification: z.boolean().optional(),
  protect_content: z.boolean().optional(),
  allow_paid_broadcast: z.boolean().optional(),
  message_effect_id: z.string().optional(),
  reply_parameters: ReplyParametersSchema.optional(),
  reply_markup: InlineKeyboardMarkupSchema.optional(),
});
export type SendGameParams = z.infer<typeof SendGameParamsSchema>;
export const SendGameResultSchema = MessageSchema;
export type SendGameResult = z.infer<typeof SendGameResultSchema>;
export const SetGameScoreParamsSchema = obj({
  user_id: z.number().int(),
  score: z.number().int(),
  force: z.boolean().optional(),
  disable_edit_message: z.boolean().optional(),
  chat_id: z.number().int().optional(),
  message_id: z.number().int().optional(),
  inline_message_id: z.string().optional(),
});
export type SetGameScoreParams = z.infer<typeof SetGameScoreParamsSchema>;
export const SetGameScoreResultSchema = z.unknown();
export type SetGameScoreResult = z.infer<typeof SetGameScoreResultSchema>;
export const GetGameHighScoresParamsSchema = obj({
  user_id: z.number().int(),
  chat_id: z.number().int().optional(),
  message_id: z.number().int().optional(),
  inline_message_id: z.string().optional(),
});
export type GetGameHighScoresParams = z.infer<typeof GetGameHighScoresParamsSchema>;
export const GetGameHighScoresResultSchema = z.array(GameHighScoreSchema);
export type GetGameHighScoresResult = z.infer<typeof GetGameHighScoresResultSchema>;

// Generic envelope wrapping every Telegram HTTP response.
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
