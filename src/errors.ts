/**
 * Error hierarchy used throughout the library.
 *
 * - {@link BaseError}      — root class; all custom errors extend it.
 * - {@link FatalError}     — code `EFATAL`; non-recoverable problem (network, programmer mistake, etc.).
 * - {@link ParseError}     — code `EPARSE`; the response from Telegram could not be parsed.
 * - {@link TelegramError}  — code `ETELEGRAM`; the Bot API returned `ok: false`.
 */

export interface TelegramErrorResponse {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
  /** Underlying response object (Response or http.IncomingMessage) when available. */
  raw?: unknown;
}

export class BaseError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(`${code}: ${message}`);
    this.code = code;
    this.name = new.target.name;
    // Restore prototype chain when targeting older TS module emit
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): { code: string; message: string } {
    return { code: this.code, message: this.message };
  }
}

export class FatalError extends BaseError {
  public override readonly cause?: Error;

  constructor(data: string | Error) {
    const message = typeof data === "string" ? data : data.message;
    super("EFATAL", message);
    if (typeof data !== "string") {
      this.stack = data.stack;
      this.cause = data;
    }
  }
}

export class ParseError extends BaseError {
  public readonly response?: TelegramErrorResponse;

  constructor(message: string, response?: TelegramErrorResponse) {
    super("EPARSE", message);
    this.response = response;
  }
}

export class TelegramError extends BaseError {
  public readonly response?: TelegramErrorResponse;

  constructor(message: string, response?: TelegramErrorResponse) {
    super("ETELEGRAM", message);
    this.response = response;
  }
}

export const errors = { BaseError, FatalError, ParseError, TelegramError } as const;
export type Errors = typeof errors;
