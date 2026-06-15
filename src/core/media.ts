/**
 * The `mediaGroup()` form-part builder (§6.4, ADR-011).
 *
 * `sendMediaGroup` is the one method where a JSON array must reference uploaded
 * files by `attach://<name>` while the bytes travel as separate multipart parts.
 * Serialization happens at the call site, not in the pipeline (ADR-002): at
 * `.build()` the builder mints `attach://` names, JSON-stringifies the InputMedia
 * array with those references substituted, and returns a `FormPart` carrying both
 * that string and the keyed `InputFile`s. The encoder's `writeTo(sink, key)`
 * branch then sets the bound field and registers each part — it stringifies
 * nothing. `build()` returns a `FormPart` (not a `Json<…>`), so the "`Json<T>`
 * is always a string at runtime" invariant holds (ADR-011).
 */
import type {
  InputMediaAnimation,
  InputMediaAudio,
  InputMediaDocument,
  InputMediaPhoto,
  InputMediaVideo,
} from "../types/index.js";
import type { Json } from "../types/brand.js";
import { type FormPart, type FormSink, InputFile, isInputFile } from "./files.js";

/** A file-bearing param: an uploadable wrapper or a `file_id`/URL string. */
type Media = InputFile | string;

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
 * Builds the `media` argument for `sendMediaGroup`. Each `.photo()/.video()/…`
 * call records an InputMedia item; `.build()` returns a `FormPart` typed as the
 * `media` field's `Json<…>`.
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
   * JSON plus the keyed files. Assignable to any nested-file `media` param
   * (`sendMediaGroup`, `sendPaidMedia`), which the generator types as
   * `Json<…> | FormPart`.
   */
  build(): FormPart {
    const files: Array<[string, InputFile]> = [];

    // Substitute an InputFile with an `attach://<name>` ref, recording the file.
    const ref = (value: Media, name: string): string => {
      if (isInputFile(value)) {
        files.push([name, value]);
        return `attach://${name}`;
      }
      return value;
    };

    const serializable = this.items.map((item, i) => {
      const out: Record<string, unknown> = {
        type: item.type,
        media: ref(item.media, `file_${i}`),
        ...item.rest,
      };
      if (item.thumbnail !== undefined) {
        out.thumbnail = ref(item.thumbnail, `thumb_${i}`);
      }
      return out;
    });

    const mediaJson = JSON.stringify(serializable);

    const part: FormPart = {
      __formPart: true,
      writeTo(sink: FormSink, key: string): void {
        sink.set(key, mediaJson);
        for (const [name, file] of files) sink.attach(name, file);
      },
    };
    return part;
  }
}

/** Start a media-group builder for `sendMediaGroup`. */
export function mediaGroup(): MediaGroup {
  return new MediaGroup();
}
