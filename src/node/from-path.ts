/**
 * `fromPath` - wrap a local file as an `InputFile` (ADR-006, §6.4).
 *
 * The sole Node-only file-input helper. The core `InputFile` wraps web-standard
 * data only (no `fs`, no path-guessing), so reading from disk lives here, under
 * the one folder allowed to import `node:*`.
 *
 * The file is wrapped as a stream factory (`InputFileStreamFactory`): each send
 * attempt opens a fresh `createReadStream`, so bytes stream from disk (memory
 * stays flat no matter the file size) and the upload stays retryable. A factory
 * beats `fs.openAsBlob` here: Node's disk-backed Blob is lazy, but Deno's
 * node-compat `openAsBlob` reads the whole file into memory eagerly.
 */

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { basename } from "node:path";
import { Readable } from "node:stream";
import { InputFile } from "../core/files.js";

/**
 * Wrap the file at `path` as an `InputFile` that streams from disk, reopening
 * the file for each transport retry. The default filename is the path's
 * basename; pass `meta.filename` / `meta.contentType` to override.
 */
export async function fromPath(
  path: string,
  meta?: { filename?: string; contentType?: string }
): Promise<InputFile> {
  await stat(path); // surface a missing/unreadable path here, not mid-request
  const open = () => Readable.toWeb(createReadStream(path)) as ReadableStream<Uint8Array>;
  return new InputFile(open, {
    filename: meta?.filename ?? basename(path),
    contentType: meta?.contentType,
  });
}
