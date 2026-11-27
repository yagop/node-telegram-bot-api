/**
 * Per-update Context.
 *
 * Bundles the raw discriminated `update`, the shared `Api`, a mutable `state`
 * bag, and ergonomic shortcuts (`reply`, `answerCallbackQuery`, `editMessageText`) that infer the
 * chat/callback from the update. Typed accessors read each payload via
 * `"key" in update`, mirroring the discriminated-union shape, so they
 * return `T | undefined` without unsafe casts.
 */

import type {
  AnswerCallbackQueryParams,
  AnswerCallbackQueryResult,
  BotFullInfo,
  CallbackQuery,
  Chat,
  EditMessageTextParams,
  EditMessageTextResult,
  InlineQuery,
  Message,
  SendMessageParams,
  SendMessageResult,
  Update,
  UpdateType,
  User,
} from "../types/index.js";
import { UPDATE_TYPES } from "../types/index.js";
import type { Api } from "./api.js";
import { SESSION_STATE_KEY, type SessionHandle } from "./session.js";

/**
 * The single `Update` variant whose payload key is `K` (each `Update` member is
 * `{ update_id: number } & { <K>: <Type> }`, so this narrows to exactly one).
 */
type Variant<K extends UpdateType> = Extract<Update, Record<K, unknown>>;

/**
 * Exhaustive per-variant `chat` resolver. The mapped key type makes this table
 * track the generated `UpdateType` 1:1 - adding a new variant to the `Update`
 * union (regenerate the types) is a *compile error* here until a row is added,
 * so a future payload key can never silently fall through to `undefined`.
 * `UPDATE_TYPES` itself is exhaustiveness-checked in `schemas.ts`, so this is
 * transitively watertight. The per-row parameter is narrowed to that variant,
 * so a wrong field path is *also* a compile error.
 */
const chatOf: { [K in UpdateType]: (u: Variant<K>) => Chat | undefined } = {
  message: (u) => u.message.chat,
  edited_message: (u) => u.edited_message.chat,
  channel_post: (u) => u.channel_post.chat,
  edited_channel_post: (u) => u.edited_channel_post.chat,
  business_connection: () => undefined,
  business_message: (u) => u.business_message.chat,
  edited_business_message: (u) => u.edited_business_message.chat,
  deleted_business_messages: (u) => u.deleted_business_messages.chat,
  guest_message: (u) => u.guest_message.chat,
  message_reaction: (u) => u.message_reaction.chat,
  message_reaction_count: (u) => u.message_reaction_count.chat,
  inline_query: () => undefined,
  chosen_inline_result: () => undefined,
  callback_query: (u) => u.callback_query.message?.chat,
  shipping_query: () => undefined,
  pre_checkout_query: () => undefined,
  purchased_paid_media: () => undefined,
  poll: () => undefined,
  poll_answer: () => undefined,
  my_chat_member: (u) => u.my_chat_member.chat,
  chat_member: (u) => u.chat_member.chat,
  chat_join_request: (u) => u.chat_join_request.chat,
  chat_boost: (u) => u.chat_boost.chat,
  removed_chat_boost: (u) => u.removed_chat_boost.chat,
  managed_bot: () => undefined,
  subscription: () => undefined,
  stopped_message_generation: (u) => u.stopped_message_generation.chat,
  widget_query: (u) => u.widget_query.chat,
  // A shared widget was forwarded elsewhere; the query names no chat.
  shared_widget_query: () => undefined,
};

/**
 * The slice of the incoming message `ctx.reply` copies routing context from.
 * Both `InaccessibleMessage` (a callback button on a message the bot can no
 * longer read) and `BusinessMessagesDeleted` satisfy it structurally, so they
 * need no casts - they simply carry none (or only some) of the optional fields.
 */
type ReplySource = Pick<
  Message,
  | "chat"
  | "business_connection_id"
  | "message_thread_id"
  | "is_topic_message"
  | "direct_messages_topic"
>;

/**
 * Exhaustive per-variant resolver for the message `ctx.reply` answers - the
 * peer of {@link chatOf}. A row returns the payload whose business connection /
 * forum topic / direct-messages topic the reply must stay in, or `undefined`
 * when the variant has no such message (the reply then targets the bare chat).
 * `guest_message` resolves to `undefined` because `ctx.reply` refuses it outright:
 * guest chats are answered via `answerGuestQuery`, not `sendMessage`.
 */
