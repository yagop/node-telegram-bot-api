import { describe, expect, test } from "bun:test";
import {
  NetworkError,
  ParseError,
  TelegramApiError,
  TelegramBotError,
  TimeoutError,
} from "../../src/core/errors.js";

describe("error hierarchy", () => {
  test("TelegramBotError carries a code and defaults to EUNKNOWN", () => {
    const base = new TelegramBotError("oops");
    expect(base).toBeInstanceOf(Error);
    expect(base.code).toBe("EUNKNOWN");
    expect(base.name).toBe("TelegramBotError");

    const withCode = new TelegramBotError("p", { code: "EPARAM" });
    expect(withCode.code).toBe("EPARAM");
  });

  test("NetworkError is a TelegramBotError with code EFETCH", () => {
    const cause = new Error("reset");
    const err = new NetworkError("net", { cause });
    expect(err).toBeInstanceOf(TelegramBotError);
    expect(err.code).toBe("EFETCH");
    expect(err.cause).toBe(cause);
  });

  test("TimeoutError is a TelegramBotError with code ETIMEOUT", () => {
    const err = new TimeoutError();
    expect(err).toBeInstanceOf(TelegramBotError);
    expect(err.code).toBe("ETIMEOUT");
  });

  test("ParseError is a TelegramBotError with code EPARSE and responseText", () => {
    const err = new ParseError("bad", { responseText: "<html>" });
    expect(err).toBeInstanceOf(TelegramBotError);
    expect(err.code).toBe("EPARSE");
    expect(err.responseText).toBe("<html>");
  });

  test("TelegramApiError exposes errorCode/description/code and retryAfter", () => {
    const err = new TelegramApiError(429, "Too Many Requests", {
      retry_after: 7,
    });
    expect(err).toBeInstanceOf(TelegramBotError);
    expect(err.code).toBe("ETELEGRAM");
    expect(err.errorCode).toBe(429);
    expect(err.description).toBe("Too Many Requests");
    expect(err.parameters?.retry_after).toBe(7);
    expect(err.retryAfter).toBe(7); // getter reads parameters.retry_after
  });

  test("TelegramApiError.retryAfter is undefined without parameters", () => {
    const err = new TelegramApiError(400, "Bad Request");
    expect(err.retryAfter).toBeUndefined();
    expect(err.migrateToChatId).toBeUndefined();
  });

  test("TelegramApiError.migrateToChatId reads parameters.migrate_to_chat_id", () => {
    const err = new TelegramApiError(400, "migrate", {
      migrate_to_chat_id: -100123,
    });
    expect(err.migrateToChatId).toBe(-100123);
  });

  test("cause is preserved when passed", () => {
    const cause = new Error("root");
    const net = new NetworkError("n", { cause });
    const timeout = new TimeoutError("t", { cause });
    expect(net.cause).toBe(cause);
    expect(timeout.cause).toBe(cause);
  });
});
