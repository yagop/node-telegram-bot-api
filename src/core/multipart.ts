/**
 * Streaming multipart/form-data encoder (ADR-002, ADR-011).
 *
 * Hand-rolls the multipart body as a web `ReadableStream<Uint8Array>` so file
 * bytes flow chunk-by-chunk from their source (a disk-backed `Blob`, a
 * `Uint8Array`, a caller-provided stream) straight into `fetch` - no part is
 * ever materialized, so upload memory stays flat regardless of file size.
 * Web-standard APIs only (`TextEncoder`, `crypto.getRandomValues`,
 * `ReadableStream`), keeping this edge-safe.
 *
 * The body is built once as an ordered list of `pieces`; each send attempt
 * streams the same pieces again, which is what makes retries possible without
 * buffering: `Uint8Array` and `Blob` pieces re-read for free, and only a
 * one-shot caller `ReadableStream` marks the body non-replayable. Runtimes
 * whose `fetch` cannot stream a request body (see `supportsRequestStreams`)
 * get the same bytes buffered into a single `Blob` instead.
 */

import type { InputFile, InputFileStreamFactory } from "./files.js";

/** One sendable piece of a multipart body, in wire order. A factory piece is
 *  invoked per body build, which is what keeps it replayable. */
export type BodyPiece = Uint8Array | Blob | ReadableStream<Uint8Array> | InputFileStreamFactory;

export interface MultipartBody {
  boundary: string;
  pieces: ReadonlyArray<BodyPiece>;
  /** False when a one-shot `ReadableStream` piece makes a second send impossible. */
  replayable: boolean;
}

const CRLF = new TextEncoder().encode("\r\n");

/** Random, spec-sized (< 70 chars) boundary; `crypto` is a web global on every target. */
function randomBoundary(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return `----NodeTelegramBotApi${hex}`;
}

/** Escape a part name / filename per the WHATWG multipart serialization rules. */
function escapeHeaderValue(value: string): string {
  return value.replace(/\r/g, "%0D").replace(/\n/g, "%0A").replace(/"/g, "%22");
}

/** A part content type is emitted into a multipart header verbatim; refuse a
 *  CR/LF so a hostile `meta.contentType` cannot inject headers or forge parts. */
function safeContentType(value: string): string {
  return value.includes("\r") || value.includes("\n") ? "application/octet-stream" : value;
}

/**
 * Lay out the multipart pieces for the given text fields and file parts.
 * Part headers are encoded eagerly (they are tiny); file bytes stay in their
 * source representation until the body is actually streamed.
 */
export function multipartBody(
  strings: ReadonlyArray<readonly [string, string]>,
  files: ReadonlyArray<readonly [string, InputFile]>
): MultipartBody {
  const boundary = randomBoundary();
  const enc = new TextEncoder();
  const pieces: BodyPiece[] = [];
  let replayable = true;

  for (const [name, value] of strings) {
    pieces.push(
      enc.encode(
        `--${boundary}\r\nContent-Disposition: form-data; name="${escapeHeaderValue(name)}"\r\n\r\n${value}\r\n`
      )
    );
  }
  for (const [name, file] of files) {
    const filename = escapeHeaderValue(file.meta?.filename ?? name);
    const blobType = file.data instanceof Blob ? file.data.type : "";
    const contentType = safeContentType(
      file.meta?.contentType ?? (blobType || "application/octet-stream")
    );
    pieces.push(
      enc.encode(
        `--${boundary}\r\nContent-Disposition: form-data; name="${escapeHeaderValue(name)}"; ` +
          `filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`
      )
    );
    if (file.data instanceof ReadableStream) replayable = false;
    pieces.push(file.data);
    pieces.push(CRLF);
  }
  pieces.push(enc.encode(`--${boundary}--\r\n`));

  return { boundary, pieces, replayable };
}

/** Walk the pieces in order, yielding raw chunks (a Blob streams from its
 *  store; a factory opens a fresh stream for this build). */
async function* pieceChunks(
  pieces: ReadonlyArray<BodyPiece>
): AsyncGenerator<Uint8Array, void, undefined> {
  for (const piece of pieces) {
    if (piece instanceof Uint8Array) {
      yield piece;
      continue;
    }
    const stream =
      typeof piece === "function" ? await piece() : piece instanceof Blob ? piece.stream() : piece;
    const reader = stream.getReader();
    let finished = false;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          finished = true;
          break;
        }
        yield value;
      }
    } finally {
      // Torn down mid-piece (the consumer cancelled): stop the source too.
      if (!finished) await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  }
}

/** A fresh stream over the pieces; call once per send attempt. */
export function streamBody(pieces: ReadonlyArray<BodyPiece>): ReadableStream<Uint8Array> {
  const chunks = pieceChunks(pieces);
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await chunks.next();
      if (done) controller.close();
      else controller.enqueue(value);
    },
    async cancel() {
      await chunks.return();
    },
  });
}

/** Fallback for runtimes without request-body streaming: the same bytes, buffered. */
export async function bufferBody(pieces: ReadonlyArray<BodyPiece>): Promise<Blob> {
  return new Response(streamBody(pieces)).blob();
}

let requestStreamsSupported: boolean | undefined;

/** The proxy env vars Bun's `fetch` honors automatically. */
function proxyConfigured(env: Record<string, string | undefined> | undefined): boolean {
  if (!env) return false;
  return Boolean(
    env.HTTPS_PROXY ??
      env.https_proxy ??
      env.HTTP_PROXY ??
      env.http_proxy ??
      env.ALL_PROXY ??
      env.all_proxy
  );
}

/**
 * Bun < 1.4.0 never writes a `ReadableStream` fetch body when the connection
 * goes through an HTTP(S) CONNECT proxy: the headers flush, the body is never
 * pulled, and the request hangs until timeout (oven-sh/bun#33918; fixed by
 * oven-sh/bun#32635, first shipped in 1.4.0 - verified on canary through the
 * same proxy that stalled). Bun picks the proxy up from the env automatically,
 * so an affected proxied Bun must take the buffered fallback. A backported
 * 1.3.x fix would be buffered too - conservative, never wrong. Read via
 * `Bun.env`/`Bun.version` (not `process`) so core stays free of Node globals.
 */
function bunStreamBodyBroken(bun: {
  version?: string;
  env?: Record<string, string | undefined>;
}): boolean {
  const [major = 0, minor = 0] = (bun.version ?? "0.0.0").split(".").map(Number);
  if (major > 1 || (major === 1 && minor >= 4)) return false;
  return proxyConfigured(bun.env);
}

/**
 * Once-per-process probe: can this runtime's `fetch` send a `ReadableStream`
 * request body? Where bodies must be buffered ahead of time the probe `Request`
 * either throws or stringifies the stream (marking itself with a `text/plain`
 * content-type). Node's undici additionally refuses a stream body unless
 * `duplex: "half"` is present. Bun needs the version/proxy check above, which
 * no local probe can see (its probe passes and direct connections work).
 */
export function supportsRequestStreams(): boolean {
  if (requestStreamsSupported === undefined) {
    const bun = (
      globalThis as { Bun?: { version?: string; env?: Record<string, string | undefined> } }
    ).Bun;
    if (bun !== undefined && bunStreamBodyBroken(bun)) {
      requestStreamsSupported = false;
      return requestStreamsSupported;
    }
    try {
      const probe = new Request("http://localhost/", {
        method: "POST",
        body: new ReadableStream(),
        duplex: "half",
      } as RequestInit);
      requestStreamsSupported = !probe.headers.has("content-type");
    } catch {
      requestStreamsSupported = false;
    }
  }
  return requestStreamsSupported;
}
