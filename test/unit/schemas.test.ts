import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { MESSAGE_TYPES } from "../../src/types/schemas.js";
import type {
  Update,
  Message,
  User,
  Chat,
  CallbackQuery,
  ReactionType,
} from "../../src/types/schemas.js";

/**
 * The generated types carry no runtime validation (Zod was removed), so these
 * are compile-time assertions: each typed declaration below fails `tsc` if the
 * literal doesn't conform to its generated type.
 */
describe("generated types", () => {
  describe("User", () => {
    it("accepts a minimal valid User", () => {
      const u: User = { id: 42, is_bot: false, first_name: "Alice" };
      assert.equal(u.id, 42);
      assert.equal(u.first_name, "Alice");
    });

    it("allows the optional fields", () => {
      const u: User = {
        id: 1,
        is_bot: true,
        first_name: "Bot",
        username: "bot",
        can_join_groups: true,
      };
      assert.equal(u.username, "bot");
    });
  });

  describe("Chat", () => {
    it("types the chat type field", () => {
      const c: Chat = { id: -1, type: "supergroup" };
      assert.equal(c.type, "supergroup");
    });
  });

  describe("Message", () => {
    it("recursively types pinned/replied messages", () => {
      const msg: Message = {
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
      };
      assert.equal(msg.reply_to_message?.text, "older");
    });
  });

  describe("Update", () => {
    it("types a polling getUpdates result entry", () => {
      const update: Update = {
        update_id: 1234,
        message: {
          message_id: 1,
          date: 1700000000,
          chat: { id: 7, type: "private" },
          text: "hello",
        },
      };
      assert.equal(update.update_id, 1234);
      assert.equal(update.message?.text, "hello");
    });

    it("types a callback_query update", () => {
      const update: Update = {
        update_id: 1,
        callback_query: {
          id: "abc",
          from: { id: 1, is_bot: false, first_name: "X" },
          chat_instance: "abc",
          data: "ping",
        },
      };
      assert.equal(update.callback_query?.data, "ping");
    });
  });

  describe("CallbackQuery", () => {
    it("types id, from and chat_instance", () => {
      const q: CallbackQuery = {
        id: "1",
        from: { id: 1, is_bot: false, first_name: "X" },
        chat_instance: "ci",
      };
      assert.equal(q.id, "1");
    });
  });

  describe("ReactionType", () => {
    it("is a union over `type`", () => {
      const emoji: ReactionType = { type: "emoji", emoji: "👍" };
      assert.equal(emoji.type, "emoji");
      const custom: ReactionType = { type: "custom_emoji", custom_emoji_id: "1" };
      assert.equal(custom.type, "custom_emoji");
      const paid: ReactionType = { type: "paid" };
      assert.equal(paid.type, "paid");
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
