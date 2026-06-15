/**
 * Context — the per-update object handed to every middleware/handler.
 *
 * Wraps the raw {@link Update} plus the {@link Api} client, exposes ergonomic
 * accessors over the discriminated union (kind, message, chat, from, command),
 * and offers reply helpers that fill in the target chat automatically.
 */

import type {
  Update,
  UpdateKind,
  Message,
  CallbackQuery,
  InlineQuery,
  Chat,
  User,
  SendMessageParams,
  SendPhotoParams,
  InputFileOrString,
} from "../types/v2.js";
import type { Api } from "./client.js";

const UPDATE_KINDS: readonly UpdateKind[] = [
  "message",
  "edited_message",
  "channel_post",
  "edited_channel_post",
  "callback_query",
  "inline_query",
  "my_chat_member",
  "chat_member",
];

const MESSAGE_KEYS = [
  "message",
  "edited_message",
  "channel_post",
  "edited_channel_post",
] as const;

export class Context<S extends Record<string, unknown> = Record<string, unknown>> {
  state: S = {} as S;

  constructor(
    readonly update: Update,
    readonly api: Api,
  ) {}

  /** Which payload key is present on this update. */
  get kind(): UpdateKind {
    const u = this.update as unknown as Record<string, unknown>;
    for (const k of UPDATE_KINDS) {
      if (u[k] !== undefined) {
        return k;
      }
    }
    // Unreachable for a well-formed Update, but keep the type honest.
    throw new Error("Update has no recognised payload key");
  }

  /** The message from any of message/edited_message/channel_post/edited_channel_post. */
  get message(): Message | undefined {
    const u = this.update as unknown as Record<string, Message | undefined>;
    for (const k of MESSAGE_KEYS) {
      if (u[k] !== undefined) {
        return u[k];
      }
    }
    return undefined;
  }

  get callbackQuery(): CallbackQuery | undefined {
    return (this.update as { callback_query?: CallbackQuery }).callback_query;
  }

  get inlineQuery(): InlineQuery | undefined {
    return (this.update as { inline_query?: InlineQuery }).inline_query;
  }

  /** The chat the update relates to (message chat, falling back to the callback's message). */
  get chat(): Chat | undefined {
    return this.message?.chat ?? this.callbackQuery?.message?.chat;
  }

  /** The user who triggered the update, wherever it lives on the union. */
  get from(): User | undefined {
    return (
      this.message?.from ??
      this.callbackQuery?.from ??
      this.inlineQuery?.from ??
      (this.update as { my_chat_member?: { from?: User } }).my_chat_member?.from ??
      (this.update as { chat_member?: { from?: User } }).chat_member?.from
    );
  }

  /** The first `/word` token of message text, without the leading `/` or `@botname`. */
  get command(): string | undefined {
    const text = this.message?.text;
    if (!text) {
      return undefined;
    }
    const match = /^\/([^\s@]+)/.exec(text);
    return match ? match[1] : undefined;
  }

  /** Reply with a text message to the current chat. */
  reply(
    text: string,
    params?: Omit<SendMessageParams, "chat_id" | "text">,
  ): Promise<Message> {
    const chat = this.chat;
    if (!chat) {
      throw new Error("Context.reply: no chat to reply to");
    }
    return this.api.sendMessage({ chat_id: chat.id, text, ...params });
  }

  /** Reply with a photo to the current chat. */
  replyWithPhoto(
    photo: InputFileOrString,
    params?: Omit<SendPhotoParams, "chat_id" | "photo">,
  ): Promise<Message> {
    const chat = this.chat;
    if (!chat) {
      throw new Error("Context.replyWithPhoto: no chat to reply to");
    }
    return this.api.sendPhoto({ chat_id: chat.id, photo, ...params });
  }

  /** Answer the inbound callback query (optionally with a toast). */
  answerCallbackQuery(text?: string): Promise<boolean> {
    const cq = this.callbackQuery;
    if (!cq) {
      throw new Error("Context.answerCallbackQuery: update is not a callback query");
    }
    return this.api.answerCallbackQuery({ callback_query_id: cq.id, text });
  }
}
