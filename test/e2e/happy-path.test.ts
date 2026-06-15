/**
 * Real round-trips against the test group.
 *
 * Unlike the wiring matrix (which only proves the pipeline is connected), these
 * tests send real requests with real parameters and assert on real response
 * fields. They require a token AND a `TEST_GROUP_ID` the bot belongs to, and
 * each test cleans up after itself (best-effort, even on assertion failure).
 */
import { describe, expect, test } from "bun:test";
import { InlineKeyboard } from "../../src/core/keyboard.js";
import type { Api } from "../../src/core/api.js";
import { GROUP_ID, hasToken, makeApi } from "./_env.js";

const live = hasToken && typeof GROUP_ID === "string" && GROUP_ID.length > 0;

// Lazily share one rate-limited Api so the skip path never constructs it.
let _api: Api | undefined;
function api(): Api {
  _api ??= makeApi();
  return _api;
}

/** Best-effort delete; swallow any failure so cleanup never masks a real result. */
async function safeDelete(messageId: number): Promise<void> {
  try {
    await api().deleteMessage({ chat_id: GROUP_ID!, message_id: messageId });
  } catch {
    /* best-effort cleanup */
  }
}

describe.skipIf(!live)("happy path (live group round-trips)", () => {
  test("getMe returns the bot identity", async () => {
    const me = await api().getMe();
    expect(me.is_bot).toBe(true);
    expect(typeof me.id).toBe("number");
  });

  test("getChat returns the group with an id", async () => {
    const chat = await api().getChat({ chat_id: GROUP_ID! });
    expect(chat).toBeDefined();
    expect(chat.id).toBeDefined();
  });

  test("send → edit → delete a message", async () => {
    let messageId: number | undefined;
    try {
      const sent = await api().sendMessage({ chat_id: GROUP_ID!, text: "e2e ping" });
      messageId = sent.message_id;
      expect(typeof sent.message_id).toBe("number");
      expect(sent.text).toBe("e2e ping");

      const edited = await api().editMessageText({
        chat_id: GROUP_ID!,
        message_id: sent.message_id,
        text: "e2e edited",
      });
      // editMessageText returns `Message | true`; for own messages it's a Message.
      if (typeof edited !== "boolean") {
        expect(edited.text).toBe("e2e edited");
      }

      await api().deleteMessage({ chat_id: GROUP_ID!, message_id: sent.message_id });
      messageId = undefined; // deleted as part of the assertion path
    } finally {
      if (messageId !== undefined) await safeDelete(messageId);
    }
  });

  test("sendChatAction returns true", async () => {
    const ok = await api().sendChatAction({ chat_id: GROUP_ID!, action: "typing" });
    expect(ok).toBe(true);
  });

  test("sendMessage with an inline keyboard reply_markup", async () => {
    let messageId: number | undefined;
    try {
      const markup = new InlineKeyboard().text("A", "a").build();
      const sent = await api().sendMessage({
        chat_id: GROUP_ID!,
        text: "e2e keyboard",
        reply_markup: markup,
      });
      messageId = sent.message_id;
      expect(typeof sent.message_id).toBe("number");
    } finally {
      if (messageId !== undefined) await safeDelete(messageId);
    }
  });

  test("sendDice returns a dice result", async () => {
    let messageId: number | undefined;
    try {
      const sent = await api().sendDice({ chat_id: GROUP_ID! });
      messageId = sent.message_id;
      expect(sent.dice).toBeDefined();
    } finally {
      if (messageId !== undefined) await safeDelete(messageId);
    }
  });
});
