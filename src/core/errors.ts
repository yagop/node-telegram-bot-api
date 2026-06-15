/**
 * Error hierarchy — runtime-agnostic. See ADR-008.
 */

export type ErrorCode = "EFATAL" | "EPARSE" | "ETELEGRAM" | "ETIMEOUT" | "ENETWORK";

export class TelegramBotError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.code = code;
    this.name = new.target.name;
  }

  toJSON() {
    return { name: this.name, code: this.code, message: this.message };
  }
}

/** Non-recoverable transport/network failure (DNS, connection reset, fetch threw). */
export class NetworkError extends TelegramBotError {
  constructor(message: string, options?: { cause?: unknown }) {
    super("ENETWORK", message, options);
  }
}

/** The per-call deadline elapsed before a response arrived. */
export class TimeoutError extends TelegramBotError {
  constructor(message = "Request timed out") {
    super("ETIMEOUT", message);
  }
}

/** The HTTP body could not be parsed as the expected JSON envelope. */
export class ParseError extends TelegramBotError {
  readonly status?: number;
  readonly body?: string;
  constructor(message: string, info?: { status?: number; body?: string }) {
    super("EPARSE", message);
    this.status = info?.status;
    this.body = info?.body;
  }
}

/** The Bot API returned `ok: false`. Carries the full structured envelope. */
export class TelegramApiError extends TelegramBotError {
  readonly method: string;
  readonly errorCode?: number;
  readonly description?: string;
  readonly parameters?: { migrate_to_chat_id?: number; retry_after?: number };

  constructor(
    method: string,
    info: { errorCode?: number; description?: string; parameters?: TelegramApiError["parameters"] },
  ) {
    super("ETELEGRAM", `${method}: ${info.errorCode ?? ""} ${info.description ?? "Unknown error"}`.trim());
    this.method = method;
    this.errorCode = info.errorCode;
    this.description = info.description;
    this.parameters = info.parameters;
  }

  /** Was this a rate-limit response carrying a retry hint? */
  get retryAfter(): number | undefined {
    return this.errorCode === 429 ? this.parameters?.retry_after : undefined;
  }
}
