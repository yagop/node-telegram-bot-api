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

import { type InputFile, inputFileToBlob, isFormPart, isInputFile } from "./files.js";
import type { WireValue } from "./serialize.js";

export interface EncodedRequest {
  /** Always a `URLSearchParams` (urlencoded) or `FormData` (multipart). */
  body: URLSearchParams | FormData;
  /** Headers to merge into the fetch init. Empty for multipart (fetch sets the boundary). */
  headers: Record<string, string>;
}

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
    };
  }

  const form = new FormData();
  for (const [key, value] of strings) form.set(key, value);
  for (const [key, file] of files) {
    form.set(key, await inputFileToBlob(file), file.meta?.filename ?? key);
  }
  // No explicit content-type: fetch derives `multipart/form-data` + boundary.
  return { body: form, headers: {} };
}
