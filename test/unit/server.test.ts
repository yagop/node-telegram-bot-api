import { describe, test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import type { Bot } from "../../src/core/bot.js";
import { createWebhookServer, startWebhook } from "../../src/node/server.js";
import type { Update } from "../../src/types/index.js";

/** A fake Bot exposing only handleUpdate (all that the webhook path needs). */
function fakeBot(): Bot {
  return {
    handleUpdate: async (_update: Update) => {},
  } as unknown as Bot;
}

/** Listen on an ephemeral port and resolve with the assigned port number. */
function listen(server: http.Server): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve((server.address() as AddressInfo).port));
  });
}

describe("webhook server shutdown", () => {
  // The hang #1350's second half describes: `server.close()` alone waits for
  // every existing connection to end, so an idle keep-alive socket keeps the
  // server (and a `startWebhook` promise) open forever. Dropping idle
  // connections lets `close` complete.
  test("close() completes despite an idle keep-alive connection once idle sockets are dropped", async (t) => {
    const server = createWebhookServer(fakeBot(), { path: "/", secretToken: "s" });
    if (typeof server.closeIdleConnections !== "function") {
      t.skip("runtime has no closeIdleConnections");
      return;
    }
    const port = await listen(server);

    // Make one request over a keep-alive agent (to a non-webhook path, so the
    // server 404s without invoking the handler), then leave the socket idle-open.
    const agent = new http.Agent({ keepAlive: true, maxSockets: 1 });
    await new Promise<void>((resolve, reject) => {
      const req = http.request({ host: "127.0.0.1", port, path: "/nope", method: "GET", agent }, (res) => {
        res.on("data", () => {});
        res.on("end", () => resolve());
      });
      req.on("error", reject);
      req.end();
    });

    let closed = false;
    server.on("close", () => {
      closed = true;
    });

    server.close(); // would hang here alone: the keep-alive socket is still open
    server.closeIdleConnections(); // ...so drop it, letting `close` fire

    // Wait briefly for the close event (poll, no fixed sleep).
    for (let i = 0; i < 50 && !closed; i++) await new Promise((r) => setTimeout(r, 10));
    agent.destroy();
    assert.strictEqual(closed, true);
  });

  test("startWebhook rejects on a listen error and removes its signal handlers", async () => {
    // Occupy a port, then point startWebhook at it so `listen` errors (EADDRINUSE).
    const blocker = http.createServer();
    const port = await listen(blocker);

    const beforeInt = process.listenerCount("SIGINT");
    const beforeTerm = process.listenerCount("SIGTERM");

    let caught: unknown;
    try {
      await startWebhook(fakeBot(), { port, hostname: "127.0.0.1", secretToken: "s" });
    } catch (err) {
      caught = err;
    }

    assert.ok(caught instanceof Error);
    // The finally ran: no leaked signal listeners.
    assert.strictEqual(process.listenerCount("SIGINT"), beforeInt);
    assert.strictEqual(process.listenerCount("SIGTERM"), beforeTerm);

    await new Promise<void>((resolve) => blocker.close(() => resolve()));
  });
});
