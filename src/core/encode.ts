/**
 * Request encoding (ADR-002, ADR-010, ADR-011) - the library serializes nothing.
 *
 * `encodeForm` consumes the wire-ready record `serializeParams` produced (every
 * value is a `WireValue`) and does exactly one of three things per field:
 *   1. attach an `InputFile` as a multipart part,
 *   2. spread a file-carrying composite (`FormPart`): its JSON string + nested parts,
 *   3. set a string (a serialized structured field, or a scalar coerced with `String`).
 *
 * The presence of *any* file is the only thing that flips the request from
 * `application/x-www-form-urlencoded` to `multipart/form-data`. There is no
 * `JSON.stringify` here and no field map.
 */

import { type InputFile, type InputFileData, inputFileToBlob, isFormPart, isInputFile } from "./files.js";
import type { WireValue } from "./serialize.js";

export interface EncodedRequest {
  /** URL-encoded, native multipart, or streaming multipart request body. */
  body: URLSearchParams | FormData | ReadableStream<Uint8Array>;
  /** Headers to merge into the fetch init. */
  headers: Record<string, string>;
  /** Whether a fresh request body can be encoded for a retry. */
  replayable: boolean;
}

const encoder = new TextEncoder();

export async function encodeForm(fields: Record<string, WireValue>): Promise<EncodedRequest> {
  const strings: Array<[string, string]> = [];
  const files: Array<readonly [string, InputFile]> = [];

  for (const [key, value] of Object.entries(fields)) {
    if (isInputFile(value)) files.push([key, value]);
    else if (isFormPart(value)) {
      strings.push([key, value.json]);
      files.push(...value.files);
    } else {
      strings.push([key, typeof value === "string" ? value : String(value)]);
    }
  }

  // No file anywhere -> urlencoded. Keys are unique here (a FormPart always
  // carries >= 1 file, so it never lands in this branch), so the constructor's
  // append-semantics match a per-key set.
  if (files.length === 0) {
    return {
      body: new URLSearchParams(strings),
      headers: { "content-type": "application/x-www-form-urlencoded" },
      replayable: true,
    };
  }

  if (files.some(([, file]) => isStreamData(file.data))) {
    return encodeStreamingMultipart(strings, files);
  }

  const form = new FormData();
  for (const [key, value] of strings) form.set(key, value);
  for (const [key, file] of files) {
    form.set(key, await inputFileToBlob(file), file.meta?.filename ?? key);
  }
  // No explicit content-type: fetch derives `multipart/form-data` + boundary.
  return { body: form, headers: {}, replayable: true };
}

function encodeStreamingMultipart(
  strings: Array<[string, string]>,
  files: Array<readonly [string, InputFile]>,
): EncodedRequest {
  const boundary = `----node-telegram-bot-api-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const chunks = multipartChunks(boundary, strings, files);

  return {
    body: readableFrom(chunks),
    headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
    replayable: files.every(([, file]) => !(file.data instanceof ReadableStream)),
  };
}

async function* multipartChunks(
  boundary: string,
  strings: Array<[string, string]>,
  files: Array<readonly [string, InputFile]>,
): AsyncGenerator<Uint8Array> {
  for (const [key, value] of strings) {
    yield encoder.encode(
      `--${boundary}\r\nContent-Disposition: form-data; name="${escapeHeaderValue(key)}"\r\n\r\n${value}\r\n`,
    );
  }

  for (const [key, file] of files) {
    const filename = file.meta?.filename ?? key;
    const contentType = safeContentType(file.meta?.contentType);
    yield encoder.encode(
      `--${boundary}\r\nContent-Disposition: form-data; name="${escapeHeaderValue(key)}"; filename="${escapeHeaderValue(filename)}"\r\nContent-Type: ${contentType}\r\n\r\n`,
    );
    yield* inputFileChunks(file.data);
    yield encoder.encode("\r\n");
  }

  yield encoder.encode(`--${boundary}--\r\n`);
}

async function* inputFileChunks(data: InputFileData): AsyncGenerator<Uint8Array> {
  if (data instanceof Uint8Array) {
    yield data;
    return;
  }

  if (data instanceof Blob) {
    yield* readableChunks(data.stream());
    return;
  }

  yield* readableChunks(typeof data === "function" ? await data() : data);
}

async function* readableChunks(stream: ReadableStream<Uint8Array>): AsyncGenerator<Uint8Array> {
  const reader = stream.getReader();
  let complete = false;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) {
        complete = true;
        return;
      }
      yield result.value;
    }
  } finally {
    if (!complete) await reader.cancel();
    reader.releaseLock();
  }
}

function readableFrom(iterator: AsyncGenerator<Uint8Array>): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const result = await iterator.next();
        if (result.done) controller.close();
        else controller.enqueue(result.value);
      } catch (err) {
        controller.error(err);
      }
    },
    async cancel() {
      await iterator.return(undefined);
    },
  });
}

function isStreamData(data: InputFileData): boolean {
  return data instanceof ReadableStream || typeof data === "function";
}

function escapeHeaderValue(value: string): string {
  return value.replace(/\r/g, "%0D").replace(/\n/g, "%0A").replace(/"/g, "%22");
}

function safeContentType(value: string | undefined): string {
  return value && !value.includes("\r") && !value.includes("\n") ? value : "application/octet-stream";
}
