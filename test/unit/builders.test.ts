import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { EntityBuilder } from "../../src/core/entities.js";
import { InlineKeyboardBuilder } from "../../src/core/keyboard.js";

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
