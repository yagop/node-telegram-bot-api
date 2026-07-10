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
    const { body, headers, replayable } = await encodeForm({
      chat_id: 1,
      photo: new InputFile(new Uint8Array([1, 2, 3]), { filename: "p.png" }),
    });
    assert.ok(body instanceof FormData);
    assert.deepStrictEqual(headers, {});
    assert.strictEqual(replayable, true);
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

  test("ReadableStream file -> lazy streaming multipart body", async () => {
    let pulls = 0;
    const stream = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          pulls += 1;
          controller.enqueue(new TextEncoder().encode("streamed bytes"));
          controller.close();
        },
      },
      { highWaterMark: 0 },
    );
    const { body, headers, replayable } = await encodeForm({
      chat_id: 1,
      document: new InputFile(stream, { contentType: "text/plain", filename: "report.txt" }),
    });

    assert.ok(body instanceof ReadableStream);
    assert.match(headers["content-type"] ?? "", /^multipart\/form-data; boundary=/);
    assert.strictEqual(replayable, false);
    assert.strictEqual(pulls, 0, "encoding must not read the upload into memory");

    const multipart = await new Response(body).text();
    assert.strictEqual(pulls, 1);
    assert.match(multipart, /name="chat_id"\r\n\r\n1/);
    assert.match(multipart, /name="document"; filename="report.txt"/);
    assert.match(multipart, /Content-Type: text\/plain/);
    assert.match(multipart, /\r\n\r\nstreamed bytes\r\n/);
  });
});
