import { describe, expect, test } from "bun:test";
import { encodeForm } from "../../src/core/encode.js";
import { InputFile } from "../../src/core/files.js";
import {
  MediaGroup,
  StickerSetBuilder,
  inputSticker,
  profilePhoto,
  storyContent,
} from "../../src/core/media.js";

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
      .photo(new InputFile(new Uint8Array([1])), { caption: "A" })
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

describe("nested-file builders", () => {
  test("StickerSetBuilder -> stickers JSON with attach refs + keyed parts", async () => {
    const stickers = new StickerSetBuilder()
      .add(new InputFile(new Uint8Array([1])), { format: "static", emoji_list: ["🙂"] })
      .add("https://x/s.webp", { format: "static", emoji_list: ["😀"] })
      .build();
    const { body, headers } = await encodeForm({ user_id: 1, name: "x", title: "t", stickers });
    expect(body).toBeInstanceOf(FormData);
    expect(headers).toEqual({});
    const form = body as FormData;

    const parsed = JSON.parse(form.get("stickers") as string) as Array<Record<string, unknown>>;
    expect(parsed[0]!.sticker).toBe("attach://sticker_0");
    expect(parsed[0]!.format).toBe("static");
    expect(parsed[0]!.emoji_list).toEqual(["🙂"]);
    expect(parsed[1]!.sticker).toBe("https://x/s.webp"); // URL passes through, no part

    expect(form.get("sticker_0")).toBeInstanceOf(Blob);
    expect(form.get("sticker_1")).toBeNull();
  });

  test("inputSticker -> the file part does NOT clobber the `sticker` field", async () => {
    const sticker = inputSticker(new InputFile(new Uint8Array([2])), {
      format: "static",
      emoji_list: ["🙂"],
    });
    const { body } = await encodeForm({ user_id: 1, name: "x", sticker });
    const form = body as FormData;
    // The `sticker` field stays the JSON string; the bytes ride under `sticker_0`.
    expect(typeof form.get("sticker")).toBe("string");
    const parsed = JSON.parse(form.get("sticker") as string) as Record<string, unknown>;
    expect(parsed.sticker).toBe("attach://sticker_0");
    expect(form.get("sticker_0")).toBeInstanceOf(Blob);
  });

  test("profilePhoto.static -> photo field is JSON, bytes under photo_0", async () => {
    const photo = profilePhoto.static(new InputFile(new Uint8Array([3])));
    const { body } = await encodeForm({ photo });
    const form = body as FormData;
    expect(typeof form.get("photo")).toBe("string");
    const parsed = JSON.parse(form.get("photo") as string) as Record<string, unknown>;
    expect(parsed.type).toBe("static");
    expect(parsed.photo).toBe("attach://photo_0");
    expect(form.get("photo_0")).toBeInstanceOf(Blob);
  });

  test("storyContent.video -> content JSON keeps extras + video_0 part", async () => {
    const content = storyContent.video(new InputFile(new Uint8Array([4])), { duration: 10 });
    const { body } = await encodeForm({ business_connection_id: "b", content });
    const form = body as FormData;
    const parsed = JSON.parse(form.get("content") as string) as Record<string, unknown>;
    expect(parsed.type).toBe("video");
    expect(parsed.video).toBe("attach://video_0");
    expect(parsed.duration).toBe(10);
    expect(form.get("video_0")).toBeInstanceOf(Blob);
  });

  test("a plain string media uploads nothing (file_id/URL passes through)", async () => {
    const photo = profilePhoto.static("AgACAgIAAx-file-id");
    const { body, headers } = await encodeForm({ photo });
    // No InputFile anywhere -> urlencoded, not multipart.
    expect(body).toBeInstanceOf(URLSearchParams);
    expect(headers["content-type"]).toBe("application/x-www-form-urlencoded");
    const parsed = JSON.parse((body as URLSearchParams).get("photo") as string) as Record<string, unknown>;
    expect(parsed.photo).toBe("AgACAgIAAx-file-id");
  });
});
