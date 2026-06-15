import { describe, expect, test } from "bun:test";
import { encodeForm } from "../../src/core/encode.js";
import { inputFile } from "../../src/core/files.js";
import { MediaGroup } from "../../src/core/media.js";

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
      photo: inputFile(new Uint8Array([1, 2, 3]), { filename: "p.png" }),
    });
    expect(body).toBeInstanceOf(FormData);
    expect(headers).toEqual({});
    const form = body as FormData;
    expect(form.get("chat_id")).toBe("1");
    const photo = form.get("photo");
    expect(photo).toBeInstanceOf(Blob);
    // In a web FormData a file entry is a File; assert its filename.
    expect((photo as File).name).toBe("p.png");
    expect((photo as Blob).size).toBe(3);
  });

  test("null/undefined fields are skipped", async () => {
    const { body } = await encodeForm({
      chat_id: 1,
      caption: null,
      reply_to_message_id: undefined,
      text: "keep",
    });
    const params = body as URLSearchParams;
    expect(params.get("chat_id")).toBe("1");
    expect(params.get("text")).toBe("keep");
    expect(params.has("caption")).toBe(false);
    expect(params.has("reply_to_message_id")).toBe(false);
  });

  test("MediaGroup FormPart -> FormData with media JSON + file part", async () => {
    const media = new MediaGroup()
      .photo(inputFile(new Uint8Array([1])), { caption: "A" })
      .photo("https://x/b.jpg")
      .build();
    const { body, headers } = await encodeForm({ chat_id: 1, media });
    expect(body).toBeInstanceOf(FormData);
    expect(headers).toEqual({});
    const form = body as FormData;
    expect(form.get("chat_id")).toBe("1");

    const mediaField = form.get("media");
    expect(typeof mediaField).toBe("string");
    const parsed = JSON.parse(mediaField as string) as Array<Record<string, unknown>>;
    expect(parsed[0]!.media).toBe("attach://file_0");
    expect(parsed[0]!.caption).toBe("A");
    expect(parsed[1]!.media).toBe("https://x/b.jpg");

    // The first item's bytes ride along as a part keyed "file_0".
    const filePart = form.get("file_0");
    expect(filePart).toBeInstanceOf(Blob);
    // The URL-based item must not produce a file part.
    expect(form.get("file_1")).toBeNull();
  });
});
