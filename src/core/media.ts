/**
 * Nested-file builders (§6.4).
 *
 * `sendMediaGroup` (InputMedia[]), `sendPaidMedia` (InputPaidMedia[]), the
 * sticker-set methods (InputSticker), `setMyProfilePhoto` (InputProfilePhoto) and
 * `postStory`/`editStory` (InputStoryContent) take a structured value whose file
 * fields can be an uploaded `InputFile`. Under ADR-002's Option-D these are PLAIN
 * typed objects/arrays - the pipeline's `serializeParams` walks them, hoists each
 * nested `InputFile` to `attach://media_<i>`, and serializes.
 *
 * These builders are therefore optional fluent SUGAR: each `.build()` returns the
 * exact plain shape a caller could write by hand (with raw `InputFile`s embedded),
 * which drops straight into the param field. No branding, no serialization here.
 */
import type {
  InputMediaAnimation,
  InputMediaAudio,
  InputMediaDocument,
  InputMediaLivePhoto,
  InputMediaPhoto,
  InputMediaVideo,
  InputProfilePhoto,
  InputSticker,
  InputStoryContent,
  MaskPosition,
  MessageEntity,
  SendMediaGroupParams,
  SendPaidMediaParams,
} from "../types/index.js";
import type { InputFile } from "./files.js";

/** A file-bearing param: an uploadable wrapper or a `file_id`/URL string. */
type Media = InputFile | string;

// ---------------------------------------------------------------------------
// sendMediaGroup
// ---------------------------------------------------------------------------

/** Caption options shared across every media kind. */
interface CaptionOptions {
  caption?: string;
  parse_mode?: string;
  caption_entities?: MessageEntity[];
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
// A live photo carries TWO files: `media` (the live photo) and `photo` (the still).
type LivePhotoOptions = CaptionOptions & Pick<InputMediaLivePhoto, "show_caption_above_media" | "has_spoiler">;

/** One InputMedia entry: its `type`, the file-bearing `media` (and `thumbnail`/`photo`),
 *  plus the kind-specific typed extras. `serializeParams` resolves any `InputFile`. */
type GroupItem =
  | ({ type: "photo"; media: Media } & PhotoOptions)
  | ({ type: "video"; media: Media } & VideoOptions)
  | ({ type: "audio"; media: Media } & AudioOptions)
  | ({ type: "document"; media: Media } & DocumentOptions)
  | ({ type: "animation"; media: Media } & AnimationOptions)
  | ({ type: "live_photo"; media: Media; photo: Media } & LivePhotoOptions);

/**
 * Collects items for `sendMediaGroup`'s `media`. `.build()` returns the plain
 * InputMedia array (with raw `InputFile`s embedded). The cast bridges the builder's
 * item union (which offers `animation`) to the field's wire union; both are
 * interchangeable at the wire level once `serializeParams` resolves the files.
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

  /** A live photo: `media` is the live photo, `photo` the still cover. Both upload. */
  livePhoto(media: Media, photo: Media, options?: LivePhotoOptions): this {
    this.items.push({ type: "live_photo", media, photo, ...options });
    return this;
  }

  build(): SendMediaGroupParams["media"] {
    return this.items as SendMediaGroupParams["media"];
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

type PaidItem =
  | { type: "photo"; media: Media }
  | ({ type: "video"; media: Media } & PaidVideoOptions)
  | { type: "live_photo"; media: Media; photo: Media };

/**
 * Collects items for `sendPaidMedia`'s `media` (InputPaidMedia[]). The peer of
 * `MediaGroup` (named ...Group because `PaidMedia` is already a Bot API response
 * type). `.build()` returns the plain array with raw `InputFile`s embedded.
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

  /** A live photo: `media` is the live photo, `photo` the still cover. Both upload. */
  livePhoto(media: Media, photo: Media): this {
    this.items.push({ type: "live_photo", media, photo });
    return this;
  }

  build(): SendPaidMediaParams["media"] {
    return this.items as SendPaidMediaParams["media"];
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

/** Build the `sticker` argument for `addStickerToSet`/`replaceStickerInSet`. */
export function inputSticker(media: Media, options: StickerOptions): InputSticker {
  return { sticker: media, ...options };
}

/** Collects the `stickers` array for `createNewStickerSet`. Mirrors `MediaGroup`. */
export class StickerSetBuilder {
  private readonly items: InputSticker[] = [];

  add(media: Media, options: StickerOptions): this {
    this.items.push({ sticker: media, ...options });
    return this;
  }

  build(): InputSticker[] {
    return this.items;
  }
}

// ---------------------------------------------------------------------------
// Profile photos - setMyProfilePhoto / setBusinessAccountProfilePhoto
// ---------------------------------------------------------------------------

/** Build the `photo` argument for the profile-photo methods (InputProfilePhoto). */
export const profilePhoto = {
  /** A static profile photo (a still image). */
  static(media: Media): InputProfilePhoto {
    return { type: "static", photo: media };
  },
  /** An animated profile photo (a video); `main_frame_timestamp` picks the still frame. */
  animated(media: Media, options: { main_frame_timestamp?: number } = {}): InputProfilePhoto {
    return { type: "animated", animation: media, ...options };
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
  photo(media: Media): InputStoryContent {
    return { type: "photo", photo: media };
  },
  /** A video story. */
  video(media: Media, options: StoryVideoOptions = {}): InputStoryContent {
    return { type: "video", video: media, ...options };
  },
};
