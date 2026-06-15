/**
 * Filesystem upload helper — Node-only.
 *
 * The core `InputFile` is deliberately `fs`-free (web-standard data only) so it
 * runs everywhere. `fromPath` is the Node convenience that reads a file off disk
 * and wraps it as an `InputFile`, streaming rather than buffering the whole
 * file (ADR-006).
 */

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { basename } from "node:path";
import { Readable } from "node:stream";

import { inputFile } from "../core/files.js";
import type { InputFile, FileMeta } from "../core/files.js";

/** Read a file off disk and wrap it as an uploadable {@link InputFile}. */
export async function fromPath(path: string, meta?: FileMeta): Promise<InputFile> {
  // `stat` first so a missing file surfaces ENOENT eagerly rather than on read.
  await stat(path);
  const web = Readable.toWeb(createReadStream(path)) as ReadableStream<Uint8Array>;
  return inputFile(web, { filename: meta?.filename ?? basename(path), ...meta });
}