const replySourceOf: { [K in UpdateType]: (u: Variant<K>) => ReplySource | undefined } = {
  message: (u) => u.message,
  edited_message: (u) => u.edited_message,
  channel_post: (u) => u.channel_post,
  edited_channel_post: (u) => u.edited_channel_post,
  business_connection: () => undefined,
  business_message: (u) => u.business_message,
  edited_business_message: (u) => u.edited_business_message,
  deleted_business_messages: (u) => u.deleted_business_messages,
  guest_message: () => undefined,
  message_reaction: () => undefined,
  message_reaction_count: () => undefined,
  inline_query: () => undefined,
  chosen_inline_result: () => undefined,
  callback_query: (u) => u.callback_query.message,
  shipping_query: () => undefined,
  pre_checkout_query: () => undefined,
  purchased_paid_media: () => undefined,
  poll: () => undefined,
  poll_answer: () => undefined,
  my_chat_member: () => undefined,
  chat_member: () => undefined,
  chat_join_request: () => undefined,
  chat_boost: () => undefined,
  removed_chat_boost: () => undefined,
  managed_bot: () => undefined,
  subscription: () => undefined,
  stopped_message_generation: () => undefined,
  widget_query: () => undefined,
  shared_widget_query: () => undefined,
};

/** The slice of the pressed message `ctx.editMessageText` derives its target from. */
type EditSource = Pick<Message, "chat" | "message_id" | "business_connection_id">;

/** The target params `ctx.editMessageText` infers from the pressed message. */
type EditTarget = Pick<EditMessageTextParams, "chat_id" | "message_id" | "business_connection_id">;

/**
 * Derive the target params for an edit of `message`: `chat_id` + `message_id`,
 * plus `business_connection_id` when the message carries one (a business
 * message sent on behalf of a connection). Keys are only set when the source
 * carries them, so a plain-chat edit stays `{ chat_id, message_id, text }`.
 */
function editMessageTextTarget(message: EditSource): EditTarget {
  const target: EditTarget = {
    chat_id: message.chat.id,
    message_id: message.message_id,
  };
  if (message.business_connection_id !== undefined) {
    target.business_connection_id = message.business_connection_id;
  }
  return target;
}

/**
 * What `ctx.reply` sends, minus the target it infers: `text` plus every
 * `sendMessage` option. `chat_id` is never a `reply` param - the chat is inferred
 * (or the reply is an ephemeral callback reply), so it is omitted here. Exported
 * for wrappers that forward reply options.
 */
export type ReplyParams = Omit<SendMessageParams, "chat_id">;

/** The routing params `ctx.reply` infers from the incoming message. */
type ReplyRouting = Pick<
  SendMessageParams,
  "business_connection_id" | "message_thread_id" | "direct_messages_topic_id"
>;

/**
 * Derive the routing params for a reply to `src`. Keys are only set when the
 * source carries them, so a plain-chat reply stays `{ chat_id, text }`.
 * `message_thread_id` is copied only for real forum topics (`is_topic_message`):
 * outside a topic it can name a reply/comment thread, which a reply must not
 * be forced into.
 */
function replyRouting(src: ReplySource | undefined): ReplyRouting {
  const routing: ReplyRouting = {};
  if (!src) {
    return routing;
  }
  if (src.business_connection_id !== undefined) {
    routing.business_connection_id = src.business_connection_id;
  }
  if (src.is_topic_message && src.message_thread_id !== undefined) {
    routing.message_thread_id = src.message_thread_id;
  }
  if (src.direct_messages_topic !== undefined) {
    routing.direct_messages_topic_id = src.direct_messages_topic.topic_id;
  }
  return routing;
}

/**
 * Exhaustive per-variant `from` resolver - the peer of {@link chatOf}, for the
 * `User` who triggered the update. A `User` is not always present (anonymous
 * chat votes on `poll_answer` carry `voter_chat` instead of `user`; channel
 * posts have no `from`); those rows resolve to `undefined`. The user inside a
 * `chat_boost`/`removed_chat_boost` is nested arbitrarily deep in `boost.source`
 * and not a clean "actor", so those rows also resolve to `undefined`.
 */
const fromOf: { [K in UpdateType]: (u: Variant<K>) => User | undefined } = {
  message: (u) => u.message.from,
  edited_message: (u) => u.edited_message.from,
  channel_post: (u) => u.channel_post.from,
  edited_channel_post: (u) => u.edited_channel_post.from,
  business_connection: (u) => u.business_connection.user,
  business_message: (u) => u.business_message.from,
  edited_business_message: (u) => u.edited_business_message.from,
  deleted_business_messages: () => undefined,
  guest_message: (u) => u.guest_message.from,
  message_reaction: (u) => u.message_reaction.user,
  message_reaction_count: () => undefined,
  inline_query: (u) => u.inline_query.from,
  chosen_inline_result: (u) => u.chosen_inline_result.from,
  callback_query: (u) => u.callback_query.from,
  shipping_query: (u) => u.shipping_query.from,
  pre_checkout_query: (u) => u.pre_checkout_query.from,
  purchased_paid_media: (u) => u.purchased_paid_media.from,
  poll: () => undefined,
  // poll_answer.user is unset when a chat (not a user) voted - see PollAnswer.voter_chat.
  poll_answer: (u) => u.poll_answer.user,
  my_chat_member: (u) => u.my_chat_member.from,
  chat_member: (u) => u.chat_member.from,
  chat_join_request: (u) => u.chat_join_request.from,
  chat_boost: () => undefined,
  removed_chat_boost: () => undefined,
  managed_bot: (u) => u.managed_bot.user,
  subscription: (u) => u.subscription.user,
  // MessageGenerationStopped carries only a chat, no acting user.
  stopped_message_generation: () => undefined,
  widget_query: (u) => u.widget_query.from,
  shared_widget_query: (u) => u.shared_widget_query.from,
};

