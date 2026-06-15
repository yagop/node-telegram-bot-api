/**
 * Nested-file builders (§6.4, ADR-011).
 *
 * A few methods reference uploaded files by `attach://<name>` from inside a JSON
 * structure while the bytes travel as separate multipart parts: `sendMediaGroup`
 * (an InputMedia array), the sticker-set methods (InputSticker),
 * `setMyProfilePhoto`/`setBusinessAccountProfilePhoto` (InputProfilePhoto) and
 * `postStory`/`editStory` (InputStoryContent). Each builder keeps the "library
 * serializes nothing" rule (ADR-002): at `.build()` (or the factory call) it mints
 * `attach://` names, JSON-stringifies the structure with those refs substituted,
 * and returns a `FormPart` (via `formPart()`) carrying that string plus the keyed
 * `InputFile`s. The encoder's `writeTo(sink, key)` branch sets the destination
 * field and registers each part - it still stringifies nothing.
 *
 * Each builder is typed as the destination field's `Json<...>`; the runtime value
 * is the FormPart, recognised by the encoder's `isFormPart` check before the
 * string branch.
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
} from "../types/index.js";
import type { Json } from "../types/brand.js";
import { formPart, InputFile, isInputFile } from "./files.js";

/** A file-bearing param: an uploadable wrapper or a `file_id`/URL string. */
type Media = InputFile | string;

/**
 * Substitute an `InputFile` with an `attach://<name>` ref (recording the file in
 * `into`); pass `file_id`/URL strings through unchanged. `name` doubles as the
 * multipart part key, so it must be unique within the one request.
 */
function attachRef(media: Media, name: string, into: Array<[string, InputFile]>): string {
  if (isInputFile(media)) {
    into.push([name, media]);
    return `attach://${name}`;
  }
  return media;
}

/** Serialize `value` and wrap it (plus its files) as a FormPart typed `Json<T>`. */
function partOf<T>(value: unknown, files: Array<[string, InputFile]>): Json<T> {
  // Typed as Json<T> to satisfy the param field; the runtime value is the
  // FormPart, recognised by the encoder's isFormPart check (ADR-011).
  return formPart(JSON.stringify(value), files) as unknown as Json<T>;
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

/** One recorded entry: the raw media (and thumbnail) plus the typed extras. */
interface Item {
  type: string;
  media: Media;
  thumbnail?: Media;
  /** Everything except `type`/`media`/`thumbnail`, which we place ourselves. */
  rest: Record<string, unknown>;
}

/** Pull `thumbnail` out and keep the rest, dropping undefined values. */
function splitOptions(options?: ThumbOptions): { thumbnail?: Media; rest: Record<string, unknown> } {
  if (!options) return { rest: {} };
  const { thumbnail, ...rest } = options;
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (value !== undefined) cleaned[key] = value;
  }
  return { thumbnail, rest: cleaned };
}

/**
 * Builds the `media` argument for `sendMediaGroup`. Each `.photo()/.video()/...`
 * call records an InputMedia item; `.build()` returns a `FormPart` typed as the
 * `media` field's `Json<...>`.
 */
export class MediaGroup {
  private readonly items: Item[] = [];

  private add(type: string, media: Media, options?: ThumbOptions): this {
    const { thumbnail, rest } = splitOptions(options);
    this.items.push({ type, media, thumbnail, rest });
    return this;
  }

  photo(media: Media, options?: PhotoOptions): this {
    return this.add("photo", media, options);
  }

  video(media: Media, options?: VideoOptions): this {
    return this.add("video", media, options);
  }

  audio(media: Media, options?: AudioOptions): this {
    return this.add("audio", media, options);
  }

  document(media: Media, options?: DocumentOptions): this {
    return this.add("document", media, options);
  }

  animation(media: Media, options?: AnimationOptions): this {
    return this.add("animation", media, options);
  }

