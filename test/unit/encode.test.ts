import { describe, expect, test } from "bun:test";
import { encodeForm } from "../../src/core/encode.js";
import { InputFile, formPart } from "../../src/core/files.js";

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
    expect(body).toBeInstanceOf(URLSearchParams);
    expect(headers["content-type"]).toBe("application/x-www-form-urlencoded");
    const params = body as URLSearchParams;
    expect(params.get("chat_id")).toBe("1");
    expect(params.get("text")).toBe("hi");
    expect(params.get("reply_markup")).toBe('{"inline_keyboard":[]}');
  });

  test("with file -> FormData with string field + Blob/File part, empty headers", async () => {
    const { body, headers } = await encodeForm({
      chat_id: 1,
      photo: new InputFile(new Uint8Array([1, 2, 3]), { filename: "p.png" }),
    });
    expect(body).toBeInstanceOf(FormData);
    expect(headers).toEqual({});
    const form = body as FormData;
    expect(form.get("chat_id")).toBe("1");
    const photo = form.get("photo");
    expect(photo).toBeInstanceOf(Blob);
    expect((photo as File).name).toBe("p.png");
    expect((photo as Blob).size).toBe(3);
  });

  test("a FormPart writes its field string + keyed parts (multipart)", async () => {
    const file = new InputFile(new Uint8Array([9]), { filename: "m.bin" });
    const part = formPart('[{"type":"photo","media":"attach://media_0"}]', [["media_0", file]]);
    const form = (await encodeForm({ chat_id: 1, media: part })).body as FormData;
    expect(form.get("media")).toBe('[{"type":"photo","media":"attach://media_0"}]');
    expect(form.get("media_0")).toBeInstanceOf(Blob);
    expect((form.get("media_0") as File).name).toBe("m.bin");
  });
});
