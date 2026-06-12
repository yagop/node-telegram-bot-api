import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  BaseError,
  FatalError,
  ParseError,
  TelegramError,
  errors,
} from "../../src/errors.js";

describe("errors", () => {
  describe("BaseError", () => {
    it("formats message with code prefix", () => {
      const err = new BaseError("EX", "boom");
      assert.equal(err.code, "EX");
      assert.equal(err.message, "EX: boom");
    });

    it("serializes to JSON via toJSON()", () => {
      const err = new BaseError("EX", "boom");
      assert.deepEqual(err.toJSON(), { code: "EX", message: "EX: boom" });
    });

    it("preserves prototype chain so instanceof works after re-throw", () => {
      const err = new BaseError("EX", "boom");
      assert.ok(err instanceof BaseError);
      assert.ok(err instanceof Error);
    });
  });

  describe("FatalError", () => {
    it("accepts a string message", () => {
      const err = new FatalError("network down");
      assert.equal(err.code, "EFATAL");
      assert.equal(err.message, "EFATAL: network down");
      assert.equal(err.cause, undefined);
    });

    it("captures the cause when constructed from an Error", () => {
      const root = new Error("disconnected");
      const err = new FatalError(root);
      assert.equal(err.code, "EFATAL");
      assert.equal(err.message, "EFATAL: disconnected");
      assert.equal(err.cause, root);
      assert.equal(err.stack, root.stack);
    });
  });

  describe("ParseError", () => {
    it("attaches the response object", () => {
      const response = { status: 500, body: "<html>" };
      const err = new ParseError("bad json", response);
      assert.equal(err.code, "EPARSE");
      assert.deepEqual(err.response, response);
    });
  });

  describe("TelegramError", () => {
    it("attaches the response object", () => {
      const response = { status: 400, body: { ok: false, description: "x" } };
      const err = new TelegramError("400 Bad Request", response);
      assert.equal(err.code, "ETELEGRAM");
      assert.deepEqual(err.response, response);
    });
  });

  it("re-exports the full error registry", () => {
    assert.deepEqual(Object.keys(errors).sort(), [
      "BaseError",
      "FatalError",
      "ParseError",
      "TelegramError",
    ]);
  });
});
