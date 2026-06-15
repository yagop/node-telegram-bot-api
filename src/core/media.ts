/**
 * Nested-file builders (§6.4, ADR-011).
 *
 * A few methods reference uploaded files by `attach://<name>` from inside a JSON
 * structure while the bytes travel as separate multipart parts: `sendMediaGroup`
 * (an InputMedia array), `sendPaidMedia` (InputPaidMedia), the sticker-set methods
 * (InputSticker), `setMyProfilePhoto`/`setBusinessAccountProfilePhoto`
 * (InputProfilePhoto) and `postStory`/`editStory` (InputStoryContent). Each builder
 * keeps the "library serializes nothing" rule (ADR-002): at `.build()` (or the
 * factory call) it mints `attach://` names, JSON-stringifies the structure with
 * those refs substituted, and returns a `FormPart` (via `AttachedMedia`) carrying
 * that string plus the keyed `InputFile`s. The encoder's `writeTo(sink, key)` branch
 * sets the destination field and registers each part - it still stringifies nothing.
 *
 * `build()` returns a `FilePart<T>` - honestly a FormPart, not a string - and the
 * destination fields are typed `JsonWithInputFiles<T>` (a `Json<T>` string OR a
 * `FilePart<T>`), so no type is a lie; the encoder tells them apart with `isFormPart`.
 */
import type {
  InputMediaAnimation,
  InputMediaAudio,
  InputMediaDocument,
  InputMediaPhoto,
  InputMediaVideo,
  InputProfilePhoto,
  InputSticker,
  InputStoryContent,
  MaskPosition,
  SendMediaGroupParams,
  SendPaidMediaParams,
} from "../types/index.js";
import type { Json } from "../types/brand.js";
import type { CarriedBy, FilePart } from "./files.js";
import { ATTACH_PREFIX, formPart, InputFile, isInputFile } from "./files.js";

/** A file-bearing param: an uploadable wrapper or a `file_id`/URL string. */
type Media = InputFile | string;

/**
 * The engine behind every nested-file builder (ADR-011). A builder hands its plain
 * value graph (typed objects with `InputFile`s sitting in their real fields) to
 * `AttachedMedia`; `build()` walks the graph, and for each `InputFile` it allocates
 * the next attach slot, lets the file build its own `attach://media_<index>` ref,
 * and registers the bytes as the matching multipart part. `file_id`/URL strings
 * pass through and `undefined` fields drop out at `JSON.stringify`.
 *
 * `build()` returns a `FilePart<T>` - honestly a FormPart at runtime, branded with
 * the logical type `T`; the only cast is attaching that phantom brand to the real
 * FormPart. The encoder recognises it via its `isFormPart` check.
 */
class AttachedMedia<T> {
  private index = 0;
  private readonly files: Array<[string, InputFile]> = [];

  constructor(private readonly value: unknown) {}

  build(): FilePart<T> {
    const resolved = this.resolve(this.value);
    return formPart(JSON.stringify(resolved), this.files) as FilePart<T>;
  }

  /** Swap each `InputFile` for its attach ref (collecting the part) and recurse
   *  through arrays/objects; pass `file_id`/URL strings and primitives through. */
  private resolve(node: unknown): unknown {
    if (isInputFile(node)) {
      const ref = node.build(this.index++);
      this.files.push([ref.slice(ATTACH_PREFIX.length), node]);
      return ref;
    }
    if (Array.isArray(node)) return node.map((child) => this.resolve(child));
    if (node !== null && typeof node === "object") {
      return Object.fromEntries(
        Object.entries(node).map(([key, child]) => [key, this.resolve(child)]),
      );
    }
    return node;
  }
}

// ---------------------------------------------------------------------------
// sendMediaGroup
// ---------------------------------------------------------------------------

/** Caption options shared across every media kind. */
interface CaptionOptions {
  caption?: string;
  parse_mode?: string;
  caption_entities?: Json<unknown[]>;
}

/** Options for kinds that also carry a thumbnail. */
interface ThumbOptions extends CaptionOptions {
  thumbnail?: Media;
}

type PhotoOptions = CaptionOptions & Pick<InputMediaPhoto, "show_caption_above_media" | "has_spoiler">;
type VideoOptions = ThumbOptions &
  Pick<
    InputMediaVideo,
    "show_caption_above_media" | "width" | "height" | "duration" | "supports_streaming" | "has_spoiler"
  >;
type AudioOptions = ThumbOptions & Pick<InputMediaAudio, "duration" | "performer" | "title">;
type DocumentOptions = ThumbOptions & Pick<InputMediaDocument, "disable_content_type_detection">;
type AnimationOptions = ThumbOptions &
  Pick<InputMediaAnimation, "show_caption_above_media" | "width" | "height" | "duration" | "has_spoiler">;

/**
 * One InputMedia entry, kept fully typed: its `type` and file-bearing `media`
 * (plus `thumbnail`, which lives in the kind's options) alongside the typed
 * extras - no `Record<string, unknown>` bag. `AttachedMedia` substitutes whichever
 * of `media`/`thumbnail` is an `InputFile`.
 */
type GroupItem =
  | ({ type: "photo"; media: Media } & PhotoOptions)
  | ({ type: "video"; media: Media } & VideoOptions)
  | ({ type: "audio"; media: Media } & AudioOptions)
  | ({ type: "document"; media: Media } & DocumentOptions)
  | ({ type: "animation"; media: Media } & AnimationOptions);

