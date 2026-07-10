/**
 * `fromPath` - stream a local file through an `InputFile` (ADR-006, §6.4).
 *
 * The sole Node-only file-input helper. The core `InputFile` wraps web-standard
 * data only (no `fs`, no path-guessing), so reading from disk lives here, under
 * the one folder allowed to import `node:*`.
 */

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { basename } from "node:path";
import { Readable } from "node:stream";
import { InputFile, type InputFileMeta } from "../core/files.js";

/**
 * Stream `path` off disk and wrap it as an `InputFile`. The default filename is the
 * path's basename; pass `meta.filename` / `meta.contentType` to override.
 *
 * The stream factory reopens the file for each transport retry without buffering
 * the full contents in memory.
 */
export async function fromPath(path: string, meta?: InputFileMeta): Promise<InputFile> {
  await stat(path);
  return new InputFile(() => Readable.toWeb(createReadStream(path)) as ReadableStream<Uint8Array>, {
    filename: meta?.filename ?? basename(path),
    contentType: meta?.contentType,
  });
}
