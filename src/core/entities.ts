/**
 * MessageEntity helpers — a typed entity-type map, an `entity(...)` factory, and
 * an `EntityBuilder` that tracks UTF-16 offsets/lengths automatically while you
 * append formatted runs of text.
 */

import type { MessageEntity, User } from "../types/v2.js";
import { json, type Json } from "./json.js";

export const EntityType = {
  Mention: "mention",
  Hashtag: "hashtag",
  Cashtag: "cashtag",
  BotCommand: "bot_command",
  Url: "url",
  Email: "email",
  PhoneNumber: "phone_number",
  Bold: "bold",
  Italic: "italic",
  Underline: "underline",
  Strikethrough: "strikethrough",
  Spoiler: "spoiler",
  Blockquote: "blockquote",
  ExpandableBlockquote: "expandable_blockquote",
  Code: "code",
  Pre: "pre",
  TextLink: "text_link",
  TextMention: "text_mention",
  CustomEmoji: "custom_emoji",
} as const;

export type EntityTypeName = (typeof EntityType)[keyof typeof EntityType];

/** Build a single `MessageEntity` with an optional bag of extra fields. */
export function entity(
  type: EntityTypeName,
  offset: number,
  length: number,
  extra?: Partial<Omit<MessageEntity, "type" | "offset" | "length">>,
): MessageEntity {
  return { type, offset, length, ...extra };
}

/**
 * Accumulates text and the entities covering each formatted run. Offsets and
 * lengths are measured in UTF-16 code units (what the Bot API expects).
 */
export class EntityBuilder {
  private text = "";
  private readonly entities: MessageEntity[] = [];

  /** Append unformatted text (no entity recorded). */
  plain(s: string): this {
    this.text += s;
    return this;
  }

  bold(s: string): this {
    return this.append(s, EntityType.Bold);
  }

  italic(s: string): this {
    return this.append(s, EntityType.Italic);
  }

  underline(s: string): this {
    return this.append(s, EntityType.Underline);
  }

  strikethrough(s: string): this {
    return this.append(s, EntityType.Strikethrough);
  }

  spoiler(s: string): this {
    return this.append(s, EntityType.Spoiler);
  }

  code(s: string): this {
    return this.append(s, EntityType.Code);
  }

  pre(s: string, language?: string): this {
    return this.append(s, EntityType.Pre, language === undefined ? undefined : { language });
  }

  link(s: string, url: string): this {
    return this.append(s, EntityType.TextLink, { url });
  }

  mention(s: string, user: User): this {
    return this.append(s, EntityType.TextMention, { user });
  }

  /** Finalize to the matching `text` / `Json<MessageEntity[]>` pair. */
  build(): { text: string; entities: Json<MessageEntity[]> } {
    return { text: this.text, entities: json(this.entities) };
  }

  private append(
    s: string,
    type: EntityTypeName,
    extra?: Partial<Omit<MessageEntity, "type" | "offset" | "length">>,
  ): this {
    const offset = this.text.length;
    this.text += s;
    this.entities.push(entity(type, offset, s.length, extra));
    return this;
  }
}

/** Start a fresh `EntityBuilder`. */
export function fmt(): EntityBuilder {
  return new EntityBuilder();
}
