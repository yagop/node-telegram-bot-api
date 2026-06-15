/**
 * Files & multipart contracts — ADR-006 / ADR-011.
 *
 * `InputFile` wraps web-standard data only (no `fs`), so uploads work on Node,
 * Bun, Deno and the edge. A plain `string` is always a file_id or URL.
 *
 * `FormSink` / `FormPart` are the contract that lets file-carrying composites
 * (e.g. media groups) write themselves into the multipart body without the
 * encoder needing to understand their shape (ADR-011).
 */

export type FileData = Blob | Uint8Array | ReadableStream<Uint8Array>;

export interface FileMeta {
  filename?: string;
  contentType?: string;
}

/** An explicit, uploadable file. Construct via {@link inputFile}. */
export class InputFile {
  constructor(
    readonly data: FileData,
    readonly meta: FileMeta = {},
  ) {}
}

export function inputFile(data: FileData, meta: FileMeta = {}): InputFile {
  return new InputFile(data, meta);
}

export function isInputFile(value: unknown): value is InputFile {
  return value instanceof InputFile;
}

/** Materialise an {@link InputFile} into a `Blob` for `FormData` (web-standard everywhere). */
export async function toBlob(file: InputFile): Promise<{ blob: Blob; filename: string }> {
  const { data, meta } = file;
  const filename = meta.filename ?? "file";
  const type = meta.contentType;

  if (data instanceof Blob) {
    return { blob: type ? data.slice(0, data.size, type) : data, filename };
  }
  if (data instanceof Uint8Array) {
    const part = data as Uint8Array<ArrayBuffer>;
    return { blob: new Blob([part], type ? { type } : undefined), filename };
  }
  const buffered = await new Response(data).blob();
  return { blob: type ? buffered.slice(0, buffered.size, type) : buffered, filename };
}

/**
 * Handed by the encoder to a {@link FormPart}: `attach()` registers an uploaded
 * file as a multipart part and returns its `attach://<name>` reference for
 * embedding in JSON.
 */
export interface FormSink {
  attach(file: InputFile): string;
}

/**
 * A file-carrying composite (e.g. a media group). The encoder calls `toJson`,
 * which registers the part's `InputFile`s via the sink and returns the JSON
 * string (with `attach://` references) to set as the field value — so the
 * library still performs no serialization of its own (ADR-011).
 */
export interface FormPart {
  toJson(sink: FormSink): string;
}

export function isFormPart(value: unknown): value is FormPart {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { toJson?: unknown }).toJson === "function"
  );
}
