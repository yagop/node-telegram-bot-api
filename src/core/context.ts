/**
 * Per-update Context (ADR-003).
 *
 * Bundles the raw discriminated `update`, the shared `Api`, a mutable `state`
 * bag, and ergonomic shortcuts (`reply`, `answerCallbackQuery`) that infer the
 * chat/callback from the update. Typed accessors read each payload via
 * `"key" in update`, mirroring the discriminated-union shape (ADR-007), so they
 * return `T | undefined` without unsafe casts.
 */

import type {
  AnswerCallbackQueryParams,
  AnswerCallbackQueryResult,
  CallbackQuery,
  Chat,
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
};

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
};

/**
 * Dispatch `update` to the row of `table` whose key is the update's payload key.
 * The runtime `k in update` check establishes the variant; the cast on `table`
 * is the single controlled bridge from the per-row narrowed type to a uniform
 * `(u: Update) => R` (TS can't track the narrowing through the loop variable).
 */
function resolve<K extends UpdateType, R>(
  update: Update,
  table: { [P in K]: (u: Variant<P>) => R },
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

  constructor(update: Update, api: Api) {
    this.update = update;
    this.api = api;
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

  // --- shortcuts --------------------------------------------------------------

  /**
   * Send a message to the inferred chat. Throws if no chat id can be derived
   * from the update (e.g. an inline query carries no chat).
   */
  reply(text: string, other?: Omit<SendMessageParams, "chat_id" | "text">): Promise<SendMessageResult> {
    const chatId = this.chatId;
    if (chatId === undefined) {
      throw new Error("ctx.reply: cannot infer a chat id from this update");
    }
    return this.api.sendMessage({ chat_id: chatId, text, ...other });
  }

  /**
   * Answer the callback query that triggered this update. Throws if the update
   * is not a callback query.
   */
  answerCallbackQuery(
    other?: Omit<AnswerCallbackQueryParams, "callback_query_id">,
  ): Promise<AnswerCallbackQueryResult> {
    const cq = this.callbackQuery;
    if (!cq) {
      throw new Error("ctx.answerCallbackQuery: this update has no callback query");
    }
    return this.api.answerCallbackQuery({ callback_query_id: cq.id, ...other });
  }
}
