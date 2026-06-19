import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Api } from "../../src/core/api.js";
import { Context } from "../../src/core/context.js";
import type { Update } from "../../src/types/index.js";

/** A minimal message update keyed for the discriminated-union accessors. */
function messageUpdate(): Update {
  return {
    update_id: 1,
    message: {
      message_id: 10,
      date: 0,
      chat: { id: 555, type: "private" },
      from: { id: 777, is_bot: false, first_name: "Ada" },
      text: "hi",
    },
  } as unknown as Update;
}

/** A fake Api recording the calls the Context makes. */
function fakeApi() {
  const calls: { sendMessage: unknown[]; answerCallbackQuery: unknown[] } = {
    sendMessage: [],
    answerCallbackQuery: [],
  };
  const api = {
    sendMessage: async (params: unknown) => {
      calls.sendMessage.push(params);
      return { message_id: 11 };
    },
    answerCallbackQuery: async (params: unknown) => {
      calls.answerCallbackQuery.push(params);
      return true;
    },
  } as unknown as Api;
  return { api, calls };
}

describe("Context", () => {
  test("reply() sends to the inferred chat id", async () => {
    const { api, calls } = fakeApi();
    const ctx = new Context(messageUpdate(), api);
    await ctx.reply("pong");
    assert.strictEqual(calls.sendMessage.length, 1);
    assert.deepStrictEqual(calls.sendMessage[0], { chat_id: 555, text: "pong" });
  });

  test("reply() forwards extra options", async () => {
    const { api, calls } = fakeApi();
    const ctx = new Context(messageUpdate(), api);
    await ctx.reply("pong", { parse_mode: "HTML" });
    assert.deepStrictEqual(calls.sendMessage[0], {
      chat_id: 555,
      text: "pong",
      parse_mode: "HTML",
    });
  });

  test("chat / from / chatId accessors", () => {
    const { api } = fakeApi();
    const ctx = new Context(messageUpdate(), api);
    assert.strictEqual(ctx.chat?.id, 555);
    assert.strictEqual(ctx.from?.id, 777);
    assert.strictEqual(ctx.chatId, 555);
    assert.strictEqual(ctx.message?.text, "hi");
  });

  test("answerCallbackQuery() throws on a non-callback update", () => {
    const { api } = fakeApi();
    const ctx = new Context(messageUpdate(), api);
    assert.throws(() => ctx.answerCallbackQuery(), /this update has no callback query/);
  });

  test("answerCallbackQuery() answers a callback update", async () => {
    const { api, calls } = fakeApi();
    const cbUpdate = {
      update_id: 2,
      callback_query: {
        id: "cq1",
        from: { id: 9, is_bot: false, first_name: "Z" },
        chat_instance: "ci",
        data: "x",
        message: {
          message_id: 3,
          date: 0,
          chat: { id: 444, type: "private" },
        },
      },
    } as unknown as Update;
    const ctx = new Context(cbUpdate, api);
    await ctx.answerCallbackQuery({ text: "ok" });
    assert.deepStrictEqual(calls.answerCallbackQuery[0], {
      callback_query_id: "cq1",
      text: "ok",
    });
    assert.strictEqual(ctx.chatId, 444);
  });

  test("chat / chatId resolve for every variant that carries a chat (regression)", () => {
    const { api } = fakeApi();
    const chat = { id: 4242, type: "private" };
    // The variants the v1 of this getter used to miss (business_message,
    // guest_message, deleted_business_messages, message_reaction_count,
    // chat_boost, removed_chat_boost). Each MUST expose ctx.chat / ctx.chatId so
    // ctx.reply works in handlers registered via bot.on(<kind>, ...).
    const cases: Array<{ kind: string; payload: Record<string, unknown> }> = [
      { kind: "business_message", payload: { message_id: 1, date: 0, chat, text: "bm" } },
      { kind: "edited_business_message", payload: { message_id: 1, date: 0, chat, text: "ebm" } },
      { kind: "deleted_business_messages", payload: { business_connection_id: "x", chat, message_ids: [1] } },
      { kind: "guest_message", payload: { message_id: 1, date: 0, chat, text: "gm" } },
      { kind: "message_reaction_count", payload: { chat, message_id: 1, date: 0, reactions: [] } },
      { kind: "chat_boost", payload: { chat, boost: { boost_id: "b", source: { source: "premium" }, add_date: 0 } } },
      { kind: "removed_chat_boost", payload: { chat, boost_id: "b", remove_date: 0, source: { source: "premium" } } },
    ];
    for (const { kind, payload } of cases) {
      const ctx = new Context({ update_id: 1, [kind]: payload } as unknown as Update, api);
      assert.strictEqual(ctx.chat?.id, 4242, `${kind} should resolve a chat`);
      assert.strictEqual(ctx.chatId, 4242, `${kind} should resolve chatId`);
    }
  });

  test("from resolves for variants whose actor is a User (regression)", () => {
    const { api } = fakeApi();
    const user = { id: 5050, is_bot: false, first_name: "U" };
    const cases: Array<{ kind: string; payload: Record<string, unknown> }> = [
      { kind: "business_connection", payload: { id: "bc", user, user_chat_id: 1, date: 0, is_enabled: true } },
      { kind: "business_message", payload: { message_id: 1, date: 0, chat: { id: 1, type: "private" }, from: user, text: "x" } },
      { kind: "guest_message", payload: { message_id: 1, date: 0, chat: { id: 1, type: "private" }, from: user, text: "x" } },
      { kind: "managed_bot", payload: { user, bot: { id: 2, is_bot: true, first_name: "B" } } },
    ];
    for (const { kind, payload } of cases) {
      const ctx = new Context({ update_id: 1, [kind]: payload } as unknown as Update, api);
      assert.strictEqual(ctx.from?.id, 5050, `${kind} should resolve a from user`);
    }
  });
});
