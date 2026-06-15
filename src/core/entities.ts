/**
 * MessageEntity helpers (§6.3).
 *
 * `fmt()` is a fluent builder that accumulates text and tracks UTF-16 offsets so
 * callers never hand-count them. A JS string's `.length` already counts UTF-16
 * code units — exactly the unit Telegram's `offset`/`length` use — so we record
 * `offset = text.length` before appending a styled segment and `length` as the
 * segment's own `.length`. `.build()` returns the plain text plus a branded
 * `Json<MessageEntity[]>`, both ready to drop into `sendMessage`.
 */
import type { MessageEntity, User } from "../types/index.js";
import type { Json } from "../types/brand.js";
import { json } from "./json.js";

/** Every documented MessageEntity kind, typo-proof versus raw strings. */
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

export interface BuiltEntities {
  text: string;
  entities: Json<MessageEntity[]>;
}

/**
 * Accumulates styled text and the entities covering each styled segment, in
 * UTF-16 code units (JS string `.length`).
 */
export class EntityBuilder {
  private text = "";
  private readonly entities: MessageEntity[] = [];

  /** Append text and (for a styled segment) an entity covering just that span. */
  private append(segment: string, entity?: Omit<MessageEntity, "offset" | "length">): this {
    if (entity) {
      this.entities.push({
        ...entity,
        offset: this.text.length,
        length: segment.length,
      });
    }
    this.text += segment;
    return this;
  }

  /** Append unstyled text. */
  plain(s: string): this {
    return this.append(s);
  }

  bold(s: string): this {
    return this.append(s, { type: EntityType.Bold });
  }

  italic(s: string): this {
    return this.append(s, { type: EntityType.Italic });
  }

  underline(s: string): this {
    return this.append(s, { type: EntityType.Underline });
  }

  strikethrough(s: string): this {
    return this.append(s, { type: EntityType.Strikethrough });
  }

  spoiler(s: string): this {
    return this.append(s, { type: EntityType.Spoiler });
  }

  code(s: string): this {
    return this.append(s, { type: EntityType.Code });
  }

  pre(s: string, language?: string): this {
    return this.append(s, { type: EntityType.Pre, language });
  }

  /** A text_link entity pointing at `url`. */
  link(s: string, url: string): this {
    return this.append(s, { type: EntityType.TextLink, url });
  }

  /** A text_mention entity for a user without a username. */
  textMention(s: string, user: User): this {
    return this.append(s, { type: EntityType.TextMention, user });
  }

  customEmoji(s: string, customEmojiId: string): this {
    return this.append(s, { type: EntityType.CustomEmoji, custom_emoji_id: customEmojiId });
  }

  blockquote(s: string): this {
    return this.append(s, { type: EntityType.Blockquote });
  }

  /** The accumulated text plus the entities serialized as `Json<MessageEntity[]>`. */
  build(): BuiltEntities {
    return { text: this.text, entities: json<MessageEntity[]>(this.entities) };
  }
}

/** Start a fluent entity builder. */
export function fmt(): EntityBuilder {
  return new EntityBuilder();
}
