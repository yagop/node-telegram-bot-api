/**
 * Per-update Context (ADR-003).
 *
 * Bundles the raw discriminated `update`, the shared `Api`, a mutable `state`
 * bag, and ergonomic shortcuts (`reply`, `answerCallbackQuery`) that infer the
 * chat/callback from the update. Typed accessors read each payload via
 * `"key" in update`, mirroring the discriminated-union shape (ADR-007), so they
 * return `T | undefined` without unsafe casts.
 */

import type { Api } from "./api.js";
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
  User,
} from "../types/index.js";

export class Context {
  readonly update: Update;
  readonly api: Api;
  /** Mutable per-update bag for middleware (sessions, i18n, …). */
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
   * The chat the update belongs to, inferred from whichever payload is present:
   * message / edited_message / channel_post / edited_channel_post /
   * callback_query.message / my_chat_member / chat_member / chat_join_request /
   * message_reaction.
   */
  get chat(): Chat | undefined {
    const u = this.update;
    if ("message" in u) return u.message.chat;
    if ("edited_message" in u) return u.edited_message.chat;
    if ("channel_post" in u) return u.channel_post.chat;
    if ("edited_channel_post" in u) return u.edited_channel_post.chat;
    if ("callback_query" in u) return u.callback_query.message?.chat;
    if ("my_chat_member" in u) return u.my_chat_member.chat;
    if ("chat_member" in u) return u.chat_member.chat;
    if ("chat_join_request" in u) return u.chat_join_request.chat;
    if ("message_reaction" in u) return u.message_reaction.chat;
    return undefined;
  }

  /** The user who triggered the update, where one is identifiable. */
  get from(): User | undefined {
    const u = this.update;
    if ("message" in u) return u.message.from;
    if ("edited_message" in u) return u.edited_message.from;
    if ("channel_post" in u) return u.channel_post.from;
    if ("edited_channel_post" in u) return u.edited_channel_post.from;
    if ("callback_query" in u) return u.callback_query.from;
    if ("inline_query" in u) return u.inline_query.from;
    if ("chosen_inline_result" in u) return u.chosen_inline_result.from;
    if ("shipping_query" in u) return u.shipping_query.from;
    if ("pre_checkout_query" in u) return u.pre_checkout_query.from;
    if ("poll_answer" in u) return u.poll_answer.user;
    if ("my_chat_member" in u) return u.my_chat_member.from;
    if ("chat_member" in u) return u.chat_member.from;
    if ("chat_join_request" in u) return u.chat_join_request.from;
    if ("message_reaction" in u) return u.message_reaction.user;
    if ("purchased_paid_media" in u) return u.purchased_paid_media.from;
    return undefined;
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
  reply(
    text: string,
    other?: Omit<SendMessageParams, "chat_id" | "text">,
  ): Promise<SendMessageResult> {
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
