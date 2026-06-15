/**
 * The single `Api` class — ADR-001.
 *
 * Concrete, single-argument methods (no Proxy): each typed method delegates to
 * the generic `call`, which encodes the params and hands them to the
 * {@link Transport}. The param/result types come from the generated v2 surface,
 * so the method signatures stay in lockstep with the documented Bot API.
 */

import { encodeForm } from "./encode.js";
import { Transport, type TransportOptions } from "./transport.js";
import type {
  BotApi,
  MethodName,
  ParamsOf,
  ResultOf,
  User,
  Update,
  Message,
  GetUpdatesParams,
  SendMessageParams,
  SendPhotoParams,
  SendMediaGroupParams,
  SendChatActionParams,
  AnswerCallbackQueryParams,
  SetWebhookParams,
  DeleteWebhookParams,
} from "../types/v2.js";

export class Api {
  readonly transport: Transport;

  constructor(token: string, options: TransportOptions = {}) {
    this.transport = new Transport(token, options);
  }

  async call<M extends MethodName>(
    method: M,
    params?: ParamsOf<M>,
    signal?: AbortSignal,
  ): Promise<ResultOf<M>> {
    return this.transport.call<ResultOf<M>>(
      method,
      await encodeForm((params ?? {}) as Record<string, unknown>),
      signal,
    );
  }

  getMe(): Promise<User> {
    return this.call("getMe");
  }

  getUpdates(params?: GetUpdatesParams): Promise<Update[]> {
    return this.call("getUpdates", params);
  }

  sendMessage(params: SendMessageParams): Promise<Message> {
    return this.call("sendMessage", params);
  }

  sendPhoto(params: SendPhotoParams): Promise<Message> {
    return this.call("sendPhoto", params);
  }

  sendMediaGroup(params: SendMediaGroupParams): Promise<Message[]> {
    return this.call("sendMediaGroup", params);
  }

  sendChatAction(params: SendChatActionParams): Promise<boolean> {
    return this.call("sendChatAction", params);
  }

  answerCallbackQuery(params: AnswerCallbackQueryParams): Promise<boolean> {
    return this.call("answerCallbackQuery", params);
  }

  setWebhook(params: SetWebhookParams): Promise<boolean> {
    return this.call("setWebhook", params);
  }

  deleteWebhook(params?: DeleteWebhookParams): Promise<boolean> {
    return this.call("deleteWebhook", params);
  }
}

export type { TransportOptions } from "./transport.js";

// Keep BotApi referenced so the concrete methods stay aligned with the map.
export type { BotApi };
