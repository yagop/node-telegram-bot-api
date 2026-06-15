import { describe, expect, test } from "bun:test";
import { Context } from "../../src/core/context.js";
import type { Api } from "../../src/core/api.js";
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
    expect(calls.sendMessage.length).toBe(1);
    expect(calls.sendMessage[0]).toEqual({ chat_id: 555, text: "pong" });
  });

  test("reply() forwards extra options", async () => {
    const { api, calls } = fakeApi();
    const ctx = new Context(messageUpdate(), api);
    await ctx.reply("pong", { parse_mode: "HTML" });
    expect(calls.sendMessage[0]).toEqual({
      chat_id: 555,
      text: "pong",
      parse_mode: "HTML",
    });
  });

  test("chat / from / chatId accessors", () => {
    const { api } = fakeApi();
    const ctx = new Context(messageUpdate(), api);
    expect(ctx.chat?.id).toBe(555);
    expect(ctx.from?.id).toBe(777);
    expect(ctx.chatId).toBe(555);
    expect(ctx.message?.text).toBe("hi");
  });

  test("answerCallbackQuery() throws on a non-callback update", () => {
    const { api } = fakeApi();
    const ctx = new Context(messageUpdate(), api);
    expect(() => ctx.answerCallbackQuery()).toThrow(
      "this update has no callback query",
    );
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
    expect(calls.answerCallbackQuery[0]).toEqual({
      callback_query_id: "cq1",
      text: "ok",
    });
    expect(ctx.chatId).toBe(444);
  });
});
