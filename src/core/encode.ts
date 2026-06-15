/**
 * Param-object → request-body encoder — ADR-002 / ADR-010 / ADR-011.
 *
 * Turns a flat params object into either a `URLSearchParams` (no files) or a
 * `FormData` (when any file part is present). The library performs NO JSON
 * serialization of its own: structured fields arrive as branded `Json<T>`
 * strings (ADR-002), file-carrying composites serialize themselves through the
 * {@link FormSink} (ADR-011), and explicit {@link InputFile}s become multipart
 * parts under their field name.
 */

import {
  isInputFile,
  isFormPart,
  toBlob,
  type InputFile,
  type FormSink,
} from "./files.js";
import { TelegramBotError } from "./errors.js";

export interface BuiltBody {
  body: FormData | URLSearchParams | undefined;
  headers: Record<string, string>;
}

/** Coerce a non-file, non-composite value to its wire string form. */
function scalar(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  throw new TelegramBotError(
    "EFATAL",
    "encodeForm received a non-serialized structured value; pass a Json<T> (via json() or a builder) instead of a raw object/array.",
  );
}

export async function encodeForm(params: Record<string, unknown>): Promise<BuiltBody> {
  const fields: Array<[string, string]> = [];
  const parts: Array<{ name: string; file: InputFile }> = [];
  let fileCounter = 0;

  const sink: FormSink = {
    attach(file: InputFile): string {
      const name = `file${fileCounter++}`;
      parts.push({ name, file });
      return `attach://${name}`;
    },
  };

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (isInputFile(value)) {
      // Top-level file upload: register under the field name itself.
      parts.push({ name: key, file: value });
      continue;
    }

    if (isFormPart(value)) {
      // File-carrying composite serializes itself, minting attach:// refs.
      fields.push([key, value.toJson(sink)]);
      continue;
    }

    fields.push([key, scalar(value)]);
  }

  if (parts.length === 0) {
    return {
      body: new URLSearchParams(fields),
      headers: { "content-type": "application/x-www-form-urlencoded" },
    };
  }

  const fd = new FormData();
  for (const [name, value] of fields) {
    fd.append(name, value);
  }
  for (const { name, file } of parts) {
    const { blob, filename } = await toBlob(file);
    fd.append(name, blob, filename);
  }
  // No explicit content-type: fetch sets multipart/form-data with the boundary.
  return { body: fd, headers: {} };
}
