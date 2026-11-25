import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Api } from "../../src/core/api.js";
import { Context } from "../../src/core/context.js";
import type { CallbackQuery, Update } from "../../src/types/index.js";

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
  const calls: {
    sendMessage: unknown[];
    answerCallbackQuery: unknown[];
    editMessageText: unknown[];
  } = {
    sendMessage: [],
    answerCallbackQuery: [],
    editMessageText: [],
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
    editMessageText: async (params: unknown) => {
      calls.editMessageText.push(params);
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

  // A button on an inline message: the callback query carries no chat.
  const chatlessCallback = {
    update_id: 1,
    callback_query: {
      id: "cb",
      from: { id: 9, is_bot: false, first_name: "U" },
      chat_instance: "ci",
      inline_message_id: "im",
    },
  } as unknown as Update;

  test("reply() without a chat sends an ephemeral callback reply", async () => {
    const { api, calls } = fakeApi();
    const ctx = new Context(chatlessCallback, api);
    await ctx.reply("pong", { ephemeral_message_parameters: { callback_query_id: "cb" } });
    assert.deepStrictEqual(calls.sendMessage[0], {
      text: "pong",
      ephemeral_message_parameters: { callback_query_id: "cb" },
    });
  });

  test("reply() without a chat throws unless it is an ephemeral callback reply", () => {
    const { api } = fakeApi();
    const ctx = new Context(chatlessCallback, api);
    assert.throws(() => ctx.reply("pong"), /cannot infer a chat id/);
    assert.throws(
      () => ctx.reply("pong", { ephemeral_message_parameters: { receiver_user_id: 9 } }),
      /cannot infer a chat id/
    );
  });

  // The object form is the same call with `{ text, ...other }` pre-split; it must
  // send exactly what the positional form sends, including on the edge branches.
  describe("reply(params) object form", () => {
    test("sends the same params as the positional form", async () => {
      const positional = fakeApi();
      await new Context(messageUpdate(), positional.api).reply("pong", { parse_mode: "HTML" });
      const object = fakeApi();
      await new Context(messageUpdate(), object.api).reply({ text: "pong", parse_mode: "HTML" });
      assert.deepStrictEqual(object.calls.sendMessage, positional.calls.sendMessage);
      assert.deepStrictEqual(object.calls.sendMessage[0], {
        chat_id: 555,
        text: "pong",
        parse_mode: "HTML",
      });
    });

    test("a bare string as the params object is not mistaken for the positional form", async () => {
      // Guard the dispatch: the object overload takes an object, but at runtime a
      // bare string must still route to the positional branch, not be spread.
      const { api, calls } = fakeApi();
      await new Context(messageUpdate(), api).reply("pong" as never);
      assert.deepStrictEqual(calls.sendMessage[0], { chat_id: 555, text: "pong" });
    });

    test("routes an ephemeral callback reply without a chat", async () => {
      const { api, calls } = fakeApi();
      const ctx = new Context(chatlessCallback, api);
      await ctx.reply({ text: "pong", ephemeral_message_parameters: { callback_query_id: "cb" } });
      assert.deepStrictEqual(calls.sendMessage[0], {
        text: "pong",
        ephemeral_message_parameters: { callback_query_id: "cb" },
      });
    });

    test("throws without a chat unless it is an ephemeral callback reply", () => {
      const { api } = fakeApi();
      const ctx = new Context(chatlessCallback, api);
      assert.throws(() => ctx.reply({ text: "pong" }), /cannot infer a chat id/);
      assert.throws(
        () => ctx.reply({ text: "pong", ephemeral_message_parameters: { receiver_user_id: 9 } }),
        /cannot infer a chat id/
      );
    });

    test("is refused for guest_message, like the positional form", () => {
      const { api } = fakeApi();
      const ctx = new Context(
        {
          update_id: 1,
          guest_message: {
            message_id: 1,
            date: 0,
            chat: { id: 1, type: "private" },
            guest_query_id: "gq",
          },
        } as unknown as Update,
        api
      );
      assert.throws(() => ctx.reply({ text: "pong" }), /answerGuestQuery/);
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
    // handlers registered via bot.on(<kind>, ...) can address the chat (ctx.reply
    // itself refuses guest_message - see the reply-routing tests).
    const cases: Array<{ kind: string; payload: Record<string, unknown> }> = [
      { kind: "business_message", payload: { message_id: 1, date: 0, chat, text: "bm" } },
      { kind: "edited_business_message", payload: { message_id: 1, date: 0, chat, text: "ebm" } },
      {
        kind: "deleted_business_messages",
        payload: { business_connection_id: "x", chat, message_ids: [1] },
      },
      { kind: "guest_message", payload: { message_id: 1, date: 0, chat, text: "gm" } },
      { kind: "message_reaction_count", payload: { chat, message_id: 1, date: 0, reactions: [] } },
      {
        kind: "chat_boost",
        payload: { chat, boost: { boost_id: "b", source: { source: "premium" }, add_date: 0 } },
      },
      {
        kind: "removed_chat_boost",
        payload: { chat, boost_id: "b", remove_date: 0, source: { source: "premium" } },
      },
      {
        kind: "widget_query",
        payload: {
          id: "w",
          from: { id: 1, is_bot: false, first_name: "U" },
          chat,
          message_id: 1,
          chat_instance: "ci",
          type: { type: "data" },
          data: "x",
        },
      },
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
      {
        kind: "business_connection",
        payload: { id: "bc", user, user_chat_id: 1, date: 0, is_enabled: true },
      },
      {
        kind: "business_message",
        payload: {
          message_id: 1,
          date: 0,
          chat: { id: 1, type: "private" },
          from: user,
          text: "x",
        },
      },
      {
        kind: "guest_message",
        payload: {
          message_id: 1,
          date: 0,
          chat: { id: 1, type: "private" },
          from: user,
          text: "x",
        },
      },
      { kind: "managed_bot", payload: { user, bot: { id: 2, is_bot: true, first_name: "B" } } },
      { kind: "subscription", payload: { user, invoice_payload: "e2e", state: "active" } },
      {
        kind: "widget_query",
        payload: { id: "w", from: user, chat_instance: "ci", type: { type: "data" }, data: "x" },
      },
      {
        kind: "shared_widget_query",
        payload: { id: "w", from: user, type: { type: "data" }, data: "x", widget_id: "wid" },
      },
    ];
    for (const { kind, payload } of cases) {
      const ctx = new Context({ update_id: 1, [kind]: payload } as unknown as Update, api);
      assert.strictEqual(ctx.from?.id, 5050, `${kind} should resolve a from user`);
    }
  });

  test("widget queries without a chat resolve no chat", () => {
    const { api } = fakeApi();
    const from = { id: 5050, is_bot: false, first_name: "U" };
    const base = { id: "w", from, type: { type: "data" }, data: "x" };
    // A forwarded shared widget names no chat; an inline-mode original has only inline_message_id.
    const cases: Array<{ kind: string; payload: Record<string, unknown> }> = [
      { kind: "shared_widget_query", payload: { ...base, widget_id: "wid" } },
      { kind: "widget_query", payload: { ...base, inline_message_id: "im", chat_instance: "ci" } },
    ];
    for (const { kind, payload } of cases) {
      const ctx = new Context({ update_id: 1, [kind]: payload } as unknown as Update, api);
      assert.strictEqual(ctx.chat, undefined, `${kind} should resolve no chat`);
    }
  });

  describe("editMessageText()", () => {
    /** A callback-query update: a press carrying the given fields. */
    function pressUpdate(press: Pick<CallbackQuery, "message" | "inline_message_id">): Update {
      return {
        update_id: 1,
        callback_query: {
          id: "cq1",
          from: { id: 9, is_bot: false, first_name: "Zoe" },
          chat_instance: "ci",
          ...press,
        },
      };
    }

    // Minimal on purpose: the shortcut reads only chat.id / message_id /
    // business_connection_id off the pressed message, so this shape covers
    // InaccessibleMessage too (a press on a message too old to arrive in full).
    const pressedMessage = { message_id: 7, date: 0, chat: { id: 123, type: "private" } };
    const pressOnMessage = pressUpdate({ message: pressedMessage });
    const pressOnBusinessMessage = pressUpdate({
      message: { ...pressedMessage, business_connection_id: "bc1" },
    });
    const pressOnInlineMessage = pressUpdate({ inline_message_id: "inline-1" });

    /** Run the shortcut on `update` and return the params it sent. */
    async function sentParams(update: Update, params: Parameters<Context["editMessageText"]>[0]) {
      const { api, calls } = fakeApi();
      await new Context(update, api).editMessageText(params);
      return calls.editMessageText[0];
    }

    test("a pressed message edits by chat_id + message_id", async () => {
      assert.deepStrictEqual(await sentParams(pressOnMessage, { text: "edited" }), {
        chat_id: 123,
        message_id: 7,
        text: "edited",
      });
    });

    test("a pressed business message carries its business_connection_id", async () => {
      assert.deepStrictEqual(await sentParams(pressOnBusinessMessage, { text: "edited" }), {
        chat_id: 123,
        message_id: 7,
        text: "edited",
        business_connection_id: "bc1",
      });
    });

    test("an inline-mode press edits by inline_message_id", async () => {
      assert.deepStrictEqual(await sentParams(pressOnInlineMessage, { text: "edited" }), {
        inline_message_id: "inline-1",
        text: "edited",
      });
    });

    test("a press carrying both message and inline_message_id prefers the message", async () => {
      const pressOnBoth = pressUpdate({
        message: pressedMessage,
        inline_message_id: "inline-1",
      });
      assert.deepStrictEqual(await sentParams(pressOnBoth, { text: "edited" }), {
        chat_id: 123,
        message_id: 7,
        text: "edited",
      });
    });

    test("caller options win over the inferred routing", async () => {
      assert.deepStrictEqual(
        await sentParams(pressOnBusinessMessage, {
          text: "edited",
          business_connection_id: undefined,
          parse_mode: "HTML",
        }),
        {
          chat_id: 123,
          message_id: 7,
          text: "edited",
          business_connection_id: undefined,
          parse_mode: "HTML",
        }
      );
    });

    test("a press with neither message nor inline_message_id throws", () => {
      const { api, calls } = fakeApi();
      const ctx = new Context(pressUpdate({}), api);
      assert.throws(
        () => ctx.editMessageText({ text: "edited" }),
        /cannot infer a target from this callback query/
      );
      assert.strictEqual(calls.editMessageText.length, 0);
    });

    test("a non-callback update throws (edit is for button presses)", () => {
      const { api, calls } = fakeApi();
      const ctx = new Context(messageUpdate(), api);
      assert.throws(
        () => ctx.editMessageText({ text: "edited" }),
        /this update has no callback query/
      );
      assert.strictEqual(calls.editMessageText.length, 0);
    });
  });

  describe("reply() routing (issue #1386)", () => {
    const group = { id: -100, type: "supergroup", is_forum: true };
    const biz = { id: 4242, type: "private" };

    // Drive both forms through the same table: routing is shared code, but the
    // object form goes through a different overload, so prove parity per case.
    async function replyTo(
      update: Record<string, unknown>,
      other?: Record<string, unknown>,
      form: "positional" | "object" = "positional"
    ) {
      const { api, calls } = fakeApi();
      const ctx = new Context({ update_id: 1, ...update } as unknown as Update, api);
      await (form === "object"
        ? ctx.reply({ text: "pong", ...other } as never)
        : ctx.reply("pong", other as never));
      return calls.sendMessage[0];
    }

    const cases: Array<{
      name: string;
      update: Record<string, unknown>;
      expected: Record<string, unknown>;
    }> = [
      {
        name: "forum topic message keeps its topic",
        update: {
          message: {
            message_id: 1,
            date: 0,
            chat: group,
            is_topic_message: true,
            message_thread_id: 7,
            text: "x",
          },
        },
        expected: { chat_id: -100, text: "pong", message_thread_id: 7 },
      },
      {
        name: "non-topic reply thread is not followed",
        update: {
          message: {
            message_id: 1,
            date: 0,
            chat: { id: -100, type: "supergroup" },
            message_thread_id: 7,
            text: "x",
          },
        },
        expected: { chat_id: -100, text: "pong" },
      },
      {
        name: "edited topic message keeps its topic",
        update: {
          edited_message: {
            message_id: 1,
            date: 0,
            chat: group,
            is_topic_message: true,
            message_thread_id: 3,
            text: "x",
          },
        },
        expected: { chat_id: -100, text: "pong", message_thread_id: 3 },
      },
      {
        name: "business_message replies via its connection",
        update: {
          business_message: {
            message_id: 1,
            date: 0,
            chat: biz,
            business_connection_id: "bc1",
            text: "x",
          },
        },
        expected: {
          chat_id: 4242,
          text: "pong",
          business_connection_id: "bc1",
        },
      },
      {
        name: "edited_business_message replies via its connection",
        update: {
          edited_business_message: {
            message_id: 1,
            date: 0,
            chat: biz,
            business_connection_id: "bc2",
            text: "x",
          },
        },
        expected: {
          chat_id: 4242,
          text: "pong",
          business_connection_id: "bc2",
        },
      },
      {
        name: "deleted_business_messages replies via its connection",
        update: {
          deleted_business_messages: {
            business_connection_id: "bc3",
            chat: biz,
            message_ids: [1],
          },
        },
        expected: {
          chat_id: 4242,
          text: "pong",
          business_connection_id: "bc3",
        },
      },
      {
        name: "channel direct-messages topic is kept",
        update: {
          message: {
            message_id: 1,
            date: 0,
            chat: { id: -200, type: "supergroup", is_direct_messages: true },
            direct_messages_topic: { topic_id: 99 },
            text: "x",
          },
        },
        expected: { chat_id: -200, text: "pong", direct_messages_topic_id: 99 },
      },
      {
        name: "callback query on a topic message keeps its topic",
        update: {
          callback_query: {
            id: "cq",
            from: { id: 9, is_bot: false, first_name: "Z" },
            chat_instance: "ci",
            message: {
              message_id: 1,
              date: 0,
              chat: group,
              is_topic_message: true,
              message_thread_id: 5,
            },
          },
        },
        expected: { chat_id: -100, text: "pong", message_thread_id: 5 },
      },
      {
        name: "callback query on a business message replies via its connection",
        update: {
          callback_query: {
            id: "cq",
            from: { id: 9, is_bot: false, first_name: "Z" },
            chat_instance: "ci",
            message: {
              message_id: 1,
              date: 0,
              chat: biz,
              business_connection_id: "bc4",
            },
          },
        },
        expected: {
          chat_id: 4242,
          text: "pong",
          business_connection_id: "bc4",
        },
      },
      {
        name: "callback query on an inaccessible message sends only the chat",
        update: {
          callback_query: {
            id: "cq",
            from: { id: 9, is_bot: false, first_name: "Z" },
            chat_instance: "ci",
            message: { message_id: 1, date: 0, chat: group },
          },
        },
        expected: { chat_id: -100, text: "pong" },
      },
    ];
    for (const { name, update, expected } of cases) {
      for (const form of ["positional", "object"] as const) {
        test(`${name} [${form}]`, async () => {
          assert.deepStrictEqual(await replyTo(update, undefined, form), expected);
        });
      }
    }

    test("caller options override inferred routing", async () => {
      const update = {
        business_message: {
          message_id: 1,
          date: 0,
          chat: group,
          business_connection_id: "bc1",
          is_topic_message: true,
          message_thread_id: 7,
          text: "x",
        },
      };
      for (const form of ["positional", "object"] as const) {
        assert.deepStrictEqual(
          await replyTo(
            update,
            {
              message_thread_id: 8,
              business_connection_id: undefined,
            },
            form
          ),
          {
            chat_id: -100,
            text: "pong",
            message_thread_id: 8,
            business_connection_id: undefined,
          }
        );
      }
    });

    test("guest_message is refused with a pointer to answerGuestQuery", () => {
      const { api, calls } = fakeApi();
      const update = {
        update_id: 1,
        guest_message: {
          message_id: 1,
          date: 0,
          chat: biz,
          guest_query_id: "gq",
          text: "x",
        },
      } as unknown as Update;
      const ctx = new Context(update, api);
      assert.throws(() => ctx.reply("pong"), /answerGuestQuery/);
      assert.strictEqual(calls.sendMessage.length, 0);
    });
  });
});
