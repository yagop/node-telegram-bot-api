/**
 * Request encoding (ADR-002, ADR-010, ADR-011) - the library serializes nothing.
 *
 * `encodeForm` consumes the wire-ready record `serializeParams` produced (every
 * value is a `WireValue`) and splits it per field: collect an `InputFile` as a
 * part, spread a file-carrying composite (`FormPart`) into its JSON string +
 * nested parts, or keep a string (a serialized structured field, or a scalar
 * coerced with `String`).
 *
 * The presence of *any* file is the only thing that changes the wire format:
 *   - no file -> `URLSearchParams` + urlencoded content-type;
 *   - any file -> a hand-rolled streaming `multipart/form-data` body
 *     (`./multipart.ts`): file bytes flow from their source straight into
 *     `fetch`, never materialized. Runtimes whose `fetch` cannot stream a
 *     request body get the same bytes buffered into one `Blob`.
 *
 * The result's `body` is a per-attempt factory: the transport calls it once per
 * send so a retry gets a fresh stream instead of re-consuming a spent one.
 * There is no `JSON.stringify` here and no field map.
 */

import { type InputFile, isFormPart, isInputFile } from "./files.js";
import { bufferBody, multipartBody, streamBody, supportsRequestStreams } from "./multipart.js";
import type { WireValue } from "./serialize.js";

export interface EncodedRequest {
  /** Headers to merge into the fetch init; always carries the content-type. */
  headers: Record<string, string>;
  /** Build the body for one send attempt; the transport calls it once per attempt. */
  body: () => URLSearchParams | ReadableStream<Uint8Array> | Blob;
  /**
   * Whether `body()` may be called again for a retry. False only when a
   * one-shot `ReadableStream`-backed `InputFile` makes a second send
   * impossible; `Blob`/`Uint8Array` data re-streams for free, and a stream
   * factory (`InputFileStreamFactory`) opens a fresh stream per attempt.
   */
  replayable: boolean;
}

export async function encodeForm(
  fields: Record<string, WireValue>,
  // Test seam: force the buffered-Blob fallback a streaming runtime never takes.
  streaming: boolean = supportsRequestStreams()
): Promise<EncodedRequest> {
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
    const params = new URLSearchParams(strings);
    return {
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: () => params,
      replayable: true,
    };
  }

  const { boundary, pieces, replayable } = multipartBody(strings, files);
  const headers = { "content-type": `multipart/form-data; boundary=${boundary}` };
  if (streaming) return { headers, body: () => streamBody(pieces), replayable };

  // No request-body streaming on this runtime: buffer the same bytes once into
  // a Blob. A Blob re-reads for free, so the body is replayable even when a
  // stream-backed part made the streamed variant one-shot.
  const blob = await bufferBody(pieces);
  return { headers, body: () => blob, replayable: true };
}
