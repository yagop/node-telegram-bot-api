import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { encodeForm } from "../../src/core/encode.js";
import { EntityBuilder } from "../../src/core/entities.js";
import { InputFile, isFormPart } from "../../src/core/files.js";
import { InlineKeyboardBuilder } from "../../src/core/keyboard.js";
import { RichMessageBuilder, richCaption, richListItem, richTableCell } from "../../src/core/richmessage.js";
import { RichTextBuilder, richMessageButton } from "../../src/core/richtext.js";
import { serializeParams } from "../../src/core/serialize.js";

describe("InlineKeyboardBuilder", () => {
  test("rows produce the expected inline_keyboard shape", () => {
    const markup = new InlineKeyboardBuilder().text("A", "a").text("B", "b").row().url("Docs", "https://x").build();
    assert.strictEqual(markup.inline_keyboard.length, 2);
    assert.deepStrictEqual(markup.inline_keyboard[0], [
      { text: "A", callback_data: "a" },
      { text: "B", callback_data: "b" },
    ]);
    assert.deepStrictEqual(markup.inline_keyboard[1], [{ text: "Docs", url: "https://x" }]);
  });

  test("trailing empty rows are dropped", () => {
    const markup = new InlineKeyboardBuilder().text("A", "a").row().build();
    assert.strictEqual(markup.inline_keyboard.length, 1);
  });
});

describe("EntityBuilder", () => {
  test("text + entity offsets are computed in UTF-16 units (no auto-spacing)", () => {
    const { text, entities } = new EntityBuilder().plain("Hello ").bold("world").link("docs", "https://x").build();

    // The builder adds no separators between segments.
    assert.strictEqual(text, "Hello worlddocs");
    assert.strictEqual(entities.length, 2);
    // "world" starts right after "Hello " (offset 6), length 5.
    assert.deepStrictEqual(entities[0], { type: "bold", offset: 6, length: 5 });
    // "docs" follows "Hello world" (offset 11), length 4, with the url.
    assert.deepStrictEqual(entities[1], { type: "text_link", offset: 11, length: 4, url: "https://x" });
  });
});

describe("RichTextBuilder", () => {
  test("wrapping nodes nest rich content; leaves carry their own data", () => {
    const value = new RichTextBuilder()
      .plain("hi ")
      .bold(new RichTextBuilder().italic("deep"))
      .url("site", "https://x")
      .mention("me", "user")
      .customEmoji("123", "*")
      .mathExpression("x^2")
      .build();

    assert.deepStrictEqual(value, [
      "hi ",
      { type: "bold", text: [{ type: "italic", text: "deep" }] },
      { type: "url", text: "site", url: "https://x" },
      { type: "mention", text: "me", username: "user" },
      { type: "custom_emoji", custom_emoji_id: "123", alternative_text: "*" },
      { type: "mathematical_expression", expression: "x^2" },
    ]);
  });

  test("a plain-string content passes through without wrapping", () => {
    const value = new RichTextBuilder().bold("x").build();
    assert.deepStrictEqual(value, [{ type: "bold", text: "x" }]);
  });

  test("richMessageButton attaches a rich label plus action fields", () => {
    assert.deepStrictEqual(richMessageButton("go", { url: "https://x", style: "primary" }), {
      text: "go",
      url: "https://x",
      style: "primary",
    });
  });
});

describe("RichMessageBuilder", () => {
  test("blocks accumulate with the correct discriminators", () => {
    const msg = new RichMessageBuilder()
      .heading("Title", 1)
      .paragraph("Body")
      .preformatted("code", "ts")
      .divider()
      .build();

    assert.deepStrictEqual(msg, {
      blocks: [
        { type: "heading", text: "Title", size: 1 },
        { type: "paragraph", text: "Body" },
        { type: "pre", text: "code", language: "ts" },
        { type: "divider" },
      ],
    });
  });

  test("nested blocks accept a callback builder; build options and media are attached", () => {
    const msg = new RichMessageBuilder()
      .blockquote((b) => b.paragraph("a").paragraph("b"), "src")
      .list([richListItem((b) => b.paragraph("item"), { has_checkbox: true, is_checked: true })])
      .buttons([richMessageButton("ok", { callback_data: "ok" })], "center")
      .build({ is_rtl: true });

    assert.ok(msg.blocks);
    assert.deepStrictEqual(msg.blocks[0], {
      type: "blockquote",
      blocks: [
        { type: "paragraph", text: "a" },
        { type: "paragraph", text: "b" },
      ],
      credit: "src",
    });
    assert.deepStrictEqual(msg.blocks[1], {
      type: "list",
      items: [{ blocks: [{ type: "paragraph", text: "item" }], has_checkbox: true, is_checked: true }],
    });
    assert.deepStrictEqual(msg.blocks[2], {
      type: "buttons",
      buttons: [{ text: "ok", callback_data: "ok" }],
      align: "center",
    });
    assert.strictEqual(msg.is_rtl, true);
  });

  test("table + caption helpers produce the wire shape", () => {
    const msg = new RichMessageBuilder()
      .table([[richTableCell("A", { align: "center", valign: "top", is_header: true })]], {
        is_bordered: true,
        caption: "Cap",
      })
      .build();

    assert.ok(msg.blocks);
    assert.deepStrictEqual(msg.blocks[0], {
      type: "table",
      cells: [[{ text: "A", align: "center", valign: "top", is_header: true }]],
      is_bordered: true,
      caption: "Cap",
    });
    assert.deepStrictEqual(richCaption("t", "c"), { text: "t", credit: "c" });
  });

  test("a nested InputFile in a media block is hoisted to an attach:// part", async () => {
    const file = new InputFile(new Uint8Array([1, 2, 3]), { filename: "p.png", contentType: "image/png" });
    const msg = new RichMessageBuilder()
      .photo({ type: "photo", media: file }, richCaption("shot"))
      .media("m1", { type: "photo", media: file })
      .build();

    const wire = serializeParams({ chat_id: 1, rich_message: msg });
    const req = await encodeForm(wire);
    // A file is present -> multipart, and the rich_message form-part JSON references attach://.
    assert.match(req.headers["content-type"] ?? "", /multipart\/form-data/);
    assert.ok(isFormPart(wire.rich_message));
    assert.match(wire.rich_message.json, /attach:\/\//);
  });
});
