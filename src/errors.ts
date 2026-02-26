/// <reference types="node" />

export class BaseError extends Error {
  public readonly code: string;

  /**
   * @param code Error code
   * @param message Error message
   */
  constructor(code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = this.constructor.name;
    this.code = code;
  }

  toJSON(): { code: string; message: string } {
    return {
      code: this.code,
      message: this.message,
    };
  }
}

export class FatalError extends BaseError {
  public readonly cause?: Error;

  /**
   * Fatal Error. Error code is "EFATAL".
   * @param data Error object or message
   */
  constructor(data: string | Error) {
    const error = typeof data === 'string' ? null : data;
    const message = error ? error.message : (data as string);
    super('EFATAL', message);

    if (error) {
      this.stack = error.stack;
      this.cause = error;
    }
  }
}

export class ParseError extends BaseError {
  public readonly response: unknown;

  /**
   * Error during parsing. Error code is "EPARSE".
   * @param message Error message
   * @param response Server response
   */
  constructor(message: string, response: unknown) {
    super('EPARSE', message);
    this.response = response;
  }
}

export class TelegramError extends BaseError {
  public readonly response: unknown;

  /**
   * Error returned from Telegram. Error code is "ETELEGRAM".
   * @param message Error message
   * @param response Server response
   */
  constructor(message: string, response: unknown) {
    super('ETELEGRAM', message);
    this.response = response;
  }
}

export const errors = {
  BaseError,
  FatalError,
  ParseError,
  TelegramError,
};
