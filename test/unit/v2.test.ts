/**
 * v2 unit suite — runs on Bun (`bun test test/unit`). No network, no token:
 * `fetch` is injected. Exercises encode (urlencoded/multipart/attach), the
 * Json<T> builders, the Api round-trip + error mapping, the generator-based
 * longPoll, middleware dispatch, and the webhook callback.
 */
import { test, expect, describe } from "bun:test";

import {
  Api,
  Bot,
  encodeForm,
  InlineKeyboard,
  fmt,
  mediaGroup,
  inputFile,
  longPoll,
  webhookCallback,
  TelegramApiError,
} from "../../src/core/index.js";
import type { Update } from "../../src/core/index.js";

// ---- helpers ---------------------------------------------------------------

function msg(id: number, chatId: number, text: string): Update {
  return { update_id: id, message: { message_id: id, chat: { id: chatId, type: "private" }, date: 0, text } };
}

interface Sent {
  method: string;
  params: Record<string, unknown>;
  multipart: boolean;
  form?: FormData;
}

function fakeFetch(opts: { updates?: Update[][] } = {}) {
  const sent: Sent[] = [];
  let batch = 0;
  const fn = (async (url: string | URL | Request, init?: RequestInit) => {
    const method = String(url).split("/").pop()!;
    let params: Record<string, unknown> = {};
    let multipart = false;
    let form: FormData | undefined;
    const body = init?.body;
    if (body instanceof URLSearchParams) {
      params = Object.fromEntries(body);
    } else if (body instanceof FormData) {
      multipart = true;
      form = body;
      params = Object.fromEntries([...body.entries()]);
    }
    sent.push({ method, params, multipart, form });
    const ok = (result: unknown) => new Response(JSON.stringify({ ok: true, result }), { status: 200 });
    if (method === "getUpdates") {
      const r = opts.updates?.[batch] ?? [];
      batch++;
      return ok(r);
    }
    if (method === "sendMessage") {
      return ok({ message_id: sent.length, chat: { id: Number(params.chat_id), type: "private" }, date: 0, text: params.text });
    }
    if (method === "getMe") return ok({ id: 1, is_bot: true, first_name: "Bot" });
    return ok(true);
  }) as unknown as typeof fetch;
  return { fetch: fn, sent };
}

// ---- encode ----------------------------------------------------------------

