/**
 * Unit tests for the TelegramBot class. These do NOT hit the real Bot API —
 * `globalThis.fetch` is stubbed to capture outgoing calls.
 */

import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";

import { TelegramBot } from "../../src/telegram.js";

interface CapturedRequest {
  url: string;
  init: RequestInit;
}

const originalFetch = globalThis.fetch;
let captured: CapturedRequest[] = [];

function stubFetch(handler: (url: string) => unknown) {
  globalThis.fetch = (async (url: RequestInfo | URL, init: RequestInit = {}) => {
    captured.push({ url: String(url), init });
    return new Response(JSON.stringify(handler(String(url))), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
}

describe("TelegramBot (unit)", () => {
  beforeEach(() => {
    captured = [];
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("static errors property exposes the error classes", () => {
    assert.ok(TelegramBot.errors);
    assert.ok(TelegramBot.errors.FatalError);
    assert.ok(TelegramBot.errors.TelegramError);
    assert.ok(TelegramBot.errors.ParseError);
  });

  it("static messageTypes is an immutable list of known events", () => {
    assert.ok(Array.isArray(TelegramBot.messageTypes));
    assert.ok(TelegramBot.messageTypes.includes("text"));
    assert.ok(TelegramBot.messageTypes.includes("photo"));
  });

  describe("sendMessage()", () => {
    it("posts to /sendMessage with chat_id and text", async () => {
      stubFetch(() => ({ ok: true, result: { message_id: 1, date: 0, chat: { id: 1, type: "private" } } }));
      const bot = new TelegramBot("TOKEN");
      await bot.sendMessage(123, "hello");
      const last = captured.at(-1)!;
      assert.equal(last.url, "https://api.telegram.org/botTOKEN/sendMessage");
      const params = new URLSearchParams(String(last.init.body));
      assert.equal(params.get("chat_id"), "123");
      assert.equal(params.get("text"), "hello");
    });

    it("JSON-serializes structured reply_markup", async () => {
      stubFetch(() => ({ ok: true, result: { message_id: 1, date: 0, chat: { id: 1, type: "private" } } }));
      const bot = new TelegramBot("TOKEN");
      await bot.sendMessage(1, "hi", {
        reply_markup: { inline_keyboard: [[{ text: "ok", callback_data: "ok" }]] },
      });
      const params = new URLSearchParams(String(captured[0]!.init.body));
      const replyMarkup = params.get("reply_markup");
      assert.ok(replyMarkup);
      const parsed = JSON.parse(replyMarkup!);
      assert.equal(parsed.inline_keyboard[0][0].text, "ok");
    });
  });

  describe("getMe()", () => {
    it("returns the parsed result on ok", async () => {
      stubFetch(() => ({
        ok: true,
        result: { id: 7, is_bot: true, first_name: "Alfred" },
      }));
      const bot = new TelegramBot("TOKEN");
      const me = await bot.getMe();
      assert.equal(me.id, 7);
      assert.equal(me.first_name, "Alfred");
      assert.equal(me.is_bot, true);
    });
  });

  describe("forwardMessage()", () => {
    it("attaches chat_id, from_chat_id, message_id", async () => {
      stubFetch(() => ({ ok: true, result: { message_id: 1, date: 0, chat: { id: 1, type: "private" } } }));
      const bot = new TelegramBot("TOKEN");
      await bot.forwardMessage(2, 1, 99);
      const params = new URLSearchParams(String(captured[0]!.init.body));
      assert.equal(params.get("chat_id"), "2");
      assert.equal(params.get("from_chat_id"), "1");
      assert.equal(params.get("message_id"), "99");
    });
  });

  describe("processUpdate() event dispatch", () => {
    it("emits 'message' and the matching content-type sub-event", () => {
      const bot = new TelegramBot("TOKEN");
      const seen: string[] = [];
      bot.on("message", () => seen.push("message"));
      bot.on("text", () => seen.push("text"));

      bot.processUpdate({
        update_id: 1,
        message: {
          message_id: 1,
          date: 0,
          chat: { id: 1, type: "private" },
          text: "hi",
        },
      });
      assert.deepEqual(seen, ["message", "text"]);
    });

    it("dispatches callback_query updates", () => {
      const bot = new TelegramBot("TOKEN");
      let cbq: unknown = null;
      bot.on("callback_query", (q) => {
        cbq = q;
      });
      bot.processUpdate({
        update_id: 1,
        callback_query: {
          id: "abc",
          from: { id: 1, is_bot: false, first_name: "X" },
          chat_instance: "x",
          data: "ping",
        },
      });
      assert.ok(cbq);
      assert.equal((cbq as Record<string, unknown>).data, "ping");
    });

    it("invokes onText() callbacks for matching regex", () => {
      const bot = new TelegramBot("TOKEN");
      let matched: string | null = null;
      bot.onText(/^\/start (.+)/, (msg, match) => {
        matched = match![1] ?? null;
      });
      bot.processUpdate({
        update_id: 1,
        message: {
          message_id: 2,
          date: 0,
          chat: { id: 1, type: "private" },
          text: "/start arg1",
        },
      });
      assert.equal(matched, "arg1");
    });

    it("onText() compiles a string pattern into a RegExp at registration", () => {
      const bot = new TelegramBot("TOKEN");
      let matched: string | null = null;
      bot.onText("^/echo (.+)", (msg, match) => {
        matched = match![1] ?? null;
      });
      bot.processUpdate({
        update_id: 1,
        message: {
          message_id: 2,
          date: 0,
          chat: { id: 1, type: "private" },
          text: "/echo hello",
        },
      });
      assert.equal(matched, "hello");
    });

    it("invokes reply listeners", () => {
      const bot = new TelegramBot("TOKEN");
      let replied = false;
      bot.onReplyToMessage(1, 100, () => {
        replied = true;
      });
      bot.processUpdate({
        update_id: 1,
        message: {
          message_id: 200,
          date: 0,
          chat: { id: 1, type: "private" },
          text: "ok",
          reply_to_message: {
            message_id: 100,
            date: 0,
            chat: { id: 1, type: "private" },
            text: "what?",
          },
        },
      });
      assert.equal(replied, true);
    });
  });

  describe("polling vs webhook safety", () => {
    it("rejects startPolling() while a webhook is open", async () => {
      const bot = new TelegramBot("TOKEN");
      // Stub _webHook to look open
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (bot as any)._webHook = { isOpen: () => true, open: async () => {}, close: async () => {} };
      await assert.rejects(bot.startPolling(), /mutually exclusive/);
    });
  });
});