  /**
   * Serialize at the call site: mint `attach://` refs for every `InputFile`,
   * stringify the array with those refs, and return a `FormPart` carrying the
   * JSON plus the keyed files. Typed as the `media` field's `Json<...>`.
   */
  build(): SendMediaGroupParams["media"] {
    const files: Array<[string, InputFile]> = [];
    const serializable = this.items.map((item, i) => {
      const out: Record<string, unknown> = {
        type: item.type,
        media: attachRef(item.media, `file_${i}`, files),
        ...item.rest,
      };
      if (item.thumbnail !== undefined) {
        out.thumbnail = attachRef(item.thumbnail, `thumb_${i}`, files);
      }
      return out;
    });
    return partOf<unknown[]>(serializable, files) as unknown as SendMediaGroupParams["media"];
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

/** Serialize one InputSticker, substituting its file with an `attach://` ref. */
function stickerObject(
  media: Media,
  name: string,
  options: StickerOptions,
  files: Array<[string, InputFile]>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    sticker: attachRef(media, name, files),
    format: options.format,
    emoji_list: options.emoji_list,
  };
  if (options.mask_position !== undefined) out.mask_position = options.mask_position;
  if (options.keywords !== undefined) out.keywords = options.keywords;
  return out;
}

/**
 * Build the `sticker` argument for `addStickerToSet`/`replaceStickerInSet`: a
 * single InputSticker whose `InputFile` uploads as a matching multipart part.
 */
export function inputSticker(media: Media, options: StickerOptions): Json<InputSticker> {
  const files: Array<[string, InputFile]> = [];
  // Part name must differ from the `sticker` field it rides next to, else the blob
  // would clobber the JSON string in the FormData. `sticker_0` matches the array case.
  return partOf<InputSticker>(stickerObject(media, "sticker_0", options, files), files);
}

/**
 * Build the `stickers` argument for `createNewStickerSet`: an InputSticker array,
 * each `InputFile` riding along as its own part. Mirrors `MediaGroup`.
 */
export class StickerSetBuilder {
  private readonly items: Array<{ media: Media; options: StickerOptions }> = [];

  add(media: Media, options: StickerOptions): this {
    this.items.push({ media, options });
    return this;
  }

  build(): Json<InputSticker[]> {
    const files: Array<[string, InputFile]> = [];
    const serializable = this.items.map((item, i) =>
      stickerObject(item.media, `sticker_${i}`, item.options, files),
    );
    return partOf<InputSticker[]>(serializable, files);
  }
}

// ---------------------------------------------------------------------------
// Profile photos - setMyProfilePhoto / setBusinessAccountProfilePhoto
// ---------------------------------------------------------------------------

/** Build the `photo` argument for the profile-photo methods (InputProfilePhoto). */
export const profilePhoto = {
  /** A static profile photo (a still image). */
  static(media: Media): Json<InputProfilePhoto> {
    const files: Array<[string, InputFile]> = [];
    // `photo_0`, not `photo`: the part name must differ from the `photo` field.
    return partOf<InputProfilePhoto>({ type: "static", photo: attachRef(media, "photo_0", files) }, files);
  },
  /** An animated profile photo (a video); `main_frame_timestamp` picks the still frame. */
  animated(media: Media, options: { main_frame_timestamp?: number } = {}): Json<InputProfilePhoto> {
    const files: Array<[string, InputFile]> = [];
    const obj: Record<string, unknown> = { type: "animated", animation: attachRef(media, "animation_0", files) };
    if (options.main_frame_timestamp !== undefined) obj.main_frame_timestamp = options.main_frame_timestamp;
    return partOf<InputProfilePhoto>(obj, files);
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
  photo(media: Media): Json<InputStoryContent> {
    const files: Array<[string, InputFile]> = [];
    return partOf<InputStoryContent>({ type: "photo", photo: attachRef(media, "photo_0", files) }, files);
  },
  /** A video story. */
  video(media: Media, options: StoryVideoOptions = {}): Json<InputStoryContent> {
    const files: Array<[string, InputFile]> = [];
    const obj: Record<string, unknown> = { type: "video", video: attachRef(media, "video_0", files) };
    if (options.duration !== undefined) obj.duration = options.duration;
    if (options.cover_frame_timestamp !== undefined) obj.cover_frame_timestamp = options.cover_frame_timestamp;
    if (options.is_animation !== undefined) obj.is_animation = options.is_animation;
    return partOf<InputStoryContent>(obj, files);
  },
};
