/**
 * Unit tests for TelegramBotWebHook. These do NOT hit the real Bot API and use
 * no token against Telegram: the webhook is bound to an ephemeral loopback port
 * and driven with real local HTTP requests, while bot.processUpdate is stubbed
 * to capture dispatch. The 50MB payload cap is exercised by calling the request
 * handler directly with a mock request (so no 50MB buffer is ever allocated).
 */

import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import https from "node:https";
import { EventEmitter } from "node:events";

import { TelegramBot } from "../../src/telegram.js";
import { TelegramBotWebHook } from "../../src/webhook.js";
import { FatalError, ParseError } from "../../src/errors.js";
import type { Update } from "../../src/types/schemas.js";

const TOKEN = "111:AAAbbbCCC";
const SECRET = "s3cr3t-token";

interface LocalResponse {
  statusCode: number;
  body: string;
}

/** Fire a real HTTP request at the loopback webhook and collect the response. */
function request(
  port: number,
  opts: { path: string; method?: string; headers?: http.OutgoingHttpHeaders; body?: string },
): Promise<LocalResponse> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: "127.0.0.1", port, path: opts.path, method: opts.method ?? "GET", headers: opts.headers },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () =>
          resolve({ statusCode: res.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") }),
        );
      },
    );
    req.on("error", reject);
    if (opts.body !== undefined) req.write(opts.body);
    req.end();
  });
}

/**
 * Spin up a webhook on an ephemeral port, hand the test a stubbed bot whose
 * processUpdate pushes into `received`, and always close the server afterwards.
 */
async function withWebHook(
  options: ConstructorParameters<typeof TelegramBotWebHook>[1],
  fn: (ctx: { bot: TelegramBot; wh: TelegramBotWebHook; port: number; received: Update[] }) => Promise<void>,
): Promise<void> {
  const bot = new TelegramBot(TOKEN);
  const received: Update[] = [];
  (bot as { processUpdate: (u: Update) => void }).processUpdate = (u) => {
    received.push(u);
  };
  const wh = new TelegramBotWebHook(bot, { port: 0, ...options });
  await wh.open();
  const port = ((wh as unknown as { _server: http.Server })._server.address() as { port: number }).port;
  try {
    await fn({ bot, wh, port, received });
  } finally {
    await wh.close();
  }
}

const sampleUpdate: Update = { update_id: 1, message: { message_id: 1 } } as unknown as Update;

