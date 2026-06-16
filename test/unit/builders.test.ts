import { describe, expect, test } from "bun:test";
import { EntityBuilder } from "../../src/core/entities.js";
import { InlineKeyboardBuilder } from "../../src/core/keyboard.js";

describe("InlineKeyboardBuilder", () => {
  test("rows produce the expected inline_keyboard shape", () => {
    const markup = new InlineKeyboardBuilder().text("A", "a").text("B", "b").row().url("Docs", "https://x").build();
    expect(markup.inline_keyboard.length).toBe(2);
    expect(markup.inline_keyboard[0]).toEqual([
      { text: "A", callback_data: "a" },
      { text: "B", callback_data: "b" },
    ]);
    expect(markup.inline_keyboard[1]).toEqual([{ text: "Docs", url: "https://x" }]);
  });

  test("trailing empty rows are dropped", () => {
    const markup = new InlineKeyboardBuilder().text("A", "a").row().build();
    expect(markup.inline_keyboard.length).toBe(1);
  });
});

describe("EntityBuilder", () => {
  test("text + entity offsets are computed in UTF-16 units (no auto-spacing)", () => {
    const { text, entities } = new EntityBuilder().plain("Hello ").bold("world").link("docs", "https://x").build();

    // The builder adds no separators between segments.
    expect(text).toBe("Hello worlddocs");
    expect(entities.length).toBe(2);
    // "world" starts right after "Hello " (offset 6), length 5.
    expect(entities[0]).toEqual({ type: "bold", offset: 6, length: 5 });
    // "docs" follows "Hello world" (offset 11), length 4, with the url.
    expect(entities[1]).toEqual({ type: "text_link", offset: 11, length: 4, url: "https://x" });
  });
});