/**
 * Builds the `media` argument for `sendMediaGroup`. Each `.photo()/.video()/...`
 * call records a typed InputMedia item; `.build()` returns the field's
 * `FilePart<...>`, with every `InputFile` (media or thumbnail) swapped for an
 * `attach://` ref by `AttachedMedia`.
 */
export class MediaGroup {
  private readonly items: GroupItem[] = [];

  photo(media: Media, options?: PhotoOptions): this {
    this.items.push({ type: "photo", media, ...options });
    return this;
  }

  video(media: Media, options?: VideoOptions): this {
    this.items.push({ type: "video", media, ...options });
    return this;
  }

  audio(media: Media, options?: AudioOptions): this {
    this.items.push({ type: "audio", media, ...options });
    return this;
  }

  document(media: Media, options?: DocumentOptions): this {
    this.items.push({ type: "document", media, ...options });
    return this;
  }

  animation(media: Media, options?: AnimationOptions): this {
    this.items.push({ type: "animation", media, ...options });
    return this;
  }

  build(): SendMediaGroupParams["media"] {
    return new AttachedMedia<CarriedBy<SendMediaGroupParams["media"]>>(this.items).build();
  }
}

// ---------------------------------------------------------------------------
// sendPaidMedia
// ---------------------------------------------------------------------------

/** Extra fields for a paid video, beyond the file itself (thumbnail/cover upload too). */
export interface PaidVideoOptions {
  thumbnail?: Media;
  cover?: Media;
  start_timestamp?: number;
  width?: number;
  height?: number;
  duration?: number;
  supports_streaming?: boolean;
}

type PaidItem = { type: "photo"; media: Media } | ({ type: "video"; media: Media } & PaidVideoOptions);

/**
 * Builds the `media` argument for `sendPaidMedia` (InputPaidMedia[]). The peer of
 * `MediaGroup` (named ...Group for the same reason - `PaidMedia` is already a Bot
 * API response type): each `.photo()/.video()` records a typed item and `.build()`
 * swaps every `InputFile` (media, thumbnail or cover) for an `attach://` ref.
 */
export class PaidMediaGroup {
  private readonly items: PaidItem[] = [];

  photo(media: Media): this {
    this.items.push({ type: "photo", media });
    return this;
  }

  video(media: Media, options?: PaidVideoOptions): this {
    this.items.push({ type: "video", media, ...options });
    return this;
  }

  build(): SendPaidMediaParams["media"] {
    return new AttachedMedia<CarriedBy<SendPaidMediaParams["media"]>>(this.items).build();
  }
}

// ---------------------------------------------------------------------------
// Sticker sets - createNewStickerSet / addStickerToSet / replaceStickerInSet
// ---------------------------------------------------------------------------

/** Per-sticker options: everything in `InputSticker` except the file itself. */
export interface StickerOptions {
  format: string;
  emoji_list: string[];
  mask_position?: MaskPosition;
  keywords?: string[];
}

/**
 * Build the `sticker` argument for `addStickerToSet`/`replaceStickerInSet`: a
 * single InputSticker whose `InputFile` uploads as a matching multipart part
 * (keyed `sticker_0`, distinct from the `sticker` field so it never clobbers it).
 */
export function inputSticker(media: Media, options: StickerOptions): FilePart<InputSticker> {
  return new AttachedMedia<InputSticker>({ sticker: media, ...options }).build();
}

/**
 * Build the `stickers` argument for `createNewStickerSet`: an InputSticker array,
 * each `InputFile` riding along as its own part. Mirrors `MediaGroup`.
 */
export class StickerSetBuilder {
  private readonly items: Array<{ sticker: Media } & StickerOptions> = [];

  add(media: Media, options: StickerOptions): this {
    this.items.push({ sticker: media, ...options });
    return this;
  }

  build(): FilePart<InputSticker[]> {
    return new AttachedMedia<InputSticker[]>(this.items).build();
  }
}

// ---------------------------------------------------------------------------
// Profile photos - setMyProfilePhoto / setBusinessAccountProfilePhoto
// ---------------------------------------------------------------------------

/** Build the `photo` argument for the profile-photo methods (InputProfilePhoto). */
export const profilePhoto = {
  /** A static profile photo (a still image). */
  static(media: Media): FilePart<InputProfilePhoto> {
    return new AttachedMedia<InputProfilePhoto>({ type: "static", photo: media }).build();
  },
  /** An animated profile photo (a video); `main_frame_timestamp` picks the still frame. */
  animated(media: Media, options: { main_frame_timestamp?: number } = {}): FilePart<InputProfilePhoto> {
    return new AttachedMedia<InputProfilePhoto>({ type: "animated", animation: media, ...options }).build();
  },
};

// ---------------------------------------------------------------------------
// Story content - postStory / editStory
// ---------------------------------------------------------------------------

/** Extra fields for a video story, beyond the file itself. */
export interface StoryVideoOptions {
  duration?: number;
  cover_frame_timestamp?: number;
  is_animation?: boolean;
}

/** Build the `content` argument for the story methods (InputStoryContent). */
export const storyContent = {
  /** A photo story. */
  photo(media: Media): FilePart<InputStoryContent> {
    return new AttachedMedia<InputStoryContent>({ type: "photo", photo: media }).build();
  },
  /** A video story. */
  video(media: Media, options: StoryVideoOptions = {}): FilePart<InputStoryContent> {
    return new AttachedMedia<InputStoryContent>({ type: "video", video: media, ...options }).build();
  },
};
