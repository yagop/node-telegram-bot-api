/**
 * Thin HTTP transport wrapper around Node 18+'s built-in `fetch`. Centralises:
 *   - URL construction for the Bot API
 *   - x-www-form-urlencoded vs multipart/form-data body building
 *   - response parsing into Telegram's `{ ok, result, description, error_code }` envelope
 *   - error mapping into our error hierarchy
 */

import createDebug from "./internal/debug.js";
import { FatalError, ParseError, TelegramError, type TelegramErrorResponse } from "./errors.js";
import { streamToBuffer, type PreparedFile } from "./utils.js";

const debug = createDebug("node-telegram-bot-api:http");

/** Telegram error code for `Too Many Requests` — the only retryable status. */
const ERROR_CODE_TOO_MANY_REQUESTS = 429;
/** Default number of automatic retries on a `429` response. */
const DEFAULT_MAX_RETRIES_ON_429 = 2;
/** Default ceiling (seconds) on how long a single `429` retry will sleep. */
const DEFAULT_MAX_RETRY_AFTER_SECONDS = 60;
/** Extra second added to the advertised `retry_after` before sleeping. */
const RETRY_AFTER_BUFFER_SECONDS = 1;

export interface RequestOptions {
  /** Form fields (x-www-form-urlencoded) */
  form?: Record<string, unknown>;
  /** Query string fields (used in mixed form/multipart calls) */
  qs?: Record<string, unknown>;
  /** Multipart form data (file uploads) */
  formData?: Record<string, PreparedFile>;
  /** Per-call abort signal */
  signal?: AbortSignal;
  /** Per-call timeout in ms */
  timeoutMs?: number;
}

export interface TelegramApiOk<T> {
  ok: true;
  result: T;
}

export interface TelegramApiErr {
  ok: false;
  description?: string;
  error_code?: number;
  parameters?: { migrate_to_chat_id?: number; retry_after?: number };
}

export type TelegramApiResponse<T> = TelegramApiOk<T> | TelegramApiErr;

export interface HttpClientOptions {
  baseApiUrl?: string;
  testEnvironment?: boolean;
  request?: {
    timeoutMs?: number;
    headers?: Record<string, string>;
    /**
     * On `429 Too Many Requests`, sleep for `retry_after` seconds (as
     * advertised by Telegram) and retry up to this many times. Set to `0`
     * to opt out. Defaults to `2`.
     */
    maxRetriesOn429?: number;
    /**
     * Ceiling (in seconds) on how long a single `429` retry will sleep. When
     * Telegram's advertised `retry_after` is larger, the client still retries
     * but waits only this long, so a long flood-wait can't block the process
     * for minutes. Set to `Infinity` to always honor the full `retry_after`.
     * Defaults to `60`.
     */
    maxRetryAfterSeconds?: number;
  };
}

/**
 * Coerce a value into the string form Telegram expects on `application/x-www-form-urlencoded`
 * bodies. Booleans become `"true"`/`"false"`, arrays/objects become JSON, undefined/null are skipped.
 */
