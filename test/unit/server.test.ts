import { describe, test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import type { Bot } from "../../src/core/bot.js";
import { createWebhookServer, gracefulClose, startWebhook } from "../../src/node/server.js";
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

/** Grab a free ephemeral port by briefly binding and releasing one. */
async function freePort(): Promise<number> {
  const s = http.createServer();
  const port = await listen(s);
  await new Promise<void>((resolve) => s.close(() => resolve()));
  return port;
}

/** GET the given path over a keep-alive agent, resolving once the response ends. */
function keepAliveGet(port: number, path: string, agent: http.Agent): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, path, method: "GET", agent }, (res) => {
      res.on("data", () => {});
      res.on("end", () => resolve());
    });
    req.on("error", reject);
    req.end();
  });
}

describe("webhook server shutdown", () => {
  // The hang #1350's second half describes: `server.close()` alone waits for
  // every existing connection to end, so an idle keep-alive socket keeps the
  // server (and a `startWebhook` promise) open forever. `gracefulClose` drops
  // idle connections so `close` can complete.
  test("gracefulClose completes despite an idle keep-alive connection", async (t) => {
    const server = createWebhookServer(fakeBot(), { path: "/", secretToken: "s" });
    if (typeof server.closeIdleConnections !== "function") {
      t.skip("runtime has no closeIdleConnections");
      return;
    }
    const port = await listen(server);

    // Make one request over a keep-alive agent (to a non-webhook path, so the
    // server 404s without invoking the handler), then leave the socket idle-open.
    const agent = new http.Agent({ keepAlive: true, maxSockets: 1 });
    await keepAliveGet(port, "/nope", agent);

    let closed = false;
    server.on("close", () => {
      closed = true;
    });

    const forceTimer = gracefulClose(server, 10_000); // would hang without dropping the idle socket

    // Wait briefly for the close event (poll, no fixed sleep).
    for (let i = 0; i < 50 && !closed; i++) await new Promise((r) => setTimeout(r, 10));
    clearTimeout(forceTimer);
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

  test("startWebhook shuts down on a signal, dropping an idle connection, and is idempotent", async (t) => {
    // Needs the Node 18.2+ connection helpers; skip where a runtime lacks them
    // (without them the idle socket would keep close() pending and this hangs).
    if (typeof http.createServer().closeIdleConnections !== "function") {
      t.skip("runtime has no closeIdleConnections");
      return;
    }

    // Detach any pre-existing signal listeners (e.g. the test runner's) so our
    // synthetic emit reaches only startWebhook's handler; restored in finally.
    const savedInt = process.listeners("SIGINT");
    const savedTerm = process.listeners("SIGTERM");
    process.removeAllListeners("SIGINT");
    process.removeAllListeners("SIGTERM");

    const agent = new http.Agent({ keepAlive: true, maxSockets: 1 });
    try {
      const port = await freePort();
      const running = startWebhook(fakeBot(), {
        port,
        hostname: "127.0.0.1",
        secretToken: "s",
        shutdownTimeoutMs: 50,
      });

      // Wait for the server to accept, then leave an idle keep-alive socket open.
      for (let i = 0; i < 50; i++) {
        try {
          await keepAliveGet(port, "/nope", agent);
          break;
        } catch {
          await new Promise((r) => setTimeout(r, 10));
        }
      }
      assert.strictEqual(process.listenerCount("SIGTERM"), 1); // handler installed

      // Two signals in a row: the second must be a no-op (idempotent stop).
      process.emit("SIGTERM");
      process.emit("SIGTERM");

      // Resolves rather than hanging: the idle keep-alive socket was dropped.
      await running;

      // finally ran: startWebhook removed its own handlers.
      assert.strictEqual(process.listenerCount("SIGINT"), 0);
      assert.strictEqual(process.listenerCount("SIGTERM"), 0);
    } finally {
      agent.destroy();
      for (const l of savedInt) process.on("SIGINT", l as (...a: unknown[]) => void);
      for (const l of savedTerm) process.on("SIGTERM", l as (...a: unknown[]) => void);
    }
  });
});
