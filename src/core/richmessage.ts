/**
 * RichMessage builder (`sendRichMessage` / `sendRichMessageDraft`).
 *
 * An `InputRichMessage` is sent in one of three mutually exclusive modes: `html`,
 * `markdown`, or `blocks`. The first two are a plain object (`{ html }` /
 * `{ markdown }`, with `media` for embeds) and need no builder; `RichMessageBuilder`
 * fluently assembles the `blocks` form - a tree of typed `InputRichBlock`s whose
 * text fields are `RichText` (see `RichTextBuilder`). Nesting blocks (lists,
 * quotations, collages, details) accept a nested builder or a callback.
 *
 * Like the other builders this is optional SUGAR: `.build()` returns the plain
 * `InputRichMessage` a caller could write by hand, with raw `InputFile`s embedded
 * in media blocks - the request pipeline's `serializeParams` hoists them to
 * `attach://` parts. `.buildBlocks()` returns just the `InputRichBlock[]`.
 */
import type {
  InputMediaAnimation,
  InputMediaAudio,
  InputMediaDocument,
  InputMediaPhoto,
  InputMediaVideo,
  InputMediaVoiceNote,
  InputRichBlock,
  InputRichBlockListItem,
  InputRichMessage,
  InputRichMessageMedia,
  Location,
  RichBlockCaption,
  RichBlockTableCell,
  RichMessageButton,
} from "../types/index.js";
import { asRichText, type RichTextContent } from "./richtext.js";

/** A nested-blocks argument: a plain array, a nested builder, or a callback. */
export type BlockContent = InputRichBlock[] | RichMessageBuilder | ((builder: RichMessageBuilder) => void);

/** Options shared by `RichMessageBuilder.build()` beyond the blocks. */
export interface RichMessageBuildOptions {
  is_rtl?: boolean;
  skip_entity_detection?: boolean;
}

/** Options for a table block; `caption` is rich text. */
export interface RichTableOptions {
  is_bordered?: true;
  is_striped?: true;
  is_compact?: true;
  caption?: RichTextContent;
}

function resolveBlocks(content: BlockContent): InputRichBlock[] {
  if (content instanceof RichMessageBuilder) return content.buildBlocks();
  if (typeof content === "function") {
    const builder = new RichMessageBuilder();
    content(builder);
    return builder.buildBlocks();
  }
  return content;
}

/** A block caption (`text`, optional `credit`) with rich `text`. */
export function richCaption(text: RichTextContent, credit?: RichTextContent): RichBlockCaption {
  return credit === undefined
    ? { text: asRichText(text) }
    : { text: asRichText(text), credit: asRichText(credit) };
}

/** A table cell; `align` defaults to `"left"`, `valign` to `"top"`. */
export function richTableCell(
  text?: RichTextContent,
  options: Omit<RichBlockTableCell, "text"> = { align: "left", valign: "top" },
): RichBlockTableCell {
  return text === undefined ? { ...options } : { text: asRichText(text), ...options };
}

/** A list item; `blocks` accept a nested builder or callback. */
export function richListItem(
  blocks: BlockContent,
  options: Omit<InputRichBlockListItem, "blocks"> = {},
): InputRichBlockListItem {
  return { blocks: resolveBlocks(blocks), ...options };
}

/** Fluent builder for the `blocks` form of an `InputRichMessage`. */
export class RichMessageBuilder {
  private readonly blocks: InputRichBlock[] = [];
  private readonly mediaItems: InputRichMessageMedia[] = [];

  private push(block: InputRichBlock): this {
    this.blocks.push(block);
    return this;
  }

  /** A text paragraph. */
  paragraph(text: RichTextContent): this {
    return this.push({ type: "paragraph", text: asRichText(text) });
  }

  /** A section heading; `size` is 1 (largest) to 6 (smallest). */
  heading(text: RichTextContent, size: number): this {
    return this.push({ type: "heading", text: asRichText(text), size });
  }

  /** A preformatted (code) block, optionally tagged with a `language`. */
  preformatted(text: RichTextContent, language?: string): this {
    return this.push({ type: "pre", text: asRichText(text), ...(language !== undefined ? { language } : {}) });
  }

  /** A footer block. */
  footer(text: RichTextContent): this {
    return this.push({ type: "footer", text: asRichText(text) });
  }

  /** A horizontal divider. */
  divider(): this {
    return this.push({ type: "divider" });
  }

  /** A block-level mathematical expression in LaTeX format. */
  mathExpression(expression: string): this {
    return this.push({ type: "mathematical_expression", expression });
  }

  /** An anchor target the message can link back to. */
  anchor(name: string): this {
    return this.push({ type: "anchor", name });
  }

  /** An ordered/unordered list; build items with `richListItem`. */
  list(items: InputRichBlockListItem[]): this {
    return this.push({ type: "list", items });
  }

