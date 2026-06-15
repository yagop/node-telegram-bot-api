import { describe, expect, test } from "bun:test";
import {
  InlineKeyboard,
  forceReply,
  removeKeyboard,
} from "../../src/core/keyboard.js";
import { fmt } from "../../src/core/entities.js";
import { json } from "../../src/core/json.js";

describe("InlineKeyboard", () => {
  test("rows produce the expected inline_keyboard shape", () => {
    const markup = new InlineKeyboard()
      .text("A", "a")
      .text("B", "b")
      .row()
      .url("Docs", "https://x")
      .build();
    const parsed = JSON.parse(markup) as {
      inline_keyboard: Array<Array<Record<string, unknown>>>;
    };
    expect(parsed.inline_keyboard.length).toBe(2);
    expect(parsed.inline_keyboard[0]).toEqual([
      { text: "A", callback_data: "a" },
      { text: "B", callback_data: "b" },
    ]);
    expect(parsed.inline_keyboard[1]).toEqual([{ text: "Docs", url: "https://x" }]);
  });

  test("trailing empty rows are dropped", () => {
    const markup = new InlineKeyboard().text("A", "a").row().build();
    const parsed = JSON.parse(markup) as { inline_keyboard: unknown[] };
    expect(parsed.inline_keyboard.length).toBe(1);
  });
});

describe("fmt()", () => {
  test("text + entity offsets are computed in UTF-16 units (no auto-spacing)", () => {
    const { text, entities } = fmt()
      .plain("Hello ")
      .bold("world")
      .link("docs", "https://x")
      .build();

    // The builder adds no separators between segments.
    expect(text).toBe("Hello worlddocs");

    const ents = JSON.parse(entities) as Array<{
      type: string;
      offset: number;
      length: number;
      url?: string;
    }>;
    expect(ents.length).toBe(2);
    // "world" starts right after "Hello " (offset 6), length 5.
    expect(ents[0]).toEqual({ type: "bold", offset: 6, length: 5 });
    // "docs" follows "Hello world" (offset 11), length 4, with the url.
    expect(ents[1]).toEqual({
      type: "text_link",
      offset: 11,
      length: 4,
      url: "https://x",
    });
  });
});

describe("simple markup helpers", () => {
  test("removeKeyboard() shape", () => {
    expect(JSON.parse(removeKeyboard())).toEqual({ remove_keyboard: true });
    expect(JSON.parse(removeKeyboard({ selective: true }))).toEqual({
      remove_keyboard: true,
      selective: true,
    });
  });

  test("forceReply() shape", () => {
    expect(JSON.parse(forceReply())).toEqual({ force_reply: true });
    expect(
      JSON.parse(forceReply({ input_field_placeholder: "Name?" })),
    ).toEqual({ force_reply: true, input_field_placeholder: "Name?" });
  });

  test("json() round-trips", () => {
    const value = { a: 1, b: ["x", "y"], c: { nested: true } };
    expect(JSON.parse(json(value))).toEqual(value);
  });
});
