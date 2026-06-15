/**
 * Files & the form-part contract (ADR-006, ADR-011).
 *
 * `InputFile` is the one value that cannot be a pre-serialized `Json<T>` string
 * (you can't JSON-encode a `Blob`), so it has its own path. It wraps
 * web-standard data only - no `fs`, no path-guessing - so uploads work on Node,
 * Bun, Deno and the edge. File-bearing params are typed `InputFile | string`,
 * where a string is always a `file_id` or URL and goes on the wire as-is.
 *
 * `FormPart` is the escape hatch for composites that carry files referenced
 * from inside a JSON structure (`sendMediaGroup`, input media with thumbnails).
 * Such a builder serializes at the call site and writes itself to the form via
 * `writeTo(sink)`; the encoder still stringifies nothing.
 */

export type InputFileData = Blob | Uint8Array | ReadableStream<Uint8Array>;

export interface InputFileMeta {
  filename?: string;
  contentType?: string;
}

/** Explicit, web-standard wrapper for uploadable bytes. */
export class InputFile {
  constructor(
    readonly data: InputFileData,
    readonly meta?: InputFileMeta,
  ) {}
}

/** Convenience factory: `inputFile(bytes, { filename })`. */
export function inputFile(data: InputFileData, meta?: InputFileMeta): InputFile {
  return new InputFile(data, meta);
}

export function isInputFile(value: unknown): value is InputFile {
  return value instanceof InputFile;
}

/**
 * What a `FormPart` writes into. Implemented by the encoder; `set` records a
 * plain string field, `attach` registers a multipart file part keyed by name
 * (the same name a JSON `attach://<name>` reference points at).
 */
export interface FormSink {
  set(key: string, value: string): void;
  attach(key: string, file: InputFile): void;
}

/** A file-carrying composite (e.g. a media group) that emits itself. */
export interface FormPart {
  readonly __formPart: true;
  writeTo(sink: FormSink): void;
}

export function isFormPart(value: unknown): value is FormPart {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { __formPart?: unknown }).__formPart === true
  );
}

/** Normalize any `InputFile.data` into a `Blob` for `FormData`. */
export async function inputFileToBlob(file: InputFile): Promise<Blob> {
  const { data, meta } = file;
  const type = meta?.contentType;
  if (data instanceof Blob) {
    // Re-wrap (rather than slice) to override the content type, if requested.
    return type ? new Blob([data], { type }) : data;
  }
  if (data instanceof Uint8Array) {
    // Cast away the `ArrayBufferLike` generic (Blob wants `Uint8Array<ArrayBuffer>`).
    return new Blob([data as Uint8Array<ArrayBuffer>], type ? { type } : undefined);
  }
  // ReadableStream<Uint8Array>
  const blob = await new Response(data).blob();
  return type ? new Blob([blob], { type }) : blob;
}
