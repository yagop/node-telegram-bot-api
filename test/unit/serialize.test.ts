import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { type EncodedRequest, encodeForm } from "../../src/core/encode.js";
import { InputFile } from "../../src/core/files.js";
import { MediaGroupBuilder } from "../../src/core/media.js";
import { serializeParams } from "../../src/core/serialize.js";
import type { SendMessageParams } from "../../src/types/index.js";

/** Plain params -> serializeParams -> encodeForm. */
const enc = (p: Record<string, unknown>) => encodeForm(serializeParams(p));
const fileA = () => new InputFile(new Uint8Array([1, 2, 3]), { filename: "a.bin", contentType: "image/png" });
const fileB = () => new InputFile(new Uint8Array([4, 5]), { filename: "b.bin", contentType: "image/jpeg" });

type Part = { filename?: string; value: string };

/** Drain a multipart EncodedRequest and index its parts by field name. */
async function parts(req: EncodedRequest): Promise<Map<string, Part>> {
  const boundary = /boundary=(?<b>\S+)/.exec(req.headers["content-type"] ?? "")?.groups?.b;
  assert.ok(boundary, `not multipart: ${req.headers["content-type"]}`);
  const text = await new Response(req.body() as ConstructorParameters<typeof Response>[0]).text();
  const map = new Map<string, Part>();
  for (const segment of text.split(`--${boundary}`)) {
    if (!segment.startsWith("\r\n")) continue; // the "" preamble / the "--\r\n" epilogue
    const sep = segment.indexOf("\r\n\r\n");
    const head = segment.slice(2, sep);
    const value = segment.slice(sep + 4).replace(/\r\n$/, "");
    const name = /name="(?<n>[^"]*)"/.exec(head)?.groups?.n;
    assert.ok(name, `part without a name: ${head}`);
    map.set(name, { filename: /filename="(?<f>[^"]*)"/.exec(head)?.groups?.f, value });
  }
  return map;
}

