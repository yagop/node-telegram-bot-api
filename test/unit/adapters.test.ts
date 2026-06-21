import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { type NodeLikeRequest, type NodeLikeResponse, nodeFrameworkWebhook } from "../../src/core/adapters.js";
import type { Bot } from "../../src/core/bot.js";
import type { Update } from "../../src/types/index.js";

/** A fake Bot recording the updates handleUpdate receives. */
function fakeBot() {
  const received: Update[] = [];
  const bot = {
    handleUpdate: async (update: Update) => {
      received.push(update);
    },
  } as unknown as Bot;
  return { bot, received };
}

const UPDATE = { update_id: 7, message: { message_id: 1 } };

/** Build a NodeLike request whose raw stream yields `chunks` and whose `body` is `pre`. */
function fakeReq(opts: { body?: unknown; chunks?: Array<string | Uint8Array> } = {}): NodeLikeRequest {
  return {
    method: "POST",
    url: "/hook",
    headers: { "content-type": "application/json" },
    body: opts.body,
    async *[Symbol.asyncIterator]() {
      for (const c of opts.chunks ?? []) yield c;
    },
  };
}

/** A fake response capturing the status and body written by the adapter. */
function fakeRes() {
  const res = {
    statusCode: 0,
    body: undefined as string | undefined,
    setHeader() {},
    end(chunk?: string) {
      this.body = chunk;
    },
  };
  return res as NodeLikeResponse & { body?: string };
}

describe("nodeFrameworkWebhook body source", () => {
  test("uses a pre-parsed object body (stream already consumed by a parser)", async () => {
    const { bot, received } = fakeBot();
    const handle = nodeFrameworkWebhook(bot, { allowUnauthenticated: true });
    // req.body is the parsed object; the raw stream is empty (a parser drained it).
    await handle(fakeReq({ body: UPDATE, chunks: [] }), fakeRes());
    assert.strictEqual(received.length, 1);
    assert.strictEqual(received[0]!.update_id, 7);
  });

  test("uses a pre-parsed string body verbatim", async () => {
    const { bot, received } = fakeBot();
    const handle = nodeFrameworkWebhook(bot, { allowUnauthenticated: true });
    await handle(fakeReq({ body: JSON.stringify(UPDATE) }), fakeRes());
    assert.strictEqual(received[0]!.update_id, 7);
  });

  test("decodes a pre-parsed Uint8Array/Buffer body", async () => {
    const { bot, received } = fakeBot();
    const handle = nodeFrameworkWebhook(bot, { allowUnauthenticated: true });
    const bytes = new TextEncoder().encode(JSON.stringify(UPDATE));
    await handle(fakeReq({ body: bytes }), fakeRes());
    assert.strictEqual(received[0]!.update_id, 7);
  });

  test("falls back to draining the raw stream when no body is set", async () => {
    const { bot, received } = fakeBot();
    const handle = nodeFrameworkWebhook(bot, { allowUnauthenticated: true });
    const bytes = new TextEncoder().encode(JSON.stringify(UPDATE));
    await handle(fakeReq({ chunks: [bytes] }), fakeRes());
    assert.strictEqual(received[0]!.update_id, 7);
  });

  test("enforces the secret token through the adapter", async () => {
    const { bot, received } = fakeBot();
    const handle = nodeFrameworkWebhook(bot, { secretToken: "s" });
    const res = fakeRes();
    // No secret header -> the core callback rejects with 401.
    await handle(fakeReq({ body: UPDATE }), res);
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(received.length, 0);
  });
});