function toStringValue(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function appendForm(target: URLSearchParams | FormData, fields: Record<string, unknown> | undefined): void {
  if (!fields) return;
  for (const [key, value] of Object.entries(fields)) {
    const stringified = toStringValue(value);
    if (stringified !== undefined) target.append(key, stringified);
  }
}

async function buildBody(opts: RequestOptions): Promise<{
  body: FormData | string | undefined;
  contentType?: string;
}> {
  if (opts.formData && Object.keys(opts.formData).length > 0) {
    // Materialise streams ahead of time so undici/fetch can hand them to FormData.
    for (const file of Object.values(opts.formData)) {
      if (
        !Buffer.isBuffer(file.value) &&
        typeof (file.value as NodeJS.ReadableStream).pipe === "function"
      ) {
        file.value = await streamToBuffer(file.value as NodeJS.ReadableStream);
      }
    }

    const fd = new FormData();
    appendForm(fd, opts.qs);
    appendForm(fd, opts.form);
    for (const [name, file] of Object.entries(opts.formData)) {
      const buffer = file.value as Buffer;
      // Copy into a fresh ArrayBuffer to satisfy the BlobPart type.
      const ab = new ArrayBuffer(buffer.byteLength);
      new Uint8Array(ab).set(buffer);
      const blob = new Blob([ab], { type: file.contentType });
      fd.append(name, blob, file.filename);
    }
    // Content-type is set by fetch automatically for FormData.
    return { body: fd };
  }

  const params = new URLSearchParams();
  appendForm(params, opts.qs);
  appendForm(params, opts.form);
  return { body: params.toString(), contentType: "application/x-www-form-urlencoded" };
}

export class HttpClient {
  private readonly token: string;
  private readonly options: HttpClientOptions;

  constructor(token: string, options: HttpClientOptions = {}) {
    this.token = token;
    this.options = options;
  }

  buildURL(method: string): string {
    const base = this.options.baseApiUrl ?? "https://api.telegram.org";
    const tail = this.options.testEnvironment ? "/test" : "";
    return `${base}/bot${this.token}${tail}/${method}`;
  }

  async request<T>(method: string, opts: RequestOptions = {}): Promise<T> {
    if (!this.token) throw new FatalError("Telegram Bot Token not provided!");

    const url = this.buildURL(method);
    const { body, contentType } = await buildBody(opts);

    const headers: Record<string, string> = {
      ...(this.options.request?.headers ?? {}),
    };
    if (contentType) headers["content-type"] = contentType;

    debug("HTTP POST %s qs=%j form=%j", url, opts.qs, opts.form);

    const timeoutMs = opts.timeoutMs ?? this.options.request?.timeoutMs;
    const maxRetries = this.options.request?.maxRetriesOn429 ?? DEFAULT_MAX_RETRIES_ON_429;
    const maxRetryAfter = this.options.request?.maxRetryAfterSeconds ?? DEFAULT_MAX_RETRY_AFTER_SECONDS;

    for (let attempt = 0; ; attempt++) {
      const { status, parsed } = await this._attempt<T>(url, body, headers, timeoutMs, opts.signal);
      if (parsed.ok) return parsed.result;

      // Retry only on 429, honoring `retry_after` but capping the wait so a long
      // flood-wait can't block the process.
      const retryAfter = parsed.parameters?.retry_after;
      const canRetry =
        parsed.error_code === ERROR_CODE_TOO_MANY_REQUESTS &&
        typeof retryAfter === "number" &&
        attempt < maxRetries &&
        !opts.signal?.aborted;
      if (canRetry) {
        const delayMs = Math.min(retryAfter + RETRY_AFTER_BUFFER_SECONDS, maxRetryAfter) * 1000;
        debug("429 Too Many Requests, sleeping %dms then retrying (attempt %d/%d)", delayMs, attempt + 1, maxRetries);
        await sleep(delayMs);
        continue;
      }

      throw new TelegramError(
        `${parsed.error_code ?? status} ${parsed.description ?? "Unknown error"}`,
        makeResponseInfo(status, parsed),
      );
    }
  }

  /**
   * Perform a single HTTP attempt: fire the request (honoring the per-call
   * timeout and abort signal) and parse Telegram's envelope. Throws
   * {@link FatalError} on a transport failure and {@link ParseError} on an
   * unparseable body; otherwise returns the HTTP status and parsed envelope
   * (ok or not) for the caller's retry/throw decision.
   */
  private async _attempt<T>(
    url: string,
    body: FormData | string | undefined,
    headers: Record<string, string>,
    timeoutMs: number | undefined,
    signal: AbortSignal | undefined,
  ): Promise<{ status: number; parsed: TelegramApiResponse<T> }> {
    const controller = new AbortController();
    if (signal) {
      if (signal.aborted) controller.abort(signal.reason);
      else signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
    }
    const timer = timeoutMs ? setTimeout(() => controller.abort(new Error("HTTP timeout")), timeoutMs) : null;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        body: body as BodyInit | undefined,
        headers,
        signal: controller.signal,
      });
    } catch (err) {
      throw new FatalError(err as Error);
    } finally {
      if (timer) clearTimeout(timer);
    }

    const status = response.status;
    const text = await response.text();
    debug("response %s %s", status, text.length > 1000 ? `${text.slice(0, 1000)}…` : text);

    try {
      return { status, parsed: JSON.parse(text) as TelegramApiResponse<T> };
    } catch {
      throw new ParseError(`Error parsing response: ${text}`, makeResponseInfo(status, text));
    }
  }

}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeResponseInfo(status: number, body: unknown): TelegramErrorResponse {
  return { status, body };
}
