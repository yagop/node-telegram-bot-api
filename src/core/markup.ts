/**
 * Inline keyboard builder — produces a wire-ready `Json<InlineKeyboardMarkup>`.
 *
 * Buttons accumulate into the current row; `row()` flushes that row and starts a
 * fresh one; `build()` flushes any pending row, then serializes via `json(...)`.
 */

import type { InlineKeyboardButton, InlineKeyboardMarkup } from "../types/v2.js";
import { json, type Json } from "./json.js";

export class InlineKeyboard {
  private readonly rows: InlineKeyboardButton[][] = [];
  private current: InlineKeyboardButton[] = [];

  /** Append a callback-data button to the current row. */
  text(text: string, callbackData: string): this {
    this.current.push({ text, callback_data: callbackData });
    return this;
  }

  /** Append a URL button to the current row. */
  url(text: string, url: string): this {
    this.current.push({ text, url });
    return this;
  }

  /** Flush the current row and start a new one. */
  row(): this {
    this.rows.push(this.current);
    this.current = [];
    return this;
  }

  /** Flush any pending row and serialize to `Json<InlineKeyboardMarkup>`. */
  build(): Json<InlineKeyboardMarkup> {
    if (this.current.length > 0) {
      this.rows.push(this.current);
      this.current = [];
    }
    return json({ inline_keyboard: this.rows });
  }
}
