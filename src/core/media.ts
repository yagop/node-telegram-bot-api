/**
 * Media-group builder — produces a `FormPart` (ADR-011).
 *
 * The builder collects items; `build()` returns a `FormPart` whose `toJson`
 * registers any `InputFile` media via the sink (yielding `attach://<name>`
 * references) while leaving file_id/URL strings untouched, then serializes the
 * item array. The library itself performs no serialization beyond `json(...)`.
 */

import { isInputFile, type FormPart, type FormSink, type InputFile } from "./files.js";
import { json } from "./json.js";
import type { InputFileOrString } from "../types/v2.js";

interface MediaItem {
  type: "photo" | "video";
  media: InputFileOrString;
  caption?: string;
}

export class MediaGroupBuilder {
  private readonly items: MediaItem[] = [];

  photo(media: InputFileOrString, opts?: { caption?: string }): this {
    this.items.push({ type: "photo", media, caption: opts?.caption });
    return this;
  }

  video(media: InputFileOrString, opts?: { caption?: string }): this {
    this.items.push({ type: "video", media, caption: opts?.caption });
    return this;
  }

  build(): FormPart {
    const items = this.items;
    return {
      toJson(sink: FormSink): string {
        const resolved = items.map((item) => ({
          type: item.type,
          media: isInputFile(item.media)
            ? sink.attach(item.media as InputFile)
            : item.media,
          ...(item.caption === undefined ? {} : { caption: item.caption }),
        }));
        return json(resolved);
      },
    };
  }
}

/** Start a fresh media-group builder. */
export function mediaGroup(): MediaGroupBuilder {
  return new MediaGroupBuilder();
}
