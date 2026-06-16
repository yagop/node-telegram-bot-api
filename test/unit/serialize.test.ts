import { describe, expect, test } from "bun:test";
import { encodeForm } from "../../src/core/encode.js";
import { serializeParams } from "../../src/core/serialize.js";
import { InputFile } from "../../src/core/files.js";
import { MediaGroup } from "../../src/core/media.js";

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
    expect(body).toBeInstanceOf(URLSearchParams);
    expect(headers["content-type"]).toBe("application/x-www-form-urlencoded");
    const p = body as URLSearchParams;
    expect(p.get("chat_id")).toBe("1");
    expect(p.get("disable_notification")).toBe("true");
    expect(JSON.parse(p.get("reply_markup")!)).toEqual({ inline_keyboard: [[{ text: "A", callback_data: "a" }]] });
    expect(JSON.parse(p.get("entities")!)).toEqual([{ type: "bold", offset: 0, length: 2 }]);
  });

  test("array field is stringified", async () => {
    const { body } = await enc({ chat_id: 1, message_ids: [10, 11] });
    expect((body as URLSearchParams).get("message_ids")).toBe("[10,11]");
  });

  test("null/undefined fields are dropped before the wire", async () => {
    const { body } = await enc({ chat_id: 1, caption: null, reply_to_message_id: undefined, text: "keep" });
    const p = body as URLSearchParams;
    expect(p.get("chat_id")).toBe("1");
    expect(p.get("text")).toBe("keep");
    expect(p.has("caption")).toBe(false);
    expect(p.has("reply_to_message_id")).toBe(false);
  });

  test("top-level InputFile attaches under the field name (multipart)", async () => {
    const f = fileA();
    const form = (await enc({ chat_id: 1, photo: f, caption: "x" })).body as FormData;
    expect(form.get("chat_id")).toBe("1");
    expect(form.get("caption")).toBe("x");
    const part = form.get("photo");
    expect(part).toBeInstanceOf(Blob);
    expect((part as File).name).toBe("a.bin");
    // a top-level file is NOT renamed to media_0
    expect(form.get("media_0")).toBeNull();
  });

  test("nested file in a media group -> attach://media_0 + keyed part; URL passes through", async () => {
    const a = fileA();
    const form = (await enc({
      chat_id: 1,
      media: [{ type: "photo", media: a, caption: "A" }, { type: "photo", media: "https://x/b.jpg" }],
    })).body as FormData;
    const parsed = JSON.parse(form.get("media") as string) as Array<Record<string, unknown>>;
    expect(parsed[0]!.media).toBe("attach://media_0");
    expect(parsed[0]!.caption).toBe("A");
    expect(parsed[1]!.media).toBe("https://x/b.jpg");
    expect(form.get("media_0")).toBeInstanceOf(Blob);
    expect(form.get("media_1")).toBeNull();
  });

  test("live_photo carries two files (media_0 + media_1 within one item)", async () => {
    const a = fileA();
    const b = fileB();
    const form = (await enc({ chat_id: 1, star_count: 1, media: [{ type: "live_photo", media: a, photo: b }] })).body as FormData;
    const item = JSON.parse(form.get("media") as string)[0];
    expect(item.media).toBe("attach://media_0");
    expect(item.photo).toBe("attach://media_1");
    expect(form.get("media_0")).toBeInstanceOf(Blob);
    expect(form.get("media_1")).toBeInstanceOf(Blob);
  });

  test("two file-capable fields in one request get disjoint slots (sendPoll)", async () => {
    const a = fileA();
    const b = fileB();
    const form = (await enc({
      chat_id: 1,
      question: "q",
      explanation_media: { type: "photo", media: a },
      media: { type: "photo", media: b },
    })).body as FormData;
    expect(JSON.parse(form.get("explanation_media") as string).media).toBe("attach://media_0");
    expect(JSON.parse(form.get("media") as string).media).toBe("attach://media_1");
    expect(form.get("media_0")).toBeInstanceOf(Blob);
    expect(form.get("media_1")).toBeInstanceOf(Blob);
  });

  test("a MediaGroup builder result serializes identically to the plain literal", async () => {
    const a = fileA();
    const fromBuilder = (await enc({ chat_id: 1, media: new MediaGroup().photo(a, { caption: "A" }).build() })).body as FormData;
    const fromLiteral = (await enc({ chat_id: 1, media: [{ type: "photo", media: a, caption: "A" }] })).body as FormData;
    expect(JSON.parse(fromBuilder.get("media") as string)).toEqual(JSON.parse(fromLiteral.get("media") as string));
  });
});