/**
 * Dispatch `update` to the row of `table` whose key is the update's payload key.
 * The runtime `k in update` check establishes the variant; the cast on `table`
 * is the single controlled bridge from the per-row narrowed type to a uniform
 * `(u: Update) => R` (TS can't track the narrowing through the loop variable).
 */
function resolve<K extends UpdateType, R>(
  update: Update,
  table: { [P in K]: (u: Variant<P>) => R }
): R | undefined {
  for (const k of UPDATE_TYPES) {
    if (k in update) {
      return (table as Record<UpdateType, (u: Update) => R>)[k](update);
    }
  }
  return undefined;
}

export class Context {
  readonly update: Update;
  readonly api: Api;
  /** Mutable per-update bag for middleware (sessions, i18n, ...). */
  readonly state: Record<string, unknown> = {};
  /** Set by `command()` (args string) / `hears()` (string or RegExpMatchArray). */
  match?: string | RegExpMatchArray;

  /**
   * Provider for {@link Context.me}. A function (not a captured value) so the
   * `Context` is decoupled from `Bot` and reads whatever identity the bot has
   * learned by the time a handler asks - the bot may only fetch it during
   * `init()`, after the `Context` was constructed.
   */
  private readonly meProvider?: () => BotFullInfo | undefined;

  constructor(update: Update, api: Api, me?: () => BotFullInfo | undefined) {
    this.update = update;
    this.api = api;
    this.meProvider = me;
  }

  // --- typed payload accessors ------------------------------------------------

  get message(): Message | undefined {
    return "message" in this.update ? this.update.message : undefined;
  }

  get editedMessage(): Message | undefined {
    return "edited_message" in this.update ? this.update.edited_message : undefined;
  }

  get channelPost(): Message | undefined {
    return "channel_post" in this.update ? this.update.channel_post : undefined;
  }

  get editedChannelPost(): Message | undefined {
    return "edited_channel_post" in this.update ? this.update.edited_channel_post : undefined;
  }

  get callbackQuery(): CallbackQuery | undefined {
    return "callback_query" in this.update ? this.update.callback_query : undefined;
  }

  get inlineQuery(): InlineQuery | undefined {
    return "inline_query" in this.update ? this.update.inline_query : undefined;
  }

  /**
   * The chat the update belongs to. Exhaustive over every `Update` variant via
   * {@link chatOf}; variants without a chat (inline queries, polls, ...) resolve
   * to `undefined`.
   */
  get chat(): Chat | undefined {
    return resolve(this.update, chatOf);
  }

  /**
   * The user who triggered the update, where one is identifiable. Exhaustive over
   * every `Update` variant via {@link fromOf}. `undefined` for variants with no
   * actor (polls, channel posts, anonymous chat poll votes, ...).
   */
  get from(): User | undefined {
    return resolve(this.update, fromOf);
  }

  /** Convenience: `this.chat?.id`. */
  get chatId(): number | undefined {
    return this.chat?.id;
  }

  /**
   * This bot's own identity (`bot.botInfo`), or `undefined` when the bot has
   * not learned it: no `command()` was registered (so `getMe()` never ran), or
   * `init()` has not completed yet.
   */
  get me(): BotFullInfo | undefined {
    return this.meProvider?.();
  }

  // --- shortcuts --------------------------------------------------------------

