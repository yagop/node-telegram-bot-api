import { createReadStream, existsSync, type ReadStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import util from "node:util";

import { FatalError } from "./errors.js";
import { detectFileType } from "./internal/file-type.js";
import { lookupMime } from "./internal/mime.js";

/**
 * Stable JSON-serializer used to convert structured Telegram options
 * (entities, reply_markup, reply_parameters, etc.) into the string form
 * the Bot API expects on x-www-form-urlencoded / multipart bodies.
 *
 * Strings are passed through unchanged so callers may opt into
 * pre-serialized payloads.
 */
export function stringify(data: unknown): string {
  if (typeof data === "string") return data;
  return JSON.stringify(data);
}

/**
 * Lightweight `util.deprecate` wrapper. Logs each unique message exactly once.
 */
export const deprecate: (msg: string) => void = (() => {
  const issued = new Set<string>();
  return (msg: string) => {
    if (issued.has(msg)) return;
    issued.add(msg);
    util.deprecate(() => {}, msg, "node-telegram-bot-api")();
  };
})();

export type FileInput = string | Buffer | Readable | NodeJS.ReadableStream;

export interface FileMeta {
  filename?: string;
  contentType?: string;
}

export interface PreparedFile {
  /** Final value to attach to a multipart form. */
  value: Buffer | Readable | NodeJS.ReadableStream;
  filename: string;
  contentType: string;
}

/**
 * Best-effort filename extraction from a stream's `path` (when the stream
 * was created via `fs.createReadStream`).
 */
function filenameFromStream(stream: NodeJS.ReadableStream | Readable): string | undefined {
  const maybe = (stream as ReadStream).path;
  if (!maybe) return undefined;
  return path.basename(typeof maybe === "string" ? maybe : maybe.toString());
}

function isReadable(value: unknown): value is NodeJS.ReadableStream {
  return (
    !!value &&
    typeof value === "object" &&
    !Buffer.isBuffer(value) &&
    typeof (value as { pipe?: unknown }).pipe === "function"
  );
}

/**
 * Format an arbitrary file-like input into:
 *   - a {@link PreparedFile} (multipart upload)         OR
 *   - a string `fileId` / URL (no upload necessary)
 *
 * @param data           the user-supplied value (path, buffer, stream, or fileId/URL)
 * @param meta           optional filename / content type hints
 * @param filepathLookup whether to treat strings as filesystem paths (mirrors
 *                       legacy `options.filepath`).
 */
export async function prepareFile(
  data: FileInput | undefined | null,
  meta: FileMeta = {},
  filepathLookup = true,
): Promise<{ file: PreparedFile | null; fileId: string | null }> {
  if (data === undefined || data === null) {
    return { file: null, fileId: null };
  }

  let { filename, contentType } = meta;

  if (Buffer.isBuffer(data)) {
    if (!contentType) {
      const detected = detectFileType(data);
      if (detected) {
        contentType = detected.mime;
        if (!filename) filename = `data.${detected.ext}`;
      }
    }
    filename = filename ?? "file";
    contentType = contentType ?? lookupMime(filename) ?? "application/octet-stream";
    return { file: { value: data, filename, contentType }, fileId: null };
  }

  if (isReadable(data)) {
    if (!filename) filename = filenameFromStream(data) ?? "file";
    contentType = contentType ?? lookupMime(filename) ?? "application/octet-stream";
    return { file: { value: data, filename, contentType }, fileId: null };
  }

  if (typeof data === "string") {
    if (filepathLookup && existsSync(data)) {
      const stream = createReadStream(data);
      filename = filename ?? path.basename(data);
      contentType = contentType ?? lookupMime(filename) ?? "application/octet-stream";
      return { file: { value: stream, filename, contentType }, fileId: null };
    }
    // Treat as fileId or already-public URL.
    return { file: null, fileId: data };
  }

  throw new FatalError(`Unsupported file input: ${typeof data}`);
}

/**
 * Variant for multi-file methods (sendMediaGroup, sendPaidMedia, postStory, …).
 */
export async function prepareFiles<T extends { media?: FileInput; data?: FileInput; fileOptions?: FileMeta; type?: string }>(
  attachKey: string,
  inputs: T[],
  defaultMeta: FileMeta = {},
  filepathLookup = true,
): Promise<{ formData: Record<string, PreparedFile>; fileIds: Record<number, string> }> {
  const formData: Record<string, PreparedFile> = {};
  const fileIds: Record<number, string> = {};

  for (let index = 0; index < inputs.length; index++) {
    const item = inputs[index]!;
    const value = item.media ?? item.data;
    const meta = { ...defaultMeta, ...item.fileOptions };
    const { file, fileId } = await prepareFile(value, meta, filepathLookup);
    if (file) {
      formData[`${attachKey}_${index}`] = file;
    } else if (fileId !== null) {
      fileIds[index] = fileId;
    }
  }

  return { formData, fileIds };
}

/**
 * Read a Node.js stream into a Buffer.
 */
export async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : (chunk as Buffer));
  }
  return Buffer.concat(chunks);
}
