import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { encodeForm } from "../../src/core/encode.js";
import { formPart, InputFile } from "../../src/core/files.js";

// encodeForm is the pure wire-record consumer (a Record<string, WireValue>): per
// field it attaches an InputFile, spreads a FormPart's JSON + parts, or sets a
// string/String-coerced scalar. The param-side serialization (objects -> JSON,
// nested InputFile -> attach://, null-stripping) lives in serializeParams and is
// covered by serialize.test.ts.
describe("encodeForm", () => {
  test("no files -> URLSearchParams + urlencoded content-type", async () => {
    const { body, headers } = await encodeForm({
      chat_id: 1,
      text: "hi",
      reply_markup: '{"inline_keyboard":[]}',
    });
    assert.ok(body instanceof URLSearchParams);
    assert.strictEqual(headers["content-type"], "application/x-www-form-urlencoded");
    const params = body as URLSearchParams;
    assert.strictEqual(params.get("chat_id"), "1");
    assert.strictEqual(params.get("text"), "hi");
    assert.strictEqual(params.get("reply_markup"), '{"inline_keyboard":[]}');
  });

  test("with file -> FormData with string field + Blob/File part, empty headers", async () => {
    const { body, headers } = await encodeForm({
      chat_id: 1,
      photo: new InputFile(new Uint8Array([1, 2, 3]), { filename: "p.png" }),
    });
    assert.ok(body instanceof FormData);
    assert.deepStrictEqual(headers, {});
    const form = body as FormData;
    assert.strictEqual(form.get("chat_id"), "1");
    const photo = form.get("photo");
    assert.ok(photo instanceof Blob);
    assert.strictEqual((photo as File).name, "p.png");
    assert.strictEqual((photo as Blob).size, 3);
  });

  test("a FormPart writes its field string + keyed parts (multipart)", async () => {
    const file = new InputFile(new Uint8Array([9]), { filename: "m.bin" });
    const part = formPart('[{"type":"photo","media":"attach://media_0"}]', [["media_0", file]]);
    const form = (await encodeForm({ chat_id: 1, media: part })).body as FormData;
    assert.strictEqual(form.get("media"), '[{"type":"photo","media":"attach://media_0"}]');
    assert.ok(form.get("media_0") instanceof Blob);
    assert.strictEqual((form.get("media_0") as File).name, "m.bin");
  });
});