describe("TelegramBotWebHook (unit)", () => {
  afterEach(() => {
    // Each test owns its server via withWebHook's finally; nothing global to reset.
  });

  describe("constructor server selection", () => {
    it("uses a plain HTTP server by default", () => {
      const bot = new TelegramBot(TOKEN);
      const wh = new TelegramBotWebHook(bot, { port: 0 });
      const server = (wh as unknown as { _server: unknown })._server;
      assert.ok(server instanceof http.Server);
    });

    it("uses an HTTPS server when raw https options are supplied", () => {
      const bot = new TelegramBot(TOKEN);
      const wh = new TelegramBotWebHook(bot, { port: 0, https: { handshakeTimeout: 1000 } });
      const server = (wh as unknown as { _server: unknown })._server;
      assert.ok(server instanceof https.Server);
    });

    it("falls back to HTTP when the https option is an empty object", () => {
      const bot = new TelegramBot(TOKEN);
      const wh = new TelegramBotWebHook(bot, { port: 0, https: {} });
      const server = (wh as unknown as { _server: unknown })._server;
      assert.ok(server instanceof http.Server);
    });

    it("exposes defaults for host, port, and healthEndpoint", () => {
      const bot = new TelegramBot(TOKEN);
      const wh = new TelegramBotWebHook(bot);
      assert.equal(wh.host, "0.0.0.0");
      assert.equal(wh.port, 8443);
      assert.equal(wh.healthEndpoint, "/healthz");
    });
  });

  describe("open / close / isOpen lifecycle", () => {
    it("transitions isOpen across open() and close()", async () => {
      const bot = new TelegramBot(TOKEN);
      const wh = new TelegramBotWebHook(bot, { port: 0 });
      assert.equal(wh.isOpen(), false);
      await wh.open();
      assert.equal(wh.isOpen(), true);
      await wh.close();
      assert.equal(wh.isOpen(), false);
    });

    it("open() and close() are idempotent no-ops when already in that state", async () => {
      const bot = new TelegramBot(TOKEN);
      const wh = new TelegramBotWebHook(bot, { port: 0 });
      await wh.close(); // already closed -> no-op
      assert.equal(wh.isOpen(), false);
      await wh.open();
      await wh.open(); // already open -> no-op, must not throw (port already bound)
      assert.equal(wh.isOpen(), true);
      await wh.close();
    });
  });

  describe("request routing", () => {
    it("answers the health endpoint with 200 OK regardless of token", async () => {
      await withWebHook({}, async ({ port, received }) => {
        const res = await request(port, { path: "/healthz" });
        assert.equal(res.statusCode, 200);
        assert.equal(res.body, "OK");
        assert.equal(received.length, 0);
      });
    });

    it("honors a custom healthEndpoint", async () => {
      await withWebHook({ healthEndpoint: "/up" }, async ({ port }) => {
        const res = await request(port, { path: "/up" });
        assert.equal(res.statusCode, 200);
        assert.equal(res.body, "OK");
      });
    });

    it("rejects a path that does not contain the bot token with 401", async () => {
      await withWebHook({}, async ({ port, received }) => {
        const res = await request(port, { path: "/not-the-token", method: "POST", body: "{}" });
        assert.equal(res.statusCode, 401);
        assert.equal(received.length, 0);
      });
    });

    it("accepts a bare /<token> segment, not only /bot<token>", async () => {
      await withWebHook({}, async ({ port, received }) => {
        const res = await request(port, {
          path: `/${TOKEN}`,
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(sampleUpdate),
        });
        assert.equal(res.statusCode, 200);
        assert.equal(received.length, 1);
      });
    });

    it("rejects a path that only embeds the token as a substring with 401", async () => {
      // The token must be a whole path segment: trailing junk inside the segment
      // (which the old String.includes check accepted) no longer authorizes.
      await withWebHook({}, async ({ port, received }) => {
        const res = await request(port, { path: `/bot${TOKEN}extra`, method: "POST", body: "{}" });
        assert.equal(res.statusCode, 401);
        assert.equal(received.length, 0);
      });
    });

    it("rejects non-POST requests on the token path with 418", async () => {
      await withWebHook({}, async ({ port, received }) => {
        const res = await request(port, { path: `/bot${TOKEN}`, method: "GET" });
        assert.equal(res.statusCode, 418);
        assert.equal(received.length, 0);
      });
    });
  });

  describe("secret-token enforcement", () => {
    it("rejects a POST whose secret-token header is missing or wrong with 401", async () => {
      await withWebHook({ secretToken: SECRET }, async ({ port, received }) => {
        const missing = await request(port, {
          path: `/bot${TOKEN}`,
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(sampleUpdate),
        });
        assert.equal(missing.statusCode, 401);

        const wrong = await request(port, {
          path: `/bot${TOKEN}`,
          method: "POST",
          headers: { "x-telegram-bot-api-secret-token": "nope" },
          body: JSON.stringify(sampleUpdate),
        });
        assert.equal(wrong.statusCode, 401);
        assert.equal(received.length, 0);
      });
    });

    it("accepts a POST carrying the correct secret-token header", async () => {
      await withWebHook({ secretToken: SECRET }, async ({ port, received }) => {
        const res = await request(port, {
          path: `/bot${TOKEN}`,
          method: "POST",
          headers: { "x-telegram-bot-api-secret-token": SECRET },
          body: JSON.stringify(sampleUpdate),
        });
        assert.equal(res.statusCode, 200);
        assert.equal(res.body, "OK");
        assert.equal(received.length, 1);
        assert.equal(received[0]!.update_id, 1);
      });
    });
  });

  describe("update dispatch and body parsing", () => {
    it("parses a valid update and forwards it to processUpdate", async () => {
      await withWebHook({}, async ({ port, received }) => {
        const res = await request(port, {
          path: `/bot${TOKEN}`,
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(sampleUpdate),
        });
        assert.equal(res.statusCode, 200);
        assert.equal(res.body, "OK");
        assert.deepEqual(received, [sampleUpdate]);
      });
    });

    it("answers 400 and emits a ParseError on invalid JSON", async () => {
      await withWebHook({}, async ({ bot, port, received }) => {
        const errors: unknown[] = [];
        bot.on("webhook_error", (e) => errors.push(e));
        const res = await request(port, {
          path: `/bot${TOKEN}`,
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{ not json",
        });
        assert.equal(res.statusCode, 400);
        assert.equal(res.body, "Bad Request");
        assert.equal(received.length, 0);
        assert.equal(errors.length, 1);
        assert.ok(errors[0] instanceof ParseError);
      });
    });
  });

  describe("payload safety cap", () => {
    it("emits a FatalError and answers 500 when the body exceeds the 50MB cap", async () => {
      const bot = new TelegramBot(TOKEN);
      const errors: unknown[] = [];
      bot.on("webhook_error", (e) => errors.push(e));
      const dispatched: Update[] = [];
      (bot as { processUpdate: (u: Update) => void }).processUpdate = (u) => {
        dispatched.push(u);
      };
      const wh = new TelegramBotWebHook(bot, { port: 0 });

      // Drive the handler directly with a mock request so we never allocate 50MB.
      // readBody only reads `chunk.length`, and rejects (before buffering) once
      // the running total passes the cap, so a single fake oversized chunk trips it.
      const req = new EventEmitter() as EventEmitter & {
        url: string;
        method: string;
        headers: Record<string, string>;
        destroy: () => void;
      };
      req.url = `/bot${TOKEN}`;
      req.method = "POST";
      req.headers = {};
      req.destroy = () => {};

      let statusCode = 200;
      let body = "";
      const res = {
        get statusCode() {
          return statusCode;
        },
        set statusCode(v: number) {
          statusCode = v;
        },
        end(chunk?: string) {
          if (chunk !== undefined) body += chunk;
        },
      };

      const handle = (wh as unknown as { _handleRequest: (r: unknown, s: unknown) => Promise<void> })._handleRequest;
      const done = handle(req, res);
      // Listeners are attached synchronously inside readBody before this point.
      req.emit("data", { length: 50 * 1024 * 1024 + 1 });
      await done;

      assert.equal(statusCode, 500);
      assert.equal(body, "Server Error");
      assert.equal(dispatched.length, 0);
      assert.equal(errors.length, 1);
      assert.ok(errors[0] instanceof FatalError);
    });
  });
});