  /**
   * Send a message to the inferred chat, staying where the incoming message
   * came from: `business_connection_id` for business messages (including
   * `deleted_business_messages`), `message_thread_id` for forum-topic messages
   * (`is_topic_message`; a plain reply thread is not followed), and
   * `direct_messages_topic_id` for channel direct-messages chats. For a callback
   * query these come from the message the button is attached to. Anything in
   * `params` wins over the inferred routing; pass e.g.
   * `{ message_thread_id: undefined }` to opt out.
   *
   * Throws if no chat id can be derived from the update (e.g. an inline query,
   * or a callback query that arrives with only `inline_message_id`, carries no
   * chat) unless `params` makes it an ephemeral reply to a callback
   * query, and for `guest_message`, which must be answered with
   * `api.answerGuestQuery` and its `guest_query_id` instead.
   */
  reply(params: ReplyParams): Promise<SendMessageResult>;
  /**
   * @deprecated Use `reply({ text, ...options })` instead - one params object,
   * like every other `Context`/`Api` method. This form is the same call with
   * `{ text, ...other }` pre-split; it keeps working until the next major version.
   */
  reply(text: string, other?: Omit<ReplyParams, "text">): Promise<SendMessageResult>;
  reply(
    textOrParams: string | ReplyParams,
    other?: Omit<ReplyParams, "text">
  ): Promise<SendMessageResult> {
    const params =
      typeof textOrParams === "string" ? { text: textOrParams, ...other } : textOrParams;
    if ("guest_message" in this.update) {
      throw new Error(
        "ctx.reply: guest messages cannot be answered with sendMessage; use api.answerGuestQuery with message.guest_query_id"
      );
    }
    const chatId = this.chatId;
    if (chatId === undefined) {
      // An ephemeral reply to a callback query needs no chat (e.g. a button on an
      // inline message, whose callback query carries no chat).
      const ephemeral = params.ephemeral_message_parameters;
      if (ephemeral && ephemeral.receiver_user_id === undefined) {
        return this.api.sendMessage({ ...params, ephemeral_message_parameters: ephemeral });
      }
      throw new Error("ctx.reply: cannot infer a chat id from this update");
    }
    const routing = replyRouting(resolve(this.update, replySourceOf));
    return this.api.sendMessage({ chat_id: chatId, ...routing, ...params });
  }

  /**
   * Answer the callback query that triggered this update. Throws if the update
   * is not a callback query.
   */
  answerCallbackQuery(
    other?: Omit<AnswerCallbackQueryParams, "callback_query_id">
  ): Promise<AnswerCallbackQueryResult> {
    const cq = this.callbackQuery;
    if (!cq) {
      throw new Error("ctx.answerCallbackQuery: this update has no callback query");
    }
    return this.api.answerCallbackQuery({ callback_query_id: cq.id, ...other });
  }

  /**
   * Edit the message that triggered this update, via `api.editMessageText`. The
   * target is inferred from the callback query: `callback_query.message` wins
   * (`chat_id` + `message_id`, with `business_connection_id` copied from the
   * message when it carries one); otherwise `callback_query.inline_message_id`,
   * the button sitting on an inline-mode message. `params` wins over the
   * inferred routing, which in practice means `business_connection_id`: pass
   * `{ business_connection_id: undefined }` to opt out of a business message's
   * connection.
   *
   * Throws if the update is not a callback query, or the callback carries
   * neither `message` nor `inline_message_id` - the same shape as
   * `answerCallbackQuery`, which refuses non-callback updates.
   */
  editMessageText(
    params: Omit<EditMessageTextParams, "chat_id" | "message_id" | "inline_message_id"> & {
      text: string;
    }
  ): Promise<EditMessageTextResult> {
    const callbackQuery = this.callbackQuery;
    if (!callbackQuery) {
      throw new Error("ctx.editMessageText: this update has no callback query");
    }
    const callbackQueryMessage = callbackQuery.message;
    if (callbackQueryMessage) {
      const target = editMessageTextTarget(callbackQueryMessage);
      return this.api.editMessageText({ ...target, ...params });
    }
    const inlineMessageId = callbackQuery.inline_message_id;
    if (inlineMessageId === undefined) {
      throw new Error(
        "ctx.editMessageText: cannot infer a target from this callback query (no message and no inline_message_id)"
      );
    }
    return this.api.editMessageText({ inline_message_id: inlineMessageId, ...params });
  }

  /**
   * The session handle for this update: `.data` (the persistent bag - mutate it
   * in place or reassign it, it flushes after the handler), `.ext()` for layers
   * built on sessions, and `.delete()` to
   * evict the key. `<T>` is the caller's asserted `data` shape, defaulting to
   * `Record<string, unknown>` like `createSession()` itself; to fix it once
   * instead of per call site, use the middleware's own `.get(ctx)`.
   * Throws if the session middleware has not run for this update (not
   * registered, or no derivable session key).
   */
  getSession<T = Record<string, unknown>>(): SessionHandle<T> {
    const handle = this.state[SESSION_STATE_KEY];
    if (handle === undefined) {
      throw new Error(
        "ctx.getSession: no session for this update (session middleware not installed, or no key)"
      );
    }
    return handle as SessionHandle<T>;
  }
}
