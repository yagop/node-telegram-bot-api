/// <reference types="node" />

/**
 * Base error class for all Telegram Bot API errors.
 * @description Provides a standardized error structure with error codes and JSON serialization.
 * All other error classes in this module extend from BaseError.
 * @example
 * ```typescript
 * try {
 *   // bot operation
 * } catch (error) {
 *   if (error instanceof BaseError) {
 *     console.log(error.code, error.message);
 *   }
 * }
 * ```
 */
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

  /**
   * Converts the error to a JSON-serializable object.
   * @returns An object containing the error code and message.
   */
  toJSON(): { code: string; message: string } {
    return {
      code: this.code,
      message: this.message,
    };
  }
}

/**
 * Represents a fatal, unrecoverable error.
 * @description Thrown when the bot encounters a critical failure that prevents normal operation.
 * Error code is "EFATAL". Can wrap an existing Error to preserve the original stack trace.
 * @extends BaseError
 */
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

/**
 * Represents an error during response parsing.
 * @description Thrown when the bot fails to parse a response from the Telegram API.
 * Error code is "EPARSE". Includes the original server response for debugging.
 * @extends BaseError
 */
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

/**
 * Represents an error returned by the Telegram Bot API.
 * @description Thrown when the Telegram API returns an error response.
 * Error code is "ETELEGRAM". Includes the full API response for error handling.
 * @see {@link https://core.telegram.org/bots/api#making-requests|Telegram Bot API - Making Requests}
 * @extends BaseError
 */
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

/**
 * Collection of all error classes used by the Telegram Bot API library.
 * Provides convenient access to all error types for error handling and type checking.
 * @example
 * ```typescript
 * import { errors } from 'node-telegram-bot-api';
 *
 * try {
 *   await bot.sendMessage(chatId, text);
 * } catch (error) {
 *   if (error instanceof errors.TelegramError) {
 *     console.log('Telegram API error:', error.response);
 *   }
 * }
 * ```
 */
export const errors = {
  BaseError,
  FatalError,
  ParseError,
  TelegramError,
};
