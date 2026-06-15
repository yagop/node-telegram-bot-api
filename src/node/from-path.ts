/**
 * `fromPath` - read a local file into an `InputFile` (ADR-006, §6.4).
 *
 * The sole Node-only file-input helper. The core `InputFile` wraps web-standard
 * data only (no `fs`, no path-guessing), so reading from disk lives here, under
 * the one folder allowed to import `node:*`.
 */

import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { InputFile } from "../core/files.js";

/**
 * Read `path` off disk and wrap it as an `InputFile`. The default filename is the
 * path's basename; pass `meta.filename` / `meta.contentType` to override.
 *
 * `readFile` returns a `Buffer`, which is a `Uint8Array` - accepted by `InputFile`
 * directly, no copy.
 */
export async function fromPath(
  path: string,
  meta?: { filename?: string; contentType?: string },
): Promise<InputFile> {
  const bytes = await readFile(path);
  return new InputFile(bytes, {
    filename: meta?.filename ?? basename(path),
    contentType: meta?.contentType,
  });
}
