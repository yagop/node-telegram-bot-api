// Telegram Bot API Types
// Based on the official Telegram Bot API documentation

/**
 * Represents a Telegram user or bot.
 * @see https://core.telegram.org/bots/api#user
 */
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

/**
 * Represents a Telegram chat (private, group, supergroup, or channel).
 * @see https://core.telegram.org/bots/api#chat
 */
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

/**
 * Represents a message in a Telegram chat.
 * @see https://core.telegram.org/bots/api#message
 */
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

/**
 * Represents a special entity in a text message (e.g., hashtag, mention, URL).
 * @see https://core.telegram.org/bots/api#messageentity
 */
export interface MessageEntity {
  type: MessageEntityType;
  offset: number;
  length: number;
  url?: string;
  user?: User;
  language?: string;
}

/**
 * Type of message entity (mention, hashtag, bold, etc.).
 * @see https://core.telegram.org/bots/api#messageentity
 */
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

/**
 * Represents one size of a photo or a file/sticker thumbnail.
 * @see https://core.telegram.org/bots/api#photosize
 */
export interface PhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

/**
 * Represents an animation file (GIF or H.264/MPEG-4 AVC video without sound).
 * @see https://core.telegram.org/bots/api#animation
 */
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

/**
 * Represents an audio file to be treated as music.
 * @see https://core.telegram.org/bots/api#audio
 */
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

/**
 * Represents a general file (as opposed to photos, voice messages, and audio files).
 * @see https://core.telegram.org/bots/api#document
 */
