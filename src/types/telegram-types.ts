// Telegram Bot API Types
// Based on the official Telegram Bot API documentation

export interface User {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}

export interface Chat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo?: ChatPhoto;
  bio?: string;
  has_private_forwards?: boolean;
  description?: string;
  invite_link?: string;
  pinned_message?: Message;
  permissions?: ChatPermissions;
  slow_mode_delay?: number;
  message_auto_delete_time?: number;
  has_protected_content?: boolean;
  sticker_set_name?: string;
  can_set_sticker_set?: boolean;
  linked_chat_id?: number;
  location?: ChatLocation;
}

export interface Message {
  message_id: number;
  from?: User;
  sender_chat?: Chat;
  date: number;
  chat: Chat;
  forward_from?: User;
  forward_from_chat?: Chat;
  forward_from_message_id?: number;
  forward_signature?: string;
  forward_sender_name?: string;
  forward_date?: number;
  is_automatic_forward?: boolean;
  reply_to_message?: Message;
  via_bot?: User;
  edit_date?: number;
  has_protected_content?: boolean;
  media_group_id?: string;
  author_signature?: string;
  text?: string;
  entities?: MessageEntity[];
  animation?: Animation;
  audio?: Audio;
  document?: Document;
  photo?: PhotoSize[];
  sticker?: Sticker;
  video?: Video;
  video_note?: VideoNote;
  voice?: Voice;
  caption?: string;
  caption_entities?: MessageEntity[];
  contact?: Contact;
  dice?: Dice;
  game?: Game;
  poll?: Poll;
  venue?: Venue;
  location?: Location;
  new_chat_members?: User[];
  left_chat_member?: User;
  new_chat_title?: string;
  new_chat_photo?: PhotoSize[];
  delete_chat_photo?: boolean;
  group_chat_created?: boolean;
  supergroup_chat_created?: boolean;
  channel_chat_created?: boolean;
  message_auto_delete_timer_changed?: MessageAutoDeleteTimerChanged;
  migrate_to_chat_id?: number;
  migrate_from_chat_id?: number;
  pinned_message?: Message;
  invoice?: Invoice;
  successful_payment?: SuccessfulPayment;
  connected_website?: string;
  passport_data?: PassportData;
  proximity_alert_triggered?: ProximityAlertTriggered;
  video_chat_scheduled?: VideoChatScheduled;
  video_chat_started?: VideoChatStarted;
  video_chat_ended?: VideoChatEnded;
  video_chat_participants_invited?: VideoChatParticipantsInvited;
  web_app_data?: WebAppData;
  reply_markup?: InlineKeyboardMarkup;
}

export interface MessageEntity {
  type: MessageEntityType;
  offset: number;
  length: number;
  url?: string;
  user?: User;
  language?: string;
}

export type MessageEntityType =
  | 'mention'
  | 'hashtag'
  | 'cashtag'
  | 'bot_command'
  | 'url'
  | 'email'
  | 'phone_number'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'spoiler'
  | 'code'
  | 'pre'
  | 'text_link'
  | 'text_mention';