describe("serializeParams", () => {
  test("structured fields are JSON-stringified; scalars coerced; no files -> urlencoded", async () => {
    const { body, headers } = await enc({
      chat_id: 1,
      text: "hi",
      disable_notification: true,
      reply_markup: { inline_keyboard: [[{ text: "A", callback_data: "a" }]] },
      entities: [{ type: "bold", offset: 0, length: 2 }],
    });
    const p = body();
    assert.ok(p instanceof URLSearchParams);
    assert.strictEqual(headers["content-type"], "application/x-www-form-urlencoded");
    assert.strictEqual(p.get("chat_id"), "1");
    assert.strictEqual(p.get("disable_notification"), "true");
    assert.deepStrictEqual(JSON.parse(p.get("reply_markup")!), { inline_keyboard: [[{ text: "A", callback_data: "a" }]] });
    assert.deepStrictEqual(JSON.parse(p.get("entities")!), [{ type: "bold", offset: 0, length: 2 }]);
  });

  test("array field is stringified", async () => {
    const { body } = await enc({ chat_id: 1, message_ids: [10, 11] });
    assert.strictEqual((body() as URLSearchParams).get("message_ids"), "[10,11]");
  });

  test("null/undefined fields are dropped before the wire", async () => {
    const { body } = await enc({ chat_id: 1, caption: null, reply_to_message_id: undefined, text: "keep" });
    const p = body() as URLSearchParams;
    assert.strictEqual(p.get("chat_id"), "1");
    assert.strictEqual(p.get("text"), "keep");
    assert.strictEqual(p.has("caption"), false);
    assert.strictEqual(p.has("reply_to_message_id"), false);
  });

  test("top-level InputFile attaches under the field name (multipart)", async () => {
    const form = await parts(await enc({ chat_id: 1, photo: fileA(), caption: "x" }));
    assert.strictEqual(form.get("chat_id")?.value, "1");
    assert.strictEqual(form.get("caption")?.value, "x");
    assert.strictEqual(form.get("photo")?.filename, "a.bin");
    assert.strictEqual(form.get("photo")?.value, "\x01\x02\x03");
    // a top-level file is NOT renamed to media_0
    assert.strictEqual(form.has("media_0"), false);
  });

  test("nested file in a media group -> attach://media_0 + keyed part; URL passes through", async () => {
    const form = await parts(
      await enc({
        chat_id: 1,
        media: [
          { type: "photo", media: fileA(), caption: "A" },
          { type: "photo", media: "https://x/b.jpg" },
        ],
      }),
    );
    const parsed = JSON.parse(form.get("media")!.value) as Array<Record<string, unknown>>;
    assert.strictEqual(parsed[0]!.media, "attach://media_0");
    assert.strictEqual(parsed[0]!.caption, "A");
    assert.strictEqual(parsed[1]!.media, "https://x/b.jpg");
    assert.strictEqual(form.get("media_0")?.filename, "a.bin");
    assert.strictEqual(form.has("media_1"), false);
  });

  test("live_photo carries two files (media_0 + media_1 within one item)", async () => {
    const form = await parts(
      await enc({ chat_id: 1, star_count: 1, media: [{ type: "live_photo", media: fileA(), photo: fileB() }] }),
    );
    const item = JSON.parse(form.get("media")!.value)[0];
    assert.strictEqual(item.media, "attach://media_0");
    assert.strictEqual(item.photo, "attach://media_1");
    assert.strictEqual(form.get("media_0")?.filename, "a.bin");
    assert.strictEqual(form.get("media_1")?.filename, "b.bin");
  });

  test("two file-capable fields in one request get disjoint slots (sendPoll)", async () => {
    const form = await parts(
      await enc({
        chat_id: 1,
        question: "q",
        explanation_media: { type: "photo", media: fileA() },
        media: { type: "photo", media: fileB() },
      }),
    );
    assert.strictEqual(JSON.parse(form.get("explanation_media")!.value).media, "attach://media_0");
    assert.strictEqual(JSON.parse(form.get("media")!.value).media, "attach://media_1");
    assert.strictEqual(form.get("media_0")?.filename, "a.bin");
    assert.strictEqual(form.get("media_1")?.filename, "b.bin");
  });

  test("a MediaGroupBuilder builder result serializes identically to the plain literal", async () => {
    const fromBuilder = await parts(
      await enc({ chat_id: 1, media: new MediaGroupBuilder().photo({ media: fileA(), caption: "A" }).build() }),
    );
    const fromLiteral = await parts(await enc({ chat_id: 1, media: [{ type: "photo", media: fileA(), caption: "A" }] }));
    assert.deepStrictEqual(JSON.parse(fromBuilder.get("media")!.value), JSON.parse(fromLiteral.get("media")!.value));
  });
});

describe("reply_markup", () => {
  const inline_keyboard = [[{ text: "A", callback_data: "a" }]];
  const keyboard = [[{ text: "B" }]];

  test("each ReplyMarkup shape is serialized as given", async () => {
    const valid: SendMessageParams["reply_markup"][] = [
      { inline_keyboard },
      { inline_keyboard, force_reply: true },
      { keyboard, is_persistent: true, force_reply: true },
      { remove_keyboard: true, selective: true },
      { force_reply: true, input_field_placeholder: "x" },
    ];
    for (const reply_markup of valid) {
      const p = (await enc({ chat_id: 1, text: "hi", reply_markup })).body() as URLSearchParams;
      assert.deepStrictEqual(JSON.parse(p.get("reply_markup")!), reply_markup);
    }
  });

  // Checked by `npm run typecheck:test`: Telegram uses one reply markup per message (#1078).
  test("mixing reply-markup objects is a type error", () => {
    const mixed: SendMessageParams["reply_markup"][] = [
      // @ts-expect-error inline keyboard + reply keyboard
      { inline_keyboard, keyboard },
      // @ts-expect-error inline keyboard + remove
      { inline_keyboard, remove_keyboard: true },
      // @ts-expect-error reply keyboard + remove
      { keyboard, remove_keyboard: true },
    ];
    assert.strictEqual(mixed.length, 3);
  });
});