export interface Document {
  file_id: string;
  file_unique_id: string;
  thumb?: PhotoSize;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

/**
 * Represents a video file.
 * @see https://core.telegram.org/bots/api#video
 */
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

/**
 * Represents a video message (available in Telegram apps as of v.4.0).
 * @see https://core.telegram.org/bots/api#videonote
 */
export interface VideoNote {
  file_id: string;
  file_unique_id: string;
  length: number;
  duration: number;
  thumb?: PhotoSize;
  file_size?: number;
}

/**
 * Represents a voice note.
 * @see https://core.telegram.org/bots/api#voice
 */
export interface Voice {
  file_id: string;
  file_unique_id: string;
  duration: number;
  mime_type?: string;
  file_size?: number;
}

/**
 * Represents a phone contact.
 * @see https://core.telegram.org/bots/api#contact
 */
export interface Contact {
  phone_number: string;
  first_name: string;
  last_name?: string;
  user_id?: number;
  vcard?: string;
}

/**
 * Represents an animated emoji that displays a random value.
 * @see https://core.telegram.org/bots/api#dice
 */
export interface Dice {
  emoji: string;
  value: number;
}

/**
 * Contains information about one answer option in a poll.
 * @see https://core.telegram.org/bots/api#polloption
 */
export interface PollOption {
  text: string;
  voter_count: number;
}

/**
 * Represents an answer of a user in a non-anonymous poll.
 * @see https://core.telegram.org/bots/api#pollanswer
 */
export interface PollAnswer {
  poll_id: string;
  user: User;
  option_ids: number[];
}

/**
 * Contains information about a poll.
 * @see https://core.telegram.org/bots/api#poll
 */
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

/**
 * Represents a point on the map.
 * @see https://core.telegram.org/bots/api#location
 */
export interface Location {
  longitude: number;
  latitude: number;
  horizontal_accuracy?: number;
  live_period?: number;
  heading?: number;
  proximity_alert_radius?: number;
}

/**
 * Represents a venue (location with name and address).
 * @see https://core.telegram.org/bots/api#venue
 */
export interface Venue {
  location: Location;
  title: string;
  address: string;
  foursquare_id?: string;
  foursquare_type?: string;
  google_place_id?: string;
  google_place_type?: string;
}

/**
 * Describes data sent from a Web App to the bot.
 * @see https://core.telegram.org/bots/api#webappdata
 */
export interface WebAppData {
  data: string;
  button_text: string;
}

/**
 * Represents the content of a service message about a user triggering a proximity alert.
 * @see https://core.telegram.org/bots/api#proximityalerttriggered
 */
export interface ProximityAlertTriggered {
  traveler: User;
  watcher: User;
  distance: number;
}

/**
 * Represents a service message about a change in auto-delete timer settings.
 * @see https://core.telegram.org/bots/api#messageautodeletetimerchanged
 */
export interface MessageAutoDeleteTimerChanged {
  message_auto_delete_time: number;
}

/**
 * Represents a service message about a video chat scheduled in the chat.
 * @see https://core.telegram.org/bots/api#videochatscheduled
 */
export interface VideoChatScheduled {
  start_date: number;
}

/**
 * Represents a service message about a video chat started in the chat.
 * @see https://core.telegram.org/bots/api#videochatstarted
 */
export interface VideoChatStarted {} // eslint-disable-line @typescript-eslint/no-empty-object-type

/**
 * Represents a service message about a video chat ended in the chat.
 * @see https://core.telegram.org/bots/api#videochatended
 */
export interface VideoChatEnded {
  duration: number;
}

/**
 * Represents a service message about new members invited to a video chat.
 * @see https://core.telegram.org/bots/api#videochatparticipantsinvited
 */
export interface VideoChatParticipantsInvited {
  users: User[];
}

/**
 * Represents a user's profile pictures.
 * @see https://core.telegram.org/bots/api#userprofilephotos
 */
export interface UserProfilePhotos {
  total_count: number;
  photos: PhotoSize[][];
}

/**
 * Represents a file ready to be downloaded.
 * @see https://core.telegram.org/bots/api#file
 */
export interface File {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  file_path?: string;
}

/**
 * Describes a Web App.
 * @see https://core.telegram.org/bots/api#webappinfo
 */
export interface WebApp {
  url: string;
}

/**
 * Represents a custom keyboard with reply options.
 * @see https://core.telegram.org/bots/api#replykeyboardmarkup
 */
export interface ReplyKeyboardMarkup {
  keyboard: KeyboardButton[][];
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
  input_field_placeholder?: string;
  selective?: boolean;
}

/**
 * Represents one button of the reply keyboard.
 * @see https://core.telegram.org/bots/api#keyboardbutton
 */
export interface KeyboardButton {
  text: string;
  request_contact?: boolean;
  request_location?: boolean;
  request_poll?: KeyboardButtonPollType;
  web_app?: WebApp;
}

/**
 * Represents type of a poll allowed to be created with a keyboard button.
 * @see https://core.telegram.org/bots/api#keyboardbuttonpolltype
 */
export interface KeyboardButtonPollType {
  type?: 'quiz' | 'regular';
}

/**
 * Requests clients to remove the current custom keyboard.
 * @see https://core.telegram.org/bots/api#replykeyboardremove
 */
export interface ReplyKeyboardRemove {
  remove_keyboard: true;
  selective?: boolean;
}

/**
 * Represents an inline keyboard that appears right next to the message.
 * @see https://core.telegram.org/bots/api#inlinekeyboardmarkup
 */
export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

/**
 * Represents one button of an inline keyboard.
 * @see https://core.telegram.org/bots/api#inlinekeyboardbutton
 */
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

/**
 * Represents a parameter of the inline keyboard button used to automatically authorize a user.
 * @see https://core.telegram.org/bots/api#loginurl
 */
export interface LoginUrl {
  url: string;
  forward_text?: string;
  bot_username?: string;
  request_write_access?: boolean;
}

/**
 * Represents an incoming callback query from a callback button in an inline keyboard.
 * @see https://core.telegram.org/bots/api#callbackquery
 */
export interface CallbackQuery {
  id: string;
  from: User;
  message?: Message;
  inline_message_id?: string;
  chat_instance: string;
  data?: string;
  game_short_name?: string;
}

/**
 * Forces the user to reply to the bot's message.
 * @see https://core.telegram.org/bots/api#forcereply
 */
export interface ForceReply {
  force_reply: true;
  input_field_placeholder?: string;
  selective?: boolean;
}

/**
 * Represents a chat photo.
 * @see https://core.telegram.org/bots/api#chatphoto
 */
export interface ChatPhoto {
  small_file_id: string;
  small_file_unique_id: string;
  big_file_id: string;
  big_file_unique_id: string;
}

/**
 * Represents an invite link for a chat.
 * @see https://core.telegram.org/bots/api#chatinvitelink
 */
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

/**
 * Represents the rights of an administrator in a chat.
 * @see https://core.telegram.org/bots/api#chatadministratorrights
 */
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

/**
 * Contains information about one member of a chat.
 * @see https://core.telegram.org/bots/api#chatmember
 */
export interface ChatMember {
  status: ChatMemberStatus;
  user: User;
}

/**
 * Represents a chat member that owns the chat.
 * @see https://core.telegram.org/bots/api#chatmemberowner
 */
export interface ChatMemberOwner extends ChatMember {
  status: 'creator';
  is_anonymous: boolean;
}

/**
 * Represents a chat member that has administrative privileges.
 * @see https://core.telegram.org/bots/api#chatmemberadministrator
 */
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

/**
 * Represents a chat member that has no additional privileges or restrictions.
 * @see https://core.telegram.org/bots/api#chatmembermember
 */
export interface ChatMemberMember extends ChatMember {
  status: 'member';
}

/**
 * Represents a chat member that is restricted in the chat.
 * @see https://core.telegram.org/bots/api#chatmemberrestricted
 */
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

/**
 * Represents a chat member that isn't currently a member of the chat but may join.
 * @see https://core.telegram.org/bots/api#chatmemberleft
 */
export interface ChatMemberLeft extends ChatMember {
  status: 'left';
}

/**
 * Represents a chat member that was banned in the chat.
 * @see https://core.telegram.org/bots/api#chatmemberbanned
 */
export interface ChatMemberBanned extends ChatMember {
  status: 'kicked';
  until_date: number;
}

/**
 * Chat member status indicating the role of a user in a chat.
 * @see https://core.telegram.org/bots/api#chatmember
 */
export type ChatMemberStatus =
  | 'creator'
  | 'administrator'
  | 'member'
  | 'restricted'
  | 'left'
  | 'kicked';

/**
 * Represents changes in the status of a chat member.
 * @see https://core.telegram.org/bots/api#chatmemberupdated
 */
export interface ChatMemberUpdated {
  chat: Chat;
  from: User;
  date: number;
  old_chat_member: ChatMember;
  new_chat_member: ChatMember;
  invite_link?: ChatInviteLink;
}

/**
 * Represents a join request sent to a chat.
 * @see https://core.telegram.org/bots/api#chatjoinrequest
 */
export interface ChatJoinRequest {
  chat: Chat;
  from: User;
  date: number;
  bio?: string;
  invite_link?: ChatInviteLink;
}

/**
 * Describes actions that a non-administrator user is allowed to take in a chat.
 * @see https://core.telegram.org/bots/api#chatpermissions
 */
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

/**
 * Represents a location to which a chat is connected.
 * @see https://core.telegram.org/bots/api#chatlocation
 */
export interface ChatLocation {
  location: Location;
  address: string;
}

/**
 * Represents a bot command.
 * @see https://core.telegram.org/bots/api#botcommand
 */
export interface BotCommand {
  command: string;
  description: string;
}

/**
 * Describes why a request was unsuccessful.
 * @see https://core.telegram.org/bots/api#responseparameters
 */
export interface ResponseParameters {
  migrate_to_chat_id?: number;
  retry_after?: number;
}

/**
 * Represents the content of a media message to be sent.
 * @see https://core.telegram.org/bots/api#inputmedia
 */
export interface InputMedia {
  type: string;
  media: string;
  caption?: string;
  parse_mode?: ParseMode;
  caption_entities?: MessageEntity[];
}

/**
 * Represents a photo to be sent.
 * @see https://core.telegram.org/bots/api#inputmediaphoto
 */
export interface InputMediaPhoto extends InputMedia {
  type: 'photo';
}

/**
 * Represents a video to be sent.
 * @see https://core.telegram.org/bots/api#inputmediavideo
 */
export interface InputMediaVideo extends InputMedia {
  type: 'video';
  thumb?: string;
  width?: number;
  height?: number;
  duration?: number;
  supports_streaming?: boolean;
}

/**
 * Represents an animation file (GIF or H.264/MPEG-4 AVC video without sound) to be sent.
 * @see https://core.telegram.org/bots/api#inputmediaanimation
 */
export interface InputMediaAnimation extends InputMedia {
  type: 'animation';
  thumb?: string;
  width?: number;
  height?: number;
  duration?: number;
}

/**
 * Represents an audio file to be treated as music to be sent.
 * @see https://core.telegram.org/bots/api#inputmediaaudio
 */
export interface InputMediaAudio extends InputMedia {
  type: 'audio';
  thumb?: string;
  duration?: number;
  performer?: string;
  title?: string;
}

/**
 * Represents a general file to be sent.
 * @see https://core.telegram.org/bots/api#inputmediadocument
 */
export interface InputMediaDocument extends InputMedia {
  type: 'document';
  thumb?: string;
  disable_content_type_detection?: boolean;
}

/**
 * Represents the contents of a file to be uploaded.
 * @see https://core.telegram.org/bots/api#inputfile
 */
export interface InputFile {
  filename?: string;
  contentType?: string;
  knownLength?: number;
}

/**
 * Represents a sticker.
 * @see https://core.telegram.org/bots/api#sticker
 */
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

/**
 * Represents a sticker set.
 * @see https://core.telegram.org/bots/api#stickerset
 */
export interface StickerSet {
  name: string;
  title: string;
  is_animated: boolean;
  is_video: boolean;
  contains_masks: boolean;
  stickers: Sticker[];
  thumb?: PhotoSize;
}

/**
 * Describes the position on faces where a mask should be placed.
 * @see https://core.telegram.org/bots/api#maskposition
 */
export interface MaskPosition {
  point: 'forehead' | 'eyes' | 'mouth' | 'chin';
  x_shift: number;
  y_shift: number;
  scale: number;
}

/**
 * Represents an incoming inline query.
 * @see https://core.telegram.org/bots/api#inlinequery
 */
export interface InlineQuery {
  id: string;
  from: User;
  query: string;
  offset: string;
  chat_type?: 'sender' | 'private' | 'group' | 'supergroup' | 'channel';
  location?: Location;
}

/**
 * Represents one result of an inline query.
 * @see https://core.telegram.org/bots/api#inlinequeryresult
 */
export interface InlineQueryResult {
  type: string;
  id: string;
}

/**
 * Represents a result of an inline query that was chosen by the user and sent to their chat partner.
 * @see https://core.telegram.org/bots/api#choseninlineresult
 */
export interface ChosenInlineResult {
  result_id: string;
  from: User;
  location?: Location;
  inline_message_id?: string;
  query: string;
}

/**
 * Contains information about an incoming shipping query.
 * @see https://core.telegram.org/bots/api#shippingquery
 */
export interface ShippingQuery {
  id: string;
  from: User;
  invoice_payload: string;
  shipping_address: ShippingAddress;
}

/**
 * Contains information about an incoming pre-checkout query.
 * @see https://core.telegram.org/bots/api#precheckoutquery
 */
export interface PreCheckoutQuery {
  id: string;
  from: User;
  currency: string;
  total_amount: number;
  invoice_payload: string;
  shipping_option_id?: string;
  order_info?: OrderInfo;
}

/**
 * Describes Telegram Passport data shared with the bot by the user.
 * @see https://core.telegram.org/bots/api#passportdata
 */
export interface PassportData {
  data: EncryptedPassportElement[];
  credentials: EncryptedCredentials;
}

/**
 * Represents a file uploaded to Telegram Passport.
 * @see https://core.telegram.org/bots/api#passportfile
 */
export interface PassportFile {
  file_id: string;
  file_unique_id: string;
  file_size: number;
  file_date: number;
}

/**
 * Describes documents or other Telegram Passport elements shared with the bot.
 * @see https://core.telegram.org/bots/api#encryptedpassportelement
 */
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

/**
 * Describes data required for decrypting and authenticating EncryptedPassportElement.
 * @see https://core.telegram.org/bots/api#encryptedcredentials
 */
export interface EncryptedCredentials {
  data: string;
  hash: string;
  secret: string;
}

/**
 * Represents an error in the Telegram Passport element.
 * @see https://core.telegram.org/bots/api#passportelementerror
 */
export interface PassportElementError {
  source: string;
  type: string;
  message: string;
}

/**
 * Represents a game.
 * @see https://core.telegram.org/bots/api#game
 */
export interface Game {
  title: string;
  description: string;
  photo: PhotoSize[];
  text?: string;
  text_entities?: MessageEntity[];
  animation?: Animation;
}

/**
 * A placeholder for the CallbackGame type (currently holds no information).
 * @see https://core.telegram.org/bots/api#callbackgame
 */
export interface CallbackGame {} // eslint-disable-line @typescript-eslint/no-empty-object-type

/**
 * Represents one row of the high scores table for a game.
 * @see https://core.telegram.org/bots/api#gamehighscore
 */
export interface GameHighScore {
  position: number;
  user: User;
  score: number;
}

/**
 * Contains basic information about an invoice.
 * @see https://core.telegram.org/bots/api#invoice
 */
export interface Invoice {
  title: string;
  description: string;
  start_parameter: string;
  currency: string;
  total_amount: number;
}

/**
 * Represents a shipping address.
 * @see https://core.telegram.org/bots/api#shippingaddress
 */
export interface ShippingAddress {
  country_code: string;
  state: string;
  city: string;
  street_line1: string;
  street_line2: string;
  post_code: string;
}

/**
 * Represents information about an order.
 * @see https://core.telegram.org/bots/api#orderinfo
 */
export interface OrderInfo {
  name?: string;
  phone_number?: string;
  email?: string;
  shipping_address?: ShippingAddress;
}

/**
 * Represents one shipping option.
 * @see https://core.telegram.org/bots/api#shippingoption
 */
export interface ShippingOption {
  id: string;
  title: string;
  prices: LabeledPrice[];
}

/**
 * Contains basic information about a successful payment.
 * @see https://core.telegram.org/bots/api#successfulpayment
 */
export interface SuccessfulPayment {
  currency: string;
  total_amount: number;
  invoice_payload: string;
  shipping_option_id?: string;
  order_info?: OrderInfo;
  telegram_payment_charge_id: string;
  provider_payment_charge_id: string;
}

/**
 * Contains information about an incoming shipping query (duplicate declaration).
 * @see https://core.telegram.org/bots/api#shippingquery
 */
export interface ShippingQuery {
  id: string;
  from: User;
  invoice_payload: string;
  shipping_address: ShippingAddress;
}

/**
 * Represents a portion of the price for goods or services.
 * @see https://core.telegram.org/bots/api#labeledprice
 */
export interface LabeledPrice {
  label: string;
  amount: number;
}

/**
 * Represents an incoming update from Telegram.
 * @see https://core.telegram.org/bots/api#update
 */
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

/**
 * Describes the current status of a webhook.
 * @see https://core.telegram.org/bots/api#webhookinfo
 */
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

/**
 * Formatting mode for text messages (Markdown, MarkdownV2, or HTML).
 * @see https://core.telegram.org/bots/api#formatting-options
 */
export type ParseMode = 'Markdown' | 'MarkdownV2' | 'HTML';

/**
 * Type of action to broadcast to the chat (e.g., typing, uploading).
 * @see https://core.telegram.org/bots/api#sendchataction
 */
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
