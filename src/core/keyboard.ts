/**
 * Markup builders (§6.2, ADR-002).
 *
 * Each `.build()` returns a branded `JsonString<...>` string - already wire-ready - so
 * it drops straight into a `reply_markup` field. The library serializes nothing;
 * these builders (and `json()`) do it at the call site.
 */
import type {
  ForceReply,
  InlineKeyboardButton,
  InlineKeyboardMarkup,
  KeyboardButton,
  ReplyKeyboardMarkup,
  ReplyKeyboardRemove,
} from "../types/index.js";
import type { JsonString } from "../types/brand.js";
import { json } from "./json.js";

/**
 * Fluent inline-keyboard builder. Buttons append to the current row; `row()`
 * starts a new one.
 */
export class InlineKeyboard {
  private readonly rows: InlineKeyboardButton[][] = [[]];

  private push(button: InlineKeyboardButton): this {
    this.rows[this.rows.length - 1]!.push(button);
    return this;
  }

  /** Start a new (empty) row. */
  row(): this {
    this.rows.push([]);
    return this;
  }

  /** A callback button. */
  text(label: string, callbackData: string): this {
    return this.push({ text: label, callback_data: callbackData });
  }

  /** An HTTP/tg:// URL button. */
  url(label: string, url: string): this {
    return this.push({ text: label, url });
  }

  /** A Web App button. */
  webApp(label: string, url: string): this {
    return this.push({ text: label, web_app: { url } });
  }

  /** A Login URL button. */
  loginUrl(label: string, url: string): this {
    return this.push({ text: label, login_url: { url } });
  }

  /** Switch to inline mode in another chat. */
  switchInline(label: string, query = ""): this {
    return this.push({ text: label, switch_inline_query: query });
  }

  /** Switch to inline mode in the current chat. */
  switchInlineCurrent(label: string, query = ""): this {
    return this.push({ text: label, switch_inline_query_current_chat: query });
  }

  /** A button that copies text to the clipboard. */
  copyText(label: string, text: string): this {
    return this.push({ text: label, copy_text: { text } });
  }

  /** A pay button. */
  pay(label: string): this {
    return this.push({ text: label, pay: true });
  }

  /** Serialize to a branded `JsonString<InlineKeyboardMarkup>`, dropping trailing empty rows. */
  build(): JsonString<InlineKeyboardMarkup> {
    const rows = this.rows.slice();
    while (rows.length > 0 && rows[rows.length - 1]!.length === 0) rows.pop();
    return json<InlineKeyboardMarkup>({ inline_keyboard: rows });
  }
}

export interface ReplyKeyboardBuildOptions {
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
  is_persistent?: boolean;
  selective?: boolean;
  input_field_placeholder?: string;
}

/**
 * Fluent reply-keyboard builder. Buttons append to the current row; `row()`
 * starts a new one.
 */
export class ReplyKeyboard {
  private readonly rows: KeyboardButton[][] = [[]];

  private push(button: KeyboardButton): this {
    this.rows[this.rows.length - 1]!.push(button);
    return this;
  }

  /** Start a new (empty) row. */
  row(): this {
    this.rows.push([]);
    return this;
  }

  /** A plain text button. */
  text(label: string): this {
    return this.push({ text: label });
  }

  /** Request the user's phone number. */
  requestContact(label: string): this {
    return this.push({ text: label, request_contact: true });
  }

  /** Request the user's location. */
  requestLocation(label: string): this {
    return this.push({ text: label, request_location: true });
  }

  /** A Web App button. */
  webApp(label: string, url: string): this {
    return this.push({ text: label, web_app: { url } });
  }

  /** Serialize to a branded `JsonString<ReplyKeyboardMarkup>`, dropping trailing empty rows. */
  build(options?: ReplyKeyboardBuildOptions): JsonString<ReplyKeyboardMarkup> {
    const keyboard = this.rows.slice();
    while (keyboard.length > 0 && keyboard[keyboard.length - 1]!.length === 0) {
      keyboard.pop();
    }
    return json<ReplyKeyboardMarkup>({ keyboard, ...options });
  }
}

/** Tell clients to remove the custom keyboard. */
export function removeKeyboard(options?: { selective?: boolean }): JsonString<ReplyKeyboardRemove> {
  return json<ReplyKeyboardRemove>({ remove_keyboard: true, ...options });
}

/** Tell clients to display a reply interface to the user. */
export function forceReply(options?: {
  selective?: boolean;
  input_field_placeholder?: string;
}): JsonString<ForceReply> {
  return json<ForceReply>({ force_reply: true, ...options });
}
