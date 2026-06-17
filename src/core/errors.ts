/**
 * Error hierarchy (ADR-008).
 *
 * A single base, `TelegramBotError`, preserves `cause` and a stable `.code`
 * string (kept for muscle memory from v1). Subclasses expose structured fields
 * so callers branch on values - `err.errorCode === 429`, `err.retryAfter` -
 * instead of substring-matching a message.
 */

/** Subset of Telegram's `ResponseParameters` carried on API errors. */
export interface ApiErrorParameters {
  retry_after?: number;
  migrate_to_chat_id?: number;
}

export class TelegramBotError extends Error {
  /** Stable, machine-readable code (e.g. `ETELEGRAM`, `EFETCH`). */
  readonly code: string;

  constructor(message: string, options: { code?: string; cause?: unknown } = {}) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = new.target.name;
    this.code = options.code ?? "EUNKNOWN";
  }
}

/** A transport-level failure: DNS, connection reset, fetch threw, etc. */
export class NetworkError extends TelegramBotError {
  constructor(message: string, options: { cause?: unknown } = {}) {
    super(message, { code: "EFETCH", cause: options.cause });
  }
}

/** The request exceeded the configured client timeout. */
export class TimeoutError extends TelegramBotError {
  constructor(message = "Request timed out", options: { cause?: unknown } = {}) {
    super(message, { code: "ETIMEOUT", cause: options.cause });
  }
}

/** The response body could not be parsed as the expected JSON envelope. */
export class ParseError extends TelegramBotError {
  readonly responseText?: string;
  constructor(message: string, options: { cause?: unknown; responseText?: string } = {}) {
    super(message, { code: "EPARSE", cause: options.cause });
    this.responseText = options.responseText;
  }
}

/** Telegram answered with `{ ok: false }`. Carries the structured error fields. */
export class TelegramApiError extends TelegramBotError {
  readonly errorCode: number;
  readonly description: string;
  readonly parameters?: ApiErrorParameters;

  constructor(errorCode: number, description: string, parameters?: ApiErrorParameters) {
    super(`${errorCode}: ${description}`, { code: "ETELEGRAM" });
    this.errorCode = errorCode;
    this.description = description;
    this.parameters = parameters;
  }

  /** Seconds to wait before retrying, when Telegram returns a 429. */
  get retryAfter(): number | undefined {
    return this.parameters?.retry_after;
  }

  /** The supergroup chat id to migrate to, on a group→supergroup migration. */
  get migrateToChatId(): number | undefined {
    return this.parameters?.migrate_to_chat_id;
  }
}

/**
 * True for an `AbortController`/timeout abort, across runtimes. Matches both the
 * classic `AbortError` name and the `TimeoutError` DOMException that
 * `AbortSignal.timeout()` aborts with (per the HTML spec; Node >=18, Deno,
 * Cloudflare Workers), so the transport classifies our own client timeout as a
 * `TimeoutError` rather than falling through to `NetworkError`.
 */
export function isAbortError(err: unknown): boolean {
  if (typeof err !== "object" || err === null || !("name" in err)) return false;
  const name = (err as { name?: unknown }).name;
  return name === "AbortError" || name === "TimeoutError";
}

/**
 * Classifies an error as transient (worth retrying) vs fatal.
 *
 * True for a `NetworkError`, a `TimeoutError`, or a `TelegramApiError` whose
 * `errorCode >= 500` (server-side failure). A 429 is *not* treated here - the
 * transport handles it separately via its `retry_after` path.
 */
export function isTransientError(err: unknown): boolean {
  if (err instanceof NetworkError || err instanceof TimeoutError) return true;
  if (err instanceof TelegramApiError) return err.errorCode >= 500;
  return false;
}
