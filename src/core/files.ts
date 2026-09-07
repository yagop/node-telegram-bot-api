/**
 * Files & the form-part contract (ADR-006, ADR-011).
 *
 * `InputFile` is the one value that cannot be JSON-serialized (you can't encode a
 * `Blob`), so it has its own path: a multipart part. It wraps
 * web-standard data only - no `fs`, no path-guessing - so uploads work on Node,
 * Bun, Deno and the edge. File-bearing params are typed `InputFile | string`,
 * where a string is always a `file_id` or URL and goes on the wire as-is.
 *
 * `FormPart` is the escape hatch for composites that carry files referenced
 * from inside a JSON structure (`sendMediaGroup`, sticker sets, profile photos,
 * story content). `serializeParams` produces one - the already-serialized JSON
 * string plus the keyed parts its `attach://` refs point at - and the encoder
 * sets the string under the field name and attaches each part. The encoder still
 * stringifies nothing.
 */

/**
 * The bytes behind an `InputFile`. Every variant streams into the request
 * without being buffered. A `Blob` (e.g. a disk-backed one from `fromPath`),
 * a `Uint8Array`, or a stream factory can be re-read, so transport retries
 * stay possible; a bare `ReadableStream` is one-shot - it is sent exactly
 * once and a failure surfaces immediately instead of retrying.
 */
export type InputFileData = Blob | Uint8Array | ReadableStream<Uint8Array> | InputFileStreamFactory;

/**
 * A replayable stream source: return a fresh, unread stream on every call.
 * The upload stays retryable - each send attempt opens a new stream.
 */
export type InputFileStreamFactory = () =>
  | ReadableStream<Uint8Array>
  | Promise<ReadableStream<Uint8Array>>;

export interface InputFileMeta {
  filename?: string;
  contentType?: string;
}

/** The `attach://` URI scheme the Bot API uses to reference a multipart part
 *  from inside a JSON structure (ADR-011). */
export const ATTACH_PREFIX = "attach://";

/** Explicit, web-standard wrapper for uploadable bytes. */
export class InputFile {
  constructor(
    readonly data: InputFileData,
    readonly meta?: InputFileMeta
  ) {}

  /**
   * This file's wire reference when it occupies attach slot `index`:
   * `attach://media_<index>`. The matching multipart part is keyed `media_<index>`
   * (the ref without the scheme). `InputFile` owns the naming convention; the slot
   * index is allocated by `AttachedMedia` during its build pass (ADR-011).
   */
  build(index: number): string {
    return `${ATTACH_PREFIX}media_${index}`;
  }
}

export function isInputFile(value: unknown): value is InputFile {
  return value instanceof InputFile;
}

/**
 * A file-carrying composite produced by `serializeParams` for a structured field
 * that contained nested `InputFile`s: the already-serialized JSON (with `attach://`
 * refs) plus the keyed parts those refs point at. The encoder sets `json` under the
 * field name and attaches each part - it still stringifies nothing (ADR-011).
 */
export interface FormPart {
  readonly __formPart: true;
  /** The serialized JSON (with `attach://` refs) to set under the param's field name. */
  readonly json: string;
  /** The multipart parts the `attach://` refs point at, each `[partName, file]`. */
  readonly files: ReadonlyArray<readonly [string, InputFile]>;
}

export function isFormPart(value: unknown): value is FormPart {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { __formPart?: unknown }).__formPart === true
  );
}

/** Build a `FormPart` from a serialized JSON string and the files its refs point at. */
export function formPart(
  json: string,
  files: ReadonlyArray<readonly [string, InputFile]>
): FormPart {
  return { __formPart: true, json, files };
}
