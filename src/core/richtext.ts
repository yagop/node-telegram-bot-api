/**
 * RichText helpers (rich messages).
 *
 * A Bot API `RichText` is a recursive TREE: on the wire it is a plain String, an
 * Array of RichText, or one of the node objects (bold, url, ...) whose own `text`
 * field is again a RichText. The generated `RichText` type models all three (see
 * `scripts/api-parser.ts`'s prose-union handling), so builders wrap it directly.
 *
 * `RichTextBuilder` accumulates a flat sequence of nodes/strings; wrapping methods
 * (`bold`, `url`, ...) take rich `content` (a string, a built value, or a nested
 * `RichTextBuilder`) so trees nest without hand-writing `type`/`text`. `.build()`
 * returns the plain `RichText`, ready for a `text`/caption/button field.
 */
import type { RichMessageButton, RichText, User } from "../types/index.js";

/** Anything a rich-text `content` parameter accepts. */
export type RichTextContent = RichText | RichTextBuilder;

/** Resolve `content` to a plain `RichText` (unwrapping a nested builder). */
export function asRichText(content: RichTextContent): RichText {
  return content instanceof RichTextBuilder ? content.build() : content;
}

/**
 * Fluent builder for a `RichText` tree. Wrapping methods take rich `content`;
 * leaf methods (`customEmoji`, `mathExpression`, `anchor`, `button`) take their
 * own data. `.build()` returns the plain `RichText` (its accumulated sequence).
 */
export class RichTextBuilder {
  private readonly items: RichText[] = [];

  private push(node: RichText): this {
    this.items.push(node);
    return this;
  }

  /** Append plain, unstyled text. */
  plain(text: string): this {
    this.items.push(text);
    return this;
  }

  bold(content: RichTextContent): this {
    return this.push({ type: "bold", text: asRichText(content) });
  }

  italic(content: RichTextContent): this {
    return this.push({ type: "italic", text: asRichText(content) });
  }

  underline(content: RichTextContent): this {
    return this.push({ type: "underline", text: asRichText(content) });
  }

  strikethrough(content: RichTextContent): this {
    return this.push({ type: "strikethrough", text: asRichText(content) });
  }

  spoiler(content: RichTextContent): this {
    return this.push({ type: "spoiler", text: asRichText(content) });
  }

  subscript(content: RichTextContent): this {
    return this.push({ type: "subscript", text: asRichText(content) });
  }

  superscript(content: RichTextContent): this {
    return this.push({ type: "superscript", text: asRichText(content) });
  }

  /** Highlighted (marked) text. */
  marked(content: RichTextContent): this {
    return this.push({ type: "marked", text: asRichText(content) });
  }

  /** Monowidth (inline code) text. */
  code(content: RichTextContent): this {
    return this.push({ type: "code", text: asRichText(content) });
  }

  /** A text_mention of a user (works without a username). */
  textMention(content: RichTextContent, user: User): this {
    return this.push({ type: "text_mention", text: asRichText(content), user });
  }

  /** A date/time; `dateTimeFormat` follows Telegram's date-time entity formatting. */
  dateTime(content: RichTextContent, unixTime: number, dateTimeFormat: string): this {
    return this.push({
      type: "date_time",
      text: asRichText(content),
      unix_time: unixTime,
      date_time_format: dateTimeFormat,
    });
  }

  /** A hyperlink to `url`. */
  url(content: RichTextContent, url: string): this {
    return this.push({ type: "url", text: asRichText(content), url });
  }

  email(content: RichTextContent, emailAddress: string): this {
    return this.push({ type: "email_address", text: asRichText(content), email_address: emailAddress });
  }

  phone(content: RichTextContent, phoneNumber: string): this {
    return this.push({ type: "phone_number", text: asRichText(content), phone_number: phoneNumber });
  }

  bankCard(content: RichTextContent, bankCardNumber: string): this {
    return this.push({ type: "bank_card_number", text: asRichText(content), bank_card_number: bankCardNumber });
  }

  /** A mention by username (the `@handle` form). */
  mention(content: RichTextContent, username: string): this {
    return this.push({ type: "mention", text: asRichText(content), username });
  }

  hashtag(content: RichTextContent, hashtag: string): this {
    return this.push({ type: "hashtag", text: asRichText(content), hashtag });
  }

  cashtag(content: RichTextContent, cashtag: string): this {
    return this.push({ type: "cashtag", text: asRichText(content), cashtag });
  }

  botCommand(content: RichTextContent, botCommand: string): this {
    return this.push({ type: "bot_command", text: asRichText(content), bot_command: botCommand });
  }

  /** A link to a named anchor in the same message. */
  anchorLink(content: RichTextContent, anchorName: string): this {
    return this.push({ type: "anchor_link", text: asRichText(content), anchor_name: anchorName });
  }

  /** A named reference (footnote-style). */
  reference(content: RichTextContent, name: string): this {
    return this.push({ type: "reference", text: asRichText(content), name });
  }

  /** A link to a reference by name. */
  referenceLink(content: RichTextContent, referenceName: string): this {
    return this.push({ type: "reference_link", text: asRichText(content), reference_name: referenceName });
  }

  /** A custom emoji; `alternativeText` is the fallback emoji. */
  customEmoji(customEmojiId: string, alternativeText: string): this {
    return this.push({ type: "custom_emoji", custom_emoji_id: customEmojiId, alternative_text: alternativeText });
  }

  /** A mathematical expression in LaTeX format. */
  mathExpression(expression: string): this {
    return this.push({ type: "mathematical_expression", expression });
  }

  /** An anchor target (an empty span the message can link back to). */
  anchor(name: string): this {
    return this.push({ type: "anchor", name });
  }

  /** An inline button. */
  button(button: RichMessageButton): this {
    return this.push({ type: "button", button });
  }

  /** The accumulated sequence as a plain `RichText`. */
  build(): RichText {
    return this.items.slice();
  }
}

/**
 * Build a `RichMessageButton` with a rich `text` label. `options` carries the
 * button action (`url`, `callback_data`, `web_app`, ...) and optional `style`.
 */
export function richMessageButton(
  text: RichTextContent,
  options: Omit<RichMessageButton, "text"> = {},
): RichMessageButton {
  return { text: asRichText(text), ...options };
}
