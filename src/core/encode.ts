/**
 * Request encoding (ADR-002, ADR-010, ADR-011) — the library serializes nothing.
 *
 * `encodeForm` walks the param record and does exactly one of three things per
 * field:
 *   1. attach an `InputFile` as a multipart part,
 *   2. let a file-carrying composite (`FormPart`) write itself, or
 *   3. set a string (a `Json<T>` value or a scalar coerced with `String`).
 *
 * The presence of *any* file is the only thing that flips the request from
 * `application/x-www-form-urlencoded` to `multipart/form-data`. There is no
 * `JSON.stringify` here, no field map, no marker interface beyond the file
 * checks.
 */

import {
  type FormSink,
  type InputFile,
  inputFileToBlob,
  isFormPart,
  isInputFile,
} from "./files.js";

export interface EncodedRequest {
  /** Always a `URLSearchParams` (urlencoded) or `FormData` (multipart). */
  body: URLSearchParams | FormData;
  /** Headers to merge into the fetch init. Empty for multipart (fetch sets the boundary). */
  headers: Record<string, string>;
}

export async function encodeForm(fields: Record<string, unknown>): Promise<EncodedRequest> {
  const strings: Array<[string, string]> = [];
  const files: Array<[string, InputFile]> = [];

  const sink: FormSink = {
    set: (key, value) => strings.push([key, value]),
    attach: (key, file) => files.push([key, file]),
  };

  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue;
    else if (isInputFile(value)) sink.attach(key, value);
    else if (isFormPart(value)) value.writeTo(sink);
    else sink.set(key, typeof value === "string" ? value : String(value));
  }

  if (files.length === 0) {
    const params = new URLSearchParams();
    for (const [key, value] of strings) params.set(key, value);
    return {
      body: params,
      headers: { "content-type": "application/x-www-form-urlencoded" },
    };
  }

  const form = new FormData();
  for (const [key, value] of strings) form.set(key, value);
  for (const [key, file] of files) {
    const blob = await inputFileToBlob(file);
    form.set(key, blob, file.meta?.filename ?? key);
  }
  // No explicit content-type: fetch derives `multipart/form-data` + boundary.
  return { body: form, headers: {} };
}