describe("encodeForm", () => {
  test("urlencoded when there are no files", async () => {
    const b = await encodeForm({ chat_id: 5, text: "hi", disable_notification: true });
    expect(b.body).toBeInstanceOf(URLSearchParams);
    expect(b.headers["content-type"]).toContain("x-www-form-urlencoded");
    const u = b.body as URLSearchParams;
    expect(u.get("text")).toBe("hi");
    expect(u.get("disable_notification")).toBe("true");
  });

  test("a Json<T> builder value passes through as its wire string", async () => {
    const b = await encodeForm({ reply_markup: new InlineKeyboard().url("Go", "https://x").build() });
    const u = b.body as URLSearchParams;
    expect(u.get("reply_markup")).toBe(JSON.stringify({ inline_keyboard: [[{ text: "Go", url: "https://x" }]] }));
  });

  test("a raw (unserialized) structured value throws EFATAL", async () => {
    await expect(encodeForm({ reply_markup: { inline_keyboard: [] } })).rejects.toThrow(/EFATAL|serializ/i);
  });

  test("a top-level InputFile becomes a multipart part named after the field", async () => {
    const b = await encodeForm({ chat_id: 5, photo: inputFile(new Uint8Array([1, 2, 3]), { filename: "a.bin" }) });
    expect(b.body).toBeInstanceOf(FormData);
    const fd = b.body as FormData;
    expect(fd.get("chat_id")).toBe("5");
    expect(fd.get("photo")).toBeInstanceOf(Blob);
  });

  test("a FormPart media group attaches files and references them via attach://", async () => {
    const b = await encodeForm({
      chat_id: 5,
      media: mediaGroup()
        .photo(inputFile(new Uint8Array([1]), { filename: "x" }), { caption: "A" })
        .photo("https://example.com/2.jpg")
        .build(),
    });
    const fd = b.body as FormData;
    const media = JSON.parse(fd.get("media") as string) as Array<{ media: string; caption?: string }>;
    expect(media).toHaveLength(2);
    expect(media[0]!.media).toMatch(/^attach:\/\//);
    expect(media[0]!.caption).toBe("A");
    expect(media[1]!.media).toBe("https://example.com/2.jpg");
    // the referenced part is actually attached
    const partName = media[0]!.media.replace("attach://", "");
    expect(fd.get(partName)).toBeInstanceOf(Blob);
  });
});

// ---- builders --------------------------------------------------------------

describe("builders", () => {
  test("fmt() tracks UTF-16 offsets and returns Json entities", () => {
    const { text, entities } = fmt().plain("Hi ").bold("world").build();
    expect(text).toBe("Hi world");
    expect(entities).toBe(JSON.stringify([{ type: "bold", offset: 3, length: 5 }]));
  });

  test("InlineKeyboard lays out rows", () => {
    const built = new InlineKeyboard().text("A", "a").text("B", "b").row().url("Docs", "https://d").build();
    expect(JSON.parse(built)).toEqual({
      inline_keyboard: [
        [{ text: "A", callback_data: "a" }, { text: "B", callback_data: "b" }],
        [{ text: "Docs", url: "https://d" }],
      ],
    });
  });
});

// ---- client ----------------------------------------------------------------

describe("Api", () => {
  test("sendMessage round-trips a builder reply_markup through the wire", async () => {
    const { fetch, sent } = fakeFetch();
    const api = new Api("T", { fetch });
    const m = await api.sendMessage({ chat_id: 7, text: "hi", reply_markup: new InlineKeyboard().text("A", "a").build() });
    expect(m.message_id).toBeGreaterThan(0);
    expect(sent[0]!.method).toBe("sendMessage");
    expect(sent[0]!.params.reply_markup).toBe(JSON.stringify({ inline_keyboard: [[{ text: "A", callback_data: "a" }]] }));
    expect(sent[0]!.params.chat_id).toBe("7");
  });

  test("getMe returns the parsed result", async () => {
    const { fetch } = fakeFetch();
    const api = new Api("T", { fetch });
    expect((await api.getMe()).is_bot).toBe(true);
  });

  test("an ok:false envelope becomes a TelegramApiError with the code", async () => {
    const fetch = (async () => new Response(JSON.stringify({ ok: false, error_code: 400, description: "Bad Request" }), { status: 400 })) as unknown as typeof fetch;
    const api = new Api("T", { fetch });
    await expect(api.sendChatAction({ chat_id: 1, action: "typing" })).rejects.toMatchObject({
      name: "TelegramApiError",
      errorCode: 400,
    });
  });
});

// ---- dispatch --------------------------------------------------------------

describe("dispatch", () => {
  test("middleware wraps, routes match, and ctx.reply round-trips", async () => {
    const { fetch, sent } = fakeFetch();
    const bot = new Bot("T", { fetch });
    const order: string[] = [];
    bot.use(async (_ctx, next) => {
      order.push("before");
      await next();
      order.push("after");
    });
    bot.command("start", (ctx) => ctx.reply("welcome"));
    bot.on("message", (ctx) => ctx.reply(`echo:${ctx.message?.text}`));

    await bot.handleUpdate(msg(1, 42, "/start"));
    await bot.handleUpdate(msg(2, 42, "hi"));

    expect(order).toEqual(["before", "after", "before", "after"]);
    expect(sent.map((s) => s.params.text)).toEqual(["welcome", "echo:hi"]);
    expect(sent[0]!.params.chat_id).toBe("42");
  });

  test("longPoll is an async generator that yields and tracks offset", async () => {
    const { fetch } = fakeFetch({ updates: [[msg(7, 1, "a"), msg(8, 1, "b")]] });
    const api = new Api("T", { fetch });
    const ac = new AbortController();
    const seen: number[] = [];
    for await (const u of longPoll(api, { timeout: 0 }, ac.signal)) {
      seen.push(u.update_id);
      if (u.update_id === 8) ac.abort();
    }
    expect(seen).toEqual([7, 8]);
  });
});

// ---- webhook ---------------------------------------------------------------

describe("webhookCallback", () => {
  test("enforces method, secret token, and dispatches one update", async () => {
    const { fetch } = fakeFetch();
    const bot = new Bot("T", { fetch });
    let handled = 0;
    bot.on("message", () => {
      handled++;
    });
    const cb = webhookCallback(bot, { secretToken: "s3cret" });

    const wrongMethod = await cb(new Request("http://x/", { method: "GET" }));
    expect(wrongMethod.status).toBe(405);

    const noSecret = await cb(new Request("http://x/", { method: "POST", body: JSON.stringify(msg(1, 1, "hi")) }));
    expect(noSecret.status).toBe(401);

    const okResp = await cb(
      new Request("http://x/", {
        method: "POST",
        headers: { "x-telegram-bot-api-secret-token": "s3cret" },
        body: JSON.stringify(msg(1, 1, "hi")),
      }),
    );
    expect(okResp.status).toBe(200);
    expect(handled).toBe(1);
  });
});
