import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  isAbortError,
  NetworkError,
  ParseError,
  TelegramApiError,
  TelegramBotError,
  TimeoutError,
} from "../../src/core/errors.js";

describe("error hierarchy", () => {
  test("TelegramBotError carries a code and defaults to EUNKNOWN", () => {
    const base = new TelegramBotError("oops");
    assert.ok(base instanceof Error);
    assert.strictEqual(base.code, "EUNKNOWN");
    assert.strictEqual(base.name, "TelegramBotError");

    const withCode = new TelegramBotError("p", { code: "EPARAM" });
    assert.strictEqual(withCode.code, "EPARAM");
  });

  test("NetworkError is a TelegramBotError with code EFETCH", () => {
    const cause = new Error("reset");
    const err = new NetworkError("net", { cause });
    assert.ok(err instanceof TelegramBotError);
    assert.strictEqual(err.code, "EFETCH");
    assert.strictEqual(err.cause, cause);
  });

  test("TimeoutError is a TelegramBotError with code ETIMEOUT", () => {
    const err = new TimeoutError();
    assert.ok(err instanceof TelegramBotError);
    assert.strictEqual(err.code, "ETIMEOUT");
  });

  test("ParseError is a TelegramBotError with code EPARSE and responseText", () => {
    const err = new ParseError("bad", { responseText: "<html>" });
    assert.ok(err instanceof TelegramBotError);
    assert.strictEqual(err.code, "EPARSE");
    assert.strictEqual(err.responseText, "<html>");
  });

  test("TelegramApiError exposes errorCode/description/code and retryAfter", () => {
    const err = new TelegramApiError(429, "Too Many Requests", {
      retry_after: 7,
    });
    assert.ok(err instanceof TelegramBotError);
    assert.strictEqual(err.code, "ETELEGRAM");
    assert.strictEqual(err.errorCode, 429);
    assert.strictEqual(err.description, "Too Many Requests");
    assert.strictEqual(err.parameters?.retry_after, 7);
    assert.strictEqual(err.retryAfter, 7); // getter reads parameters.retry_after
  });

  test("TelegramApiError.retryAfter is undefined without parameters", () => {
    const err = new TelegramApiError(400, "Bad Request");
    assert.strictEqual(err.retryAfter, undefined);
    assert.strictEqual(err.migrateToChatId, undefined);
  });

  test("TelegramApiError.migrateToChatId reads parameters.migrate_to_chat_id", () => {
    const err = new TelegramApiError(400, "migrate", {
      migrate_to_chat_id: -100123,
    });
    assert.strictEqual(err.migrateToChatId, -100123);
  });

  test("cause is preserved when passed", () => {
    const cause = new Error("root");
    const net = new NetworkError("n", { cause });
    const timeout = new TimeoutError("t", { cause });
    assert.strictEqual(net.cause, cause);
    assert.strictEqual(timeout.cause, cause);
  });

  describe("isAbortError", () => {
    test("matches a classic AbortError", () => {
      const e = new Error("aborted");
      e.name = "AbortError";
      assert.strictEqual(isAbortError(e), true);
    });

    test("matches the TimeoutError DOMException from AbortSignal.timeout()", () => {
      // Real `AbortSignal.timeout()` aborts with a DOMException whose `name` is
      // "TimeoutError" (HTML spec, Node >=18). This is the production shape the
      // transport sees when its own client timeout fires.
      const e = { name: "TimeoutError", message: "signal timed out" };
      assert.strictEqual(isAbortError(e), true);
    });

    test("returns false for a plain network error and non-objects", () => {
      assert.strictEqual(isAbortError(new Error("connection reset")), false);
      assert.strictEqual(isAbortError(null), false);
      assert.strictEqual(isAbortError(undefined), false);
      assert.strictEqual(isAbortError("AbortError"), false);
    });
  });
});
