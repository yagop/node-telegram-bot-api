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
 * These builders are therefore optional SUGAR: each is a `*Builder` class whose
 * `.build()` returns the exact plain shape a caller could write by hand (with raw
 * `InputFile`s embedded), which drops straight into the param field. No branding, no
 * serialization here. Every method takes ONE object typed straight from the generated
 * Bot API types (`Omit<InputMediaPhoto, "type">`, ...) - the builder only adds the
 * `type` discriminant. Collection builders (`MediaGroupBuilder`, `PaidMediaGroupBuilder`,
 * `StickerSetBuilder`) accumulate fluently; single-value builders take the object in the
 * constructor. (There is no single-sticker builder: an `InputSticker` has no discriminant
 * to add, so `addStickerToSet`/`replaceStickerInSet` take it directly.)
 */
import type {
  InputMedia,
  InputMediaAnimation,
  InputMediaAudio,
  InputMediaDocument,
  InputMediaLivePhoto,
  InputMediaPhoto,
  InputMediaVideo,
  InputPaidMedia,
  InputPaidMediaLivePhoto,
  InputPaidMediaPhoto,
  InputPaidMediaVideo,
  InputProfilePhoto,
  InputProfilePhotoAnimated,
  InputProfilePhotoStatic,
  InputSticker,
  InputStoryContent,
  InputStoryContentPhoto,
  InputStoryContentVideo,
  SendMediaGroupParams,
  SendPaidMediaParams,
} from "../types/index.js";

// ---------------------------------------------------------------------------
// sendMediaGroup
// ---------------------------------------------------------------------------

/**
 * Collects items for `sendMediaGroup`'s `media`. Each method takes one
 * `Omit<InputMedia*, "type">` and `.build()` returns the plain `InputMedia` array
 * (with raw `InputFile`s embedded). The cast bridges the builder's item union (which
 * offers `animation`) to the field's wire union; both are interchangeable at the wire
 * level once `serializeParams` resolves the files.
 */
export class MediaGroupBuilder {
  private readonly items: InputMedia[] = [];

  photo(item: Omit<InputMediaPhoto, "type">): this {
    this.items.push({ type: "photo", ...item });
    return this;
  }

  video(item: Omit<InputMediaVideo, "type">): this {
    this.items.push({ type: "video", ...item });
    return this;
  }

  audio(item: Omit<InputMediaAudio, "type">): this {
    this.items.push({ type: "audio", ...item });
    return this;
  }

  document(item: Omit<InputMediaDocument, "type">): this {
    this.items.push({ type: "document", ...item });
    return this;
  }

  animation(item: Omit<InputMediaAnimation, "type">): this {
    this.items.push({ type: "animation", ...item });
    return this;
  }

  /** A live photo: `media` is the live photo, `photo` the still cover. Both upload. */
  livePhoto(item: Omit<InputMediaLivePhoto, "type">): this {
    this.items.push({ type: "live_photo", ...item });
    return this;
  }

  build(): SendMediaGroupParams["media"] {
    return this.items as SendMediaGroupParams["media"];
  }
}

// ---------------------------------------------------------------------------
// sendPaidMedia
// ---------------------------------------------------------------------------

/**
 * Collects items for `sendPaidMedia`'s `media` (InputPaidMedia[]). The peer of
 * `MediaGroupBuilder` (named ...Group because `PaidMedia` is already a Bot API
 * response type). `.build()` returns the plain array with raw `InputFile`s embedded.
 */
export class PaidMediaGroupBuilder {
  private readonly items: InputPaidMedia[] = [];

  photo(item: Omit<InputPaidMediaPhoto, "type">): this {
    this.items.push({ type: "photo", ...item });
    return this;
  }

  video(item: Omit<InputPaidMediaVideo, "type">): this {
    this.items.push({ type: "video", ...item });
    return this;
  }

  /** A live photo: `media` is the live photo, `photo` the still cover. Both upload. */
  livePhoto(item: Omit<InputPaidMediaLivePhoto, "type">): this {
    this.items.push({ type: "live_photo", ...item });
    return this;
  }

  build(): SendPaidMediaParams["media"] {
    return this.items as SendPaidMediaParams["media"];
  }
}

// ---------------------------------------------------------------------------
// Sticker sets - createNewStickerSet / addStickerToSet / replaceStickerInSet
// ---------------------------------------------------------------------------

/**
 * Collects the `stickers` array for `createNewStickerSet`. Mirrors `MediaGroupBuilder`;
 * each `.add()` takes one `InputSticker` (`{ sticker, format, emoji_list, ... }`). Named
 * `StickerSetBuilder` (not `StickerSet`) because `StickerSet` is a Bot API type. There is
 * no single-sticker builder - an `InputSticker` has no discriminant for a builder to add,
 * so `addStickerToSet`/`replaceStickerInSet` take that plain object directly.
 */
export class StickerSetBuilder {
  private readonly items: InputSticker[] = [];

  add(sticker: InputSticker): this {
    this.items.push(sticker);
    return this;
  }

  build(): InputSticker[] {
    return this.items;
  }
}

// ---------------------------------------------------------------------------
// Profile photos - setMyProfilePhoto / setBusinessAccountProfilePhoto
// ---------------------------------------------------------------------------

/** A static profile photo (a still image). `.build()` returns the `InputProfilePhoto`. */
export class StaticProfilePhotoBuilder {
  constructor(private readonly input: Omit<InputProfilePhotoStatic, "type">) {}

  build(): InputProfilePhoto {
    return { type: "static", ...this.input };
  }
}

/** An animated profile photo (a video); `main_frame_timestamp` picks the still frame. */
export class AnimatedProfilePhotoBuilder {
  constructor(private readonly input: Omit<InputProfilePhotoAnimated, "type">) {}

  build(): InputProfilePhoto {
    return { type: "animated", ...this.input };
  }
}

// ---------------------------------------------------------------------------
// Story content - postStory / editStory
// ---------------------------------------------------------------------------

/** A photo story for `postStory`/`editStory`. `.build()` returns the `InputStoryContent`. */
export class PhotoStoryBuilder {
  constructor(private readonly input: Omit<InputStoryContentPhoto, "type">) {}

  build(): InputStoryContent {
    return { type: "photo", ...this.input };
  }
}

/** A video story for `postStory`/`editStory`. `.build()` returns the `InputStoryContent`. */
export class VideoStoryBuilder {
  constructor(private readonly input: Omit<InputStoryContentVideo, "type">) {}

  build(): InputStoryContent {
    return { type: "video", ...this.input };
  }
}
