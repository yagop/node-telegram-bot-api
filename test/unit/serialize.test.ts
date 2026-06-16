import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { encodeForm } from "../../src/core/encode.js";
import { InputFile } from "../../src/core/files.js";
import { MediaGroupBuilder } from "../../src/core/media.js";
import { serializeParams } from "../../src/core/serialize.js";

/** Plain params -> serializeParams -> encodeForm. */
const enc = (p: Record<string, unknown>) => encodeForm(serializeParams(p));
const fileA = () => new InputFile(new Uint8Array([1, 2, 3]), { filename: "a.bin", contentType: "image/png" });
const fileB = () => new InputFile(new Uint8Array([4, 5]), { filename: "b.bin", contentType: "image/jpeg" });

describe("serializeParams", () => {
  test("structured fields are JSON-stringified; scalars coerced; no files -> urlencoded", async () => {
    const { body, headers } = await enc({
      chat_id: 1,
      text: "hi",
      disable_notification: true,
      reply_markup: { inline_keyboard: [[{ text: "A", callback_data: "a" }]] },
      entities: [{ type: "bold", offset: 0, length: 2 }],
    });
    assert.ok(body instanceof URLSearchParams);
    assert.strictEqual(headers["content-type"], "application/x-www-form-urlencoded");
    const p = body as URLSearchParams;
    assert.strictEqual(p.get("chat_id"), "1");
    assert.strictEqual(p.get("disable_notification"), "true");
    assert.deepStrictEqual(JSON.parse(p.get("reply_markup")!), { inline_keyboard: [[{ text: "A", callback_data: "a" }]] });
    assert.deepStrictEqual(JSON.parse(p.get("entities")!), [{ type: "bold", offset: 0, length: 2 }]);
  });

  test("array field is stringified", async () => {
    const { body } = await enc({ chat_id: 1, message_ids: [10, 11] });
    assert.strictEqual((body as URLSearchParams).get("message_ids"), "[10,11]");
  });

  test("null/undefined fields are dropped before the wire", async () => {
    const { body } = await enc({ chat_id: 1, caption: null, reply_to_message_id: undefined, text: "keep" });
    const p = body as URLSearchParams;
    assert.strictEqual(p.get("chat_id"), "1");
    assert.strictEqual(p.get("text"), "keep");
    assert.strictEqual(p.has("caption"), false);
    assert.strictEqual(p.has("reply_to_message_id"), false);
  });

  test("top-level InputFile attaches under the field name (multipart)", async () => {
    const f = fileA();
    const form = (await enc({ chat_id: 1, photo: f, caption: "x" })).body as FormData;
    assert.strictEqual(form.get("chat_id"), "1");
    assert.strictEqual(form.get("caption"), "x");
    const part = form.get("photo");
    assert.ok(part instanceof Blob);
    assert.strictEqual((part as File).name, "a.bin");
    // a top-level file is NOT renamed to media_0
    assert.strictEqual(form.get("media_0"), null);
  });

  test("nested file in a media group -> attach://media_0 + keyed part; URL passes through", async () => {
    const a = fileA();
    const form = (
      await enc({
        chat_id: 1,
        media: [
          { type: "photo", media: a, caption: "A" },
          { type: "photo", media: "https://x/b.jpg" },
        ],
      })
    ).body as FormData;
    const parsed = JSON.parse(form.get("media") as string) as Array<Record<string, unknown>>;
    assert.strictEqual(parsed[0]!.media, "attach://media_0");
    assert.strictEqual(parsed[0]!.caption, "A");
    assert.strictEqual(parsed[1]!.media, "https://x/b.jpg");
    assert.ok(form.get("media_0") instanceof Blob);
    assert.strictEqual(form.get("media_1"), null);
  });

  test("live_photo carries two files (media_0 + media_1 within one item)", async () => {
    const a = fileA();
    const b = fileB();
    const form = (await enc({ chat_id: 1, star_count: 1, media: [{ type: "live_photo", media: a, photo: b }] }))
      .body as FormData;
    const item = JSON.parse(form.get("media") as string)[0];
    assert.strictEqual(item.media, "attach://media_0");
    assert.strictEqual(item.photo, "attach://media_1");
    assert.ok(form.get("media_0") instanceof Blob);
    assert.ok(form.get("media_1") instanceof Blob);
  });

  test("two file-capable fields in one request get disjoint slots (sendPoll)", async () => {
    const a = fileA();
    const b = fileB();
    const form = (
      await enc({
        chat_id: 1,
        question: "q",
        explanation_media: { type: "photo", media: a },
        media: { type: "photo", media: b },
      })
    ).body as FormData;
    assert.strictEqual(JSON.parse(form.get("explanation_media") as string).media, "attach://media_0");
    assert.strictEqual(JSON.parse(form.get("media") as string).media, "attach://media_1");
    assert.ok(form.get("media_0") instanceof Blob);
    assert.ok(form.get("media_1") instanceof Blob);
  });

  test("a MediaGroupBuilder builder result serializes identically to the plain literal", async () => {
    const a = fileA();
    const fromBuilder = (
      await enc({ chat_id: 1, media: new MediaGroupBuilder().photo({ media: a, caption: "A" }).build() })
    ).body as FormData;
    const fromLiteral = (await enc({ chat_id: 1, media: [{ type: "photo", media: a, caption: "A" }] }))
      .body as FormData;
    assert.deepStrictEqual(JSON.parse(fromBuilder.get("media") as string), JSON.parse(fromLiteral.get("media") as string));
  });
});