export interface PhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface Animation {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  duration: number;
  thumb?: PhotoSize;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface Audio {
  file_id: string;
  file_unique_id: string;
  duration: number;
  performer?: string;
  title?: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
  thumb?: PhotoSize;
}

export interface Document {
  file_id: string;
  file_unique_id: string;
  thumb?: PhotoSize;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface Video {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  duration: number;
  thumb?: PhotoSize;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface VideoNote {
  file_id: string;
  file_unique_id: string;
  length: number;
  duration: number;
  thumb?: PhotoSize;
  file_size?: number;
}

export interface Voice {
  file_id: string;
  file_unique_id: string;
  duration: number;
  mime_type?: string;
  file_size?: number;
}

export interface Contact {
  phone_number: string;
  first_name: string;
  last_name?: string;
  user_id?: number;
  vcard?: string;
}

export interface Dice {
  emoji: string;
  value: number;
}

export interface PollOption {
  text: string;
  voter_count: number;
}

export interface PollAnswer {
  poll_id: string;
  user: User;
  option_ids: number[];
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  total_voter_count: number;
  is_closed: boolean;
  is_anonymous: boolean;
  type: 'regular' | 'quiz';
  allows_multiple_answers: boolean;
  correct_option_id?: number;
  explanation?: string;
  explanation_entities?: MessageEntity[];
  open_period?: number;
  close_date?: number;
}

export interface Location {
  longitude: number;
  latitude: number;
  horizontal_accuracy?: number;
  live_period?: number;
  heading?: number;
  proximity_alert_radius?: number;
}

export interface Venue {
  location: Location;
  title: string;
  address: string;
  foursquare_id?: string;
  foursquare_type?: string;
  google_place_id?: string;
  google_place_type?: string;
}

export interface WebAppData {
  data: string;
  button_text: string;
}

export interface ProximityAlertTriggered {
  traveler: User;
  watcher: User;
  distance: number;
}

export interface MessageAutoDeleteTimerChanged {
  message_auto_delete_time: number;
}

export interface VideoChatScheduled {
  start_date: number;
}

export interface VideoChatStarted {} // eslint-disable-line @typescript-eslint/no-empty-object-type

export interface VideoChatEnded {
  duration: number;
}

export interface VideoChatParticipantsInvited {
  users: User[];
}

export interface UserProfilePhotos {
  total_count: number;
  photos: PhotoSize[][];
}

export interface File {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  file_path?: string;
}

export interface WebApp {
  url: string;
}

export interface ReplyKeyboardMarkup {
  keyboard: KeyboardButton[][];
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
  input_field_placeholder?: string;
  selective?: boolean;
}

export interface KeyboardButton {
  text: string;
  request_contact?: boolean;
  request_location?: boolean;
  request_poll?: KeyboardButtonPollType;
  web_app?: WebApp;
}

export interface KeyboardButtonPollType {
  type?: 'quiz' | 'regular';
}

export interface ReplyKeyboardRemove {
  remove_keyboard: true;
  selective?: boolean;
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

export interface InlineKeyboardButton {
  text: string;
  url?: string;
  login_url?: LoginUrl;
  callback_data?: string;
  web_app?: WebApp;
  switch_inline_query?: string;
  switch_inline_query_current_chat?: string;
  callback_game?: CallbackGame;
  pay?: boolean;
}

export interface LoginUrl {
  url: string;
  forward_text?: string;
  bot_username?: string;
  request_write_access?: boolean;
}

export interface CallbackQuery {
  id: string;
  from: User;
  message?: Message;
  inline_message_id?: string;
  chat_instance: string;
  data?: string;
  game_short_name?: string;
}

export interface ForceReply {
  force_reply: true;
  input_field_placeholder?: string;
  selective?: boolean;
}

export interface ChatPhoto {
  small_file_id: string;
  small_file_unique_id: string;
  big_file_id: string;
  big_file_unique_id: string;
}

export interface ChatInviteLink {
  invite_link: string;
  creator: User;
  creates_join_request: boolean;
  is_primary: boolean;
  is_revoked: boolean;
  name?: string;
  expire_date?: number;
  member_limit?: number;
  pending_join_request_count?: number;
}

export interface ChatAdministratorRights {
  is_anonymous: boolean;
  can_manage_chat: boolean;
  can_delete_messages: boolean;
  can_manage_video_chats: boolean;
  can_restrict_members: boolean;
  can_promote_members: boolean;
  can_change_info: boolean;
  can_invite_users: boolean;
  can_post_messages?: boolean;
  can_edit_messages?: boolean;
  can_pin_messages?: boolean;
}

export interface ChatMember {
  status: ChatMemberStatus;
  user: User;
}

export interface ChatMemberOwner extends ChatMember {
  status: 'creator';
  is_anonymous: boolean;
}

export interface ChatMemberAdministrator extends ChatMember {
  status: 'administrator';
  can_be_edited: boolean;
  can_manage_chat: boolean;
  can_delete_messages: boolean;
  can_manage_video_chats: boolean;
  can_restrict_members: boolean;
  can_promote_members: boolean;
  can_change_info: boolean;
  can_invite_users: boolean;
  can_post_messages?: boolean;
  can_edit_messages?: boolean;
  can_pin_messages?: boolean;
  is_anonymous: boolean;
}

export interface ChatMemberMember extends ChatMember {
  status: 'member';
}

export interface ChatMemberRestricted extends ChatMember {
  status: 'restricted';
  is_member: boolean;
  can_change_info: boolean;
  can_invite_users: boolean;
  can_pin_messages: boolean;
  can_send_messages: boolean;
  can_send_media_messages: boolean;
  can_send_polls: boolean;
  can_send_other_messages: boolean;
  can_add_web_page_previews: boolean;
  until_date: number;
}

export interface ChatMemberLeft extends ChatMember {
  status: 'left';
}

export interface ChatMemberBanned extends ChatMember {
  status: 'kicked';
  until_date: number;
}

export type ChatMemberStatus =
  | 'creator'
  | 'administrator'
  | 'member'
  | 'restricted'
  | 'left'
  | 'kicked';

export interface ChatMemberUpdated {
  chat: Chat;
  from: User;
  date: number;
  old_chat_member: ChatMember;
  new_chat_member: ChatMember;
  invite_link?: ChatInviteLink;
}

export interface ChatJoinRequest {
  chat: Chat;
  from: User;
  date: number;
  bio?: string;
  invite_link?: ChatInviteLink;
}

export interface ChatPermissions {
  can_send_messages?: boolean;
  can_send_media_messages?: boolean;
  can_send_polls?: boolean;
  can_send_other_messages?: boolean;
  can_add_web_page_previews?: boolean;
  can_change_info?: boolean;
  can_invite_users?: boolean;
  can_pin_messages?: boolean;
}

export interface ChatLocation {
  location: Location;
  address: string;
}

export interface BotCommand {
  command: string;
  description: string;
}

export interface ResponseParameters {
  migrate_to_chat_id?: number;
  retry_after?: number;
}

export interface InputMedia {
  type: string;
  media: string;
  caption?: string;
  parse_mode?: ParseMode;
  caption_entities?: MessageEntity[];
}

export interface InputMediaPhoto extends InputMedia {
  type: 'photo';
}

export interface InputMediaVideo extends InputMedia {
  type: 'video';
  thumb?: string;
  width?: number;
  height?: number;
  duration?: number;
  supports_streaming?: boolean;
}

export interface InputMediaAnimation extends InputMedia {
  type: 'animation';
  thumb?: string;
  width?: number;
  height?: number;
  duration?: number;
}

export interface InputMediaAudio extends InputMedia {
  type: 'audio';
  thumb?: string;
  duration?: number;
  performer?: string;
  title?: string;
}

export interface InputMediaDocument extends InputMedia {
  type: 'document';
  thumb?: string;
  disable_content_type_detection?: boolean;
}

export interface InputFile {
  filename?: string;
  contentType?: string;
  knownLength?: number;
}

export interface Sticker {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  is_animated: boolean;
  is_video: boolean;
  thumb?: PhotoSize;
  emoji?: string;
  set_name?: string;
  mask_position?: MaskPosition;
  file_size?: number;
}

export interface StickerSet {
  name: string;
  title: string;
  is_animated: boolean;
  is_video: boolean;
  contains_masks: boolean;
  stickers: Sticker[];
  thumb?: PhotoSize;
}

export interface MaskPosition {
  point: 'forehead' | 'eyes' | 'mouth' | 'chin';
  x_shift: number;
  y_shift: number;
  scale: number;
}

export interface InlineQuery {
  id: string;
  from: User;
  query: string;
  offset: string;
  chat_type?: 'sender' | 'private' | 'group' | 'supergroup' | 'channel';
  location?: Location;
}

export interface InlineQueryResult {
  type: string;
  id: string;
}

export interface ChosenInlineResult {
  result_id: string;
  from: User;
  location?: Location;
  inline_message_id?: string;
  query: string;
}

export interface ShippingQuery {
  id: string;
  from: User;
  invoice_payload: string;
  shipping_address: ShippingAddress;
}

export interface PreCheckoutQuery {
  id: string;
  from: User;
  currency: string;
  total_amount: number;
  invoice_payload: string;
  shipping_option_id?: string;
  order_info?: OrderInfo;
}

export interface PassportData {
  data: EncryptedPassportElement[];
  credentials: EncryptedCredentials;
}

export interface PassportFile {
  file_id: string;
  file_unique_id: string;
  file_size: number;
  file_date: number;
}

export interface EncryptedPassportElement {
  type: string;
  data?: string;
  phone_number?: string;
  email?: string;
  files?: PassportFile[];
  front_side?: PassportFile;
  reverse_side?: PassportFile;
  selfie?: PassportFile;
  translation?: PassportFile[];
  hash: string;
}

export interface EncryptedCredentials {
  data: string;
  hash: string;
  secret: string;
}

export interface PassportElementError {
  source: string;
  type: string;
  message: string;
}

export interface Game {
  title: string;
  description: string;
  photo: PhotoSize[];
  text?: string;
  text_entities?: MessageEntity[];
  animation?: Animation;
}

export interface CallbackGame {} // eslint-disable-line @typescript-eslint/no-empty-object-type

export interface GameHighScore {
  position: number;
  user: User;
  score: number;
}

export interface Invoice {
  title: string;
  description: string;
  start_parameter: string;
  currency: string;
  total_amount: number;
}

export interface ShippingAddress {
  country_code: string;
  state: string;
  city: string;
  street_line1: string;
  street_line2: string;
  post_code: string;
}

export interface OrderInfo {
  name?: string;
  phone_number?: string;
  email?: string;
  shipping_address?: ShippingAddress;
}

export interface ShippingOption {
  id: string;
  title: string;
  prices: LabeledPrice[];
}

export interface SuccessfulPayment {
  currency: string;
  total_amount: number;
  invoice_payload: string;
  shipping_option_id?: string;
  order_info?: OrderInfo;
  telegram_payment_charge_id: string;
  provider_payment_charge_id: string;
}

export interface ShippingQuery {
  id: string;
  from: User;
  invoice_payload: string;
  shipping_address: ShippingAddress;
}

export interface LabeledPrice {
  label: string;
  amount: number;
}

export interface Update {
  update_id: number;
  message?: Message;
  edited_message?: Message;
  channel_post?: Message;
  edited_channel_post?: Message;
  inline_query?: InlineQuery;
  chosen_inline_result?: ChosenInlineResult;
  callback_query?: CallbackQuery;
  shipping_query?: ShippingQuery;
  pre_checkout_query?: PreCheckoutQuery;
  poll?: Poll;
  poll_answer?: PollAnswer;
  my_chat_member?: ChatMemberUpdated;
  chat_member?: ChatMemberUpdated;
  chat_join_request?: ChatJoinRequest;
}

export interface WebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  ip_address?: string;
  last_error_date?: number;
  last_error_message?: string;
  last_synchronization_error_date?: number;
  max_connections?: number;
  allowed_updates?: string[];
}

export type ParseMode = 'Markdown' | 'MarkdownV2' | 'HTML';

export type ChatAction =
  | 'typing'
  | 'upload_photo'
  | 'record_video'
  | 'upload_video'
  | 'record_voice'
  | 'upload_voice'
  | 'upload_document'
  | 'choose_sticker'
  | 'find_location'
  | 'record_video_note'
  | 'upload_video_note';
