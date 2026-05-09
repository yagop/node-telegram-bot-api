import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  UpdateSchema,
  MessageSchema,
  UserSchema,
  ChatSchema,
  CallbackQuerySchema,
  ReactionTypeSchema,
  TelegramApiResponseSchema,
  MESSAGE_TYPES,
} from "../../src/types/schemas.js";

describe("zod schemas", () => {
  describe("UserSchema", () => {
    it("accepts a minimal valid User", () => {
      const u = UserSchema.parse({ id: 42, is_bot: false, first_name: "Alice" });
      assert.equal(u.id, 42);
      assert.equal(u.first_name, "Alice");
    });

    it("rejects when required fields are missing", () => {
      assert.throws(() => UserSchema.parse({ id: 1 }));
    });

    it("preserves unknown fields via passthrough", () => {
      const u = UserSchema.parse({
        id: 1,
        is_bot: true,
        first_name: "Bot",
        // Hypothetical new field added by Telegram in the future
        future_flag: true,
      });
      assert.equal((u as Record<string, unknown>).future_flag, true);
    });
  });

  describe("ChatSchema", () => {
    it("validates the chat type enum", () => {
      ChatSchema.parse({ id: -1, type: "supergroup" });
      assert.throws(() => ChatSchema.parse({ id: 1, type: "unknown" }));
    });
  });

  describe("MessageSchema", () => {
    it("recursively validates pinned/replied messages", () => {
      const msg = MessageSchema.parse({
        message_id: 1,
        date: 1700000000,
        chat: { id: 1, type: "private" },
        text: "hi",
        reply_to_message: {
          message_id: 0,
          date: 1699999999,
          chat: { id: 1, type: "private" },
          text: "older",
        },
      });
      assert.equal(msg.reply_to_message?.text, "older");
    });
  });

  describe("UpdateSchema", () => {
    it("validates a polling getUpdates result entry", () => {
      const update = UpdateSchema.parse({
        update_id: 1234,
        message: {
          message_id: 1,
          date: 1700000000,
          chat: { id: 7, type: "private" },
          text: "hello",
        },
      });
      assert.equal(update.update_id, 1234);
      assert.equal(update.message?.text, "hello");
    });

    it("validates a callback_query update", () => {
      const update = UpdateSchema.parse({
        update_id: 1,
        callback_query: {
          id: "abc",
          from: { id: 1, is_bot: false, first_name: "X" },
          chat_instance: "abc",
          data: "ping",
        },
      });
      assert.equal(update.callback_query?.data, "ping");
    });
  });

  describe("CallbackQuerySchema", () => {
    it("requires id, from and chat_instance", () => {
      assert.throws(() =>
        CallbackQuerySchema.parse({
          id: "1",
          from: { id: 1, is_bot: false, first_name: "X" },
        }),
      );
    });
  });

  describe("ReactionTypeSchema", () => {
    it("discriminates by `type`", () => {
      const emoji = ReactionTypeSchema.parse({ type: "emoji", emoji: "👍" });
      assert.equal(emoji.type, "emoji");
      const custom = ReactionTypeSchema.parse({ type: "custom_emoji", custom_emoji_id: "1" });
      assert.equal(custom.type, "custom_emoji");
      const paid = ReactionTypeSchema.parse({ type: "paid" });
      assert.equal(paid.type, "paid");
    });
  });

  describe("TelegramApiResponseSchema", () => {
    it("accepts ok=true with arbitrary result", () => {
      const r = TelegramApiResponseSchema.parse({ ok: true, result: { id: 1 } });
      assert.equal(r.ok, true);
    });

    it("accepts ok=false with description and error_code", () => {
      const r = TelegramApiResponseSchema.parse({
        ok: false,
        error_code: 400,
        description: "Bad Request: chat not found",
      });
      assert.equal(r.error_code, 400);
    });
  });

  describe("MESSAGE_TYPES", () => {
    it("includes the legacy + 2024-2025 message events", () => {
      assert.ok(MESSAGE_TYPES.includes("text"));
      assert.ok(MESSAGE_TYPES.includes("photo"));
      assert.ok(MESSAGE_TYPES.includes("video_chat_started"));
      assert.ok(MESSAGE_TYPES.includes("message_reaction"));
      assert.ok(MESSAGE_TYPES.includes("web_app_data"));
    });
  });
});