  /** A block quotation wrapping nested blocks, with an optional `credit`. */
  blockquote(blocks: BlockContent, credit?: RichTextContent): this {
    return this.push(
      credit === undefined
        ? { type: "blockquote", blocks: resolveBlocks(blocks) }
        : { type: "blockquote", blocks: resolveBlocks(blocks), credit: asRichText(credit) },
    );
  }

  /** An expandable (collapsed) block quotation. */
  expandableBlockquote(text: RichTextContent, credit?: RichTextContent): this {
    return this.push(
      credit === undefined
        ? { type: "expandable_blockquote", text: asRichText(text) }
        : { type: "expandable_blockquote", text: asRichText(text), credit: asRichText(credit) },
    );
  }

  /** A pull quotation (centered text). */
  pullQuote(text: RichTextContent, credit?: RichTextContent): this {
    return this.push(
      credit === undefined
        ? { type: "pullquote", text: asRichText(text) }
        : { type: "pullquote", text: asRichText(text), credit: asRichText(credit) },
    );
  }

  /** A collage of nested media blocks. */
  collage(blocks: BlockContent, caption?: RichBlockCaption): this {
    return this.push({ type: "collage", blocks: resolveBlocks(blocks), ...(caption !== undefined ? { caption } : {}) });
  }

  /** A slideshow of nested media blocks. */
  slideshow(blocks: BlockContent, caption?: RichBlockCaption): this {
    return this.push({ type: "slideshow", blocks: resolveBlocks(blocks), ...(caption !== undefined ? { caption } : {}) });
  }

  /** A table; `cells` is a rows-of-cells grid (see `richTableCell`). */
  table(cells: RichBlockTableCell[][], options: RichTableOptions = {}): this {
    const { caption, ...flags } = options;
    return this.push(
      caption === undefined
        ? { type: "table", cells, ...flags }
        : { type: "table", cells, ...flags, caption: asRichText(caption) },
    );
  }

  /** A details/disclosure block with an always-shown `summary`. */
  details(summary: RichTextContent, blocks: BlockContent, isOpen?: true): this {
    return this.push(
      isOpen === undefined
        ? { type: "details", summary: asRichText(summary), blocks: resolveBlocks(blocks) }
        : { type: "details", summary: asRichText(summary), blocks: resolveBlocks(blocks), is_open: isOpen },
    );
  }

  /** A map centered on `location`. */
  map(
    location: Location,
    options: { zoom?: number; width?: number; height?: number; caption?: RichBlockCaption } = {},
  ): this {
    return this.push({ type: "map", location, ...options });
  }

  /** A row of 1-8 buttons; build them with `richMessageButton`. */
  buttons(buttons: RichMessageButton[], align?: string): this {
    return this.push({ type: "buttons", buttons, ...(align !== undefined ? { align } : {}) });
  }

  /** An animation block. Its caption is ignored - use the `caption` argument. */
  animation(animation: InputMediaAnimation, caption?: RichBlockCaption): this {
    return this.push({ type: "animation", animation, ...(caption !== undefined ? { caption } : {}) });
  }

  /** An audio block. */
  audio(audio: InputMediaAudio, caption?: RichBlockCaption): this {
    return this.push({ type: "audio", audio, ...(caption !== undefined ? { caption } : {}) });
  }

  /** A document block. */
  document(document: InputMediaDocument, caption?: RichBlockCaption): this {
    return this.push({ type: "document", document, ...(caption !== undefined ? { caption } : {}) });
  }

  /** A photo block. */
  photo(photo: InputMediaPhoto, caption?: RichBlockCaption): this {
    return this.push({ type: "photo", photo, ...(caption !== undefined ? { caption } : {}) });
  }

  /** A video block. */
  video(video: InputMediaVideo, caption?: RichBlockCaption): this {
    return this.push({ type: "video", video, ...(caption !== undefined ? { caption } : {}) });
  }

  /** A voice-note block. */
  voiceNote(voiceNote: InputMediaVoiceNote, caption?: RichBlockCaption): this {
    return this.push({ type: "voice_note", voice_note: voiceNote, ...(caption !== undefined ? { caption } : {}) });
  }

  /** A "Thinking..." placeholder (only valid in `sendRichMessageDraft`). */
  thinking(text: RichTextContent): this {
    return this.push({ type: "thinking", text: asRichText(text) });
  }

  /**
   * Register a media element referenced from the blocks by `id`
   * (a `tg://photo?id=` / `tg://video?id=` / ... link). `media` may embed a raw
   * `InputFile`; the pipeline hoists it to an `attach://` part.
   */
  media(id: string, media: InputRichMessageMedia["media"]): this {
    this.mediaItems.push({ id, media });
    return this;
  }

  /** The accumulated blocks as a plain `InputRichBlock[]`. */
  buildBlocks(): InputRichBlock[] {
    return this.blocks.slice();
  }

  /** The plain `InputRichMessage` (blocks form) ready for `rich_message`. */
  build(options?: RichMessageBuildOptions): InputRichMessage {
    const message: InputRichMessage = { blocks: this.blocks.slice(), ...options };
    if (this.mediaItems.length > 0) message.media = this.mediaItems.slice();
    return message;
  }
}
