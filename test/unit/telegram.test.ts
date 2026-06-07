/**
 * Unit tests for the TelegramBot class. These do NOT hit the real Bot API —
 * `globalThis.fetch` is stubbed to capture outgoing calls.
 */

import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";

import { TelegramBot, type TelegramBotOptions } from "../../src/telegram.js";
import { UPDATE_TYPES, type Update } from "../../src/types/schemas.js";

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

  describe("constructor: polling / webHook mutual exclusion", () => {
    it("type-rejects enabling both polling and webHook", () => {
      // This file is type-checked (`npm run typecheck`), so @ts-expect-error is a
      // real assertion: if the union ever stopped rejecting both, the unused
      // directive would fail the build.
      // @ts-expect-error - polling and webHook are mutually exclusive
      const both: TelegramBotOptions = { polling: true, webHook: true };
      // Single-transport configs (incl. explicitly disabling the other) still compile:
      const onlyPolling: TelegramBotOptions = { polling: true, webHook: false };
      const onlyWebhook: TelegramBotOptions = { webHook: true };
      const neither: TelegramBotOptions = { polling: false, webHook: false };
      void both;
      void onlyPolling;
      void onlyWebhook;
      void neither;
    });

    it("at runtime prefers polling when both are passed (JS callers)", async () => {
      // Stub so polling's getUpdates loop never touches the network.
      stubFetch(() => ({ ok: true, result: [] }));
      // The cast simulates a JS caller / dynamically-built options bypassing the
      // typed guard above.
      const bot = new TelegramBot("TOKEN", { polling: true, webHook: true } as unknown as TelegramBotOptions);
      assert.equal(bot.isPolling(), true);
      assert.equal(bot.hasOpenWebHook(), false);
      await bot.stopPolling({ cancel: true });
    });
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

    it("dispatches guest_message updates (Bot API 10.0 guest mode)", () => {
      const bot = new TelegramBot("TOKEN");
      let messageId: number | null = null;
      bot.on("guest_message", (msg) => {
        messageId = msg.message_id;
      });
      bot.processUpdate({
        update_id: 1,
        guest_message: {
          message_id: 7,
          date: 0,
          chat: { id: 1, type: "private" },
          text: "hi from a guest",
        },
      });
      assert.equal(messageId, 7);
    });

    it("dispatches managed_bot updates", () => {
      const bot = new TelegramBot("TOKEN");
      let botId: number | null = null;
      bot.on("managed_bot", (update) => {
        botId = update.bot.id;
      });
      bot.processUpdate({
        update_id: 1,
        managed_bot: {
          user: { id: 1, is_bot: false, first_name: "Owner" },
          bot: { id: 2, is_bot: true, first_name: "ManagedBot" },
        },
      });
      assert.equal(botId, 2);
    });

    it("emits 'poll' in both shapes: a poll message and a dedicated poll update", () => {
      const bot = new TelegramBot("TOKEN");
      const poll = {
        id: "p",
        question: "Q?",
        options: [],
        total_voter_count: 0,
        is_closed: false,
        is_anonymous: true,
        type: "regular",
        allows_multiple_answers: false,
        allows_revoting: false,
        members_only: false,
      };
      const seen: { kind: string; id: string | number; type?: string }[] = [];
      // The listener param is `Poll | Message`; consumers discriminate on it.
      bot.on("poll", (payload, metadata) => {
        if ("message_id" in payload) {
          seen.push({ kind: "message", id: payload.message_id, type: metadata?.type });
        } else {
          seen.push({ kind: "poll", id: payload.id });
        }
      });

      // 1. A message carrying a poll -> (message, metadata) via the message path.
      bot.processUpdate({
        update_id: 1,
        message: {
          message_id: 3,
          date: 0,
          chat: { id: 1, type: "private" },
          poll: { ...poll, id: "p-msg" },
        },
      });
      // 2. A dedicated poll-state update -> (poll) via the direct dispatch table.
      bot.processUpdate({
        update_id: 2,
        poll: { ...poll, id: "p-update", is_closed: true },
      });

      assert.deepEqual(seen, [
        { kind: "message", id: 3, type: "poll" },
        { kind: "poll", id: "p-update" },
      ]);
    });

    it("emits an event for every UPDATE_TYPES entry (no update kind is silently dropped)", () => {
      // Guards the dispatch loop against ever again forgetting an update kind:
      // every generated UPDATE_TYPES key must reach a listener.
      for (const key of UPDATE_TYPES) {
        if (key === "message") continue; // exercised via the message-path tests above
        const bot = new TelegramBot("TOKEN");
        let received: unknown;
        bot.once(key, (value) => {
          received = value;
        });
        const payload = { _marker: key };
        bot.processUpdate({ update_id: 1, [key]: payload } as unknown as Update);
        assert.deepEqual(received, payload, `processUpdate did not emit "${key}"`);
      }
    });
  });

  describe("sendLivePhoto()", () => {
    it("posts both live_photo and photo as fileIds when strings are passed", async () => {
      stubFetch(() => ({ ok: true, result: { message_id: 1, date: 0, chat: { id: 1, type: "private" } } }));
      const bot = new TelegramBot("TOKEN", { filepath: false });
      await bot.sendLivePhoto(42, "live-id-123", "photo-id-456", { caption: "hi" });
      const last = captured.at(-1)!;
      assert.equal(last.url, "https://api.telegram.org/botTOKEN/sendLivePhoto");
      const params = new URLSearchParams(String(last.init.body));
      assert.equal(params.get("chat_id"), "42");
      assert.equal(params.get("caption"), "hi");
      assert.equal(params.get("live_photo"), "live-id-123");
      assert.equal(params.get("photo"), "photo-id-456");
    });
  });

  describe("setMyProfilePhoto()", () => {
    it("posts static photo with InputProfilePhoto struct and file in formData", async () => {
      stubFetch(() => ({ ok: true, result: true }));
      const bot = new TelegramBot("TOKEN");
      const buf = Buffer.from("fake-jpeg-data");
      await bot.setMyProfilePhoto({ type: "static", photo: buf });
      const last = captured.at(-1)!;
      assert.equal(last.url, "https://api.telegram.org/botTOKEN/setMyProfilePhoto");
      const fd = last.init.body as FormData;
      const photoParam = fd.get("photo");
      assert.ok(photoParam, "photo qs param should be present");
      const struct = JSON.parse(String(photoParam));
      assert.equal(struct.type, "static");
      assert.equal(struct.photo, "attach://photo");
      // the file blob is also appended under "photo" - getAll returns both
      const entries = fd.getAll("photo");
      assert.equal(entries.length, 2, "should have qs struct + file blob");
    });

    it("posts animated photo with animation field and main_frame_timestamp", async () => {
      stubFetch(() => ({ ok: true, result: true }));
      const bot = new TelegramBot("TOKEN");
      const buf = Buffer.from("fake-mp4-data");
      await bot.setMyProfilePhoto({ type: "animated", animation: buf, main_frame_timestamp: 1.5 });
      const last = captured.at(-1)!;
      assert.equal(last.url, "https://api.telegram.org/botTOKEN/setMyProfilePhoto");
      const fd = last.init.body as FormData;
      const photoParam = fd.get("photo");
      assert.ok(photoParam, "photo qs param should be present");
      const struct = JSON.parse(String(photoParam));
      assert.equal(struct.type, "animated");
      assert.equal(struct.animation, "attach://animation");
      assert.equal(struct.main_frame_timestamp, 1.5);
      const fileEntry = fd.getAll("animation");
      assert.equal(fileEntry.length, 1, "animation file blob should be present");
    });

    it("throws FatalError when given a fileId string instead of a file", async () => {
      stubFetch(() => ({ ok: true, result: true }));
      const bot = new TelegramBot("TOKEN", { filepath: false });
      await assert.rejects(
        bot.setMyProfilePhoto({ type: "static", photo: "some-file-id" }),
        /only supports file uploads/,
      );
    });
  });

  describe("getUserPersonalChatMessages()", () => {
    it("posts user_id and limit", async () => {
      stubFetch(() => ({ ok: true, result: [] }));
      const bot = new TelegramBot("TOKEN");
      await bot.getUserPersonalChatMessages(99, 10);
      const params = new URLSearchParams(String(captured[0]!.init.body));
      assert.equal(params.get("user_id"), "99");
      assert.equal(params.get("limit"), "10");
    });
  });

  describe("answerGuestQuery()", () => {
    it("posts guest_query_id and JSON-serialized result", async () => {
      stubFetch(() => ({ ok: true, result: { inline_message_id: "im_1" } }));
      const bot = new TelegramBot("TOKEN");
      const out = await bot.answerGuestQuery("gq_1", { type: "article", id: "1", title: "t", input_message_content: { message_text: "x" } });
      const params = new URLSearchParams(String(captured[0]!.init.body));
      assert.equal(params.get("guest_query_id"), "gq_1");
      const result = JSON.parse(params.get("result")!);
      assert.equal(result.type, "article");
      assert.equal(out.inline_message_id, "im_1");
    });
  });

  describe("getManagedBotAccessSettings()", () => {
    it("posts user_id and parses settings", async () => {
      stubFetch(() => ({ ok: true, result: { is_access_restricted: true, added_users: [] } }));
      const bot = new TelegramBot("TOKEN");
      const settings = await bot.getManagedBotAccessSettings(7);
      const params = new URLSearchParams(String(captured[0]!.init.body));
      assert.equal(params.get("user_id"), "7");
      assert.equal(settings.is_access_restricted, true);
    });
  });

  describe("setManagedBotAccessSettings()", () => {
    it("posts user_id, is_access_restricted and JSON-serialized added_user_ids", async () => {
      stubFetch(() => ({ ok: true, result: true }));
      const bot = new TelegramBot("TOKEN");
      await bot.setManagedBotAccessSettings(7, true, { added_user_ids: [1, 2, 3] });
      const params = new URLSearchParams(String(captured[0]!.init.body));
      assert.equal(params.get("user_id"), "7");
      assert.equal(params.get("is_access_restricted"), "true");
      assert.deepEqual(JSON.parse(params.get("added_user_ids")!), [1, 2, 3]);
    });
  });

  describe("JSON-serialization of structured params", () => {
    it("JSON-serializes suggested_post_parameters via sendMessage", async () => {
      stubFetch(() => ({ ok: true, result: { message_id: 1, date: 0, chat: { id: 1, type: "private" } } }));
      const bot = new TelegramBot("TOKEN");
      await bot.sendMessage(1, "hi", {
        suggested_post_parameters: { send_date: 1715000000, price: { currency: "XTR", amount: 100 } },
      });
      const params = new URLSearchParams(String(captured[0]!.init.body));
      const raw = params.get("suggested_post_parameters");
      assert.ok(raw);
      const parsed = JSON.parse(raw!);
      assert.equal(parsed.send_date, 1715000000);
      assert.equal(parsed.price.currency, "XTR");
    });

    it("JSON-serializes link_preview_options via sendMessage", async () => {
      stubFetch(() => ({ ok: true, result: { message_id: 1, date: 0, chat: { id: 1, type: "private" } } }));
      const bot = new TelegramBot("TOKEN");
      await bot.sendMessage(1, "hi", {
        link_preview_options: { is_disabled: true, url: "https://example.com" },
      });
      const params = new URLSearchParams(String(captured[0]!.init.body));
      const raw = params.get("link_preview_options");
      assert.ok(raw);
      const parsed = JSON.parse(raw!);
      assert.equal(parsed.is_disabled, true);
      assert.equal(parsed.url, "https://example.com");
    });

    it("JSON-serializes link_preview_options via editMessageText", async () => {
      stubFetch(() => ({ ok: true, result: { message_id: 1, date: 0, chat: { id: 1, type: "private" } } }));
      const bot = new TelegramBot("TOKEN");
      await bot.editMessageText("new text", {
        chat_id: 1,
        message_id: 42,
        link_preview_options: { prefer_small_media: true },
      });
      const params = new URLSearchParams(String(captured[0]!.init.body));
      const raw = params.get("link_preview_options");
      assert.ok(raw);
      const parsed = JSON.parse(raw!);
      assert.equal(parsed.prefer_small_media, true);
    });

    it("JSON-serializes text_entities via sendGift", async () => {
      stubFetch(() => ({ ok: true, result: true }));
      const bot = new TelegramBot("TOKEN");
      await bot.sendGift("gift_1", { user_id: 1, text: "hello", text_entities: [{ type: "bold", offset: 0, length: 5 }] });
      const params = new URLSearchParams(String(captured[0]!.init.body));
      const raw = params.get("text_entities");
      assert.ok(raw);
      const parsed = JSON.parse(raw!);
      assert.equal(parsed[0].type, "bold");
    });

    it("leaves already-stringified params untouched", async () => {
      stubFetch(() => ({ ok: true, result: { message_id: 1, date: 0, chat: { id: 1, type: "private" } } }));
      const bot = new TelegramBot("TOKEN");
      const preSerialized = JSON.stringify({ send_date: 1715000000 });
      await bot.sendMessage(1, "hi", {
        suggested_post_parameters: preSerialized as unknown as Record<string, unknown>,
      });
      const params = new URLSearchParams(String(captured[0]!.init.body));
      assert.equal(params.get("suggested_post_parameters"), preSerialized);
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
