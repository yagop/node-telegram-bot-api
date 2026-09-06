import { describe, test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import net, { type AddressInfo } from "node:net";
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

  test("force-closing a socket mid-body does not raise an unhandled rejection", async (t) => {
    const server = createWebhookServer(fakeBot(), { path: "/", secretToken: "s" });
    if (typeof server.closeAllConnections !== "function") {
      t.skip("runtime has no closeAllConnections");
      return;
    }
    const port = await listen(server);

    const rejections: unknown[] = [];
    const onRejection = (err: unknown): void => {
      rejections.push(err);
    };
    process.on("unhandledRejection", onRejection);

    // Open a raw POST that promises 100 bytes but sends only a few, so the
    // server's readBody() is still awaiting the body when we tear the socket down.
    const sock = net.connect(port, "127.0.0.1");
    await new Promise<void>((resolve) => sock.on("connect", () => resolve()));
    sock.write(
      "POST / HTTP/1.1\r\nHost: x\r\nx-telegram-bot-api-secret-token: s\r\n" +
        'Content-Type: application/json\r\nContent-Length: 100\r\n\r\n{"partial":',
    );
    sock.on("error", () => {}); // ignore the reset our own force-close causes

    // Let the request reach the server, then force-close: destroys the socket
    // after ~1ms, making readBody reject with ECONNRESET on the discarded handler
    // promise. Without the `.catch` that would surface as an unhandled rejection.
    await new Promise((r) => setTimeout(r, 30));
    const forceTimer = gracefulClose(server, 1);

    // Give the force-close and any pending rejection time to surface.
    await new Promise((r) => setTimeout(r, 80));

    clearTimeout(forceTimer);
    sock.destroy();
    server.closeAllConnections?.();
    process.off("unhandledRejection", onRejection);

    assert.deepStrictEqual(rejections, []);
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

  test("startWebhook shuts down via its signal handler, dropping an idle connection, and is idempotent", async (t) => {
    // Needs the Node 18.2+ connection helpers; skip where a runtime lacks them
    // (without them the idle socket would keep close() pending and this hangs).
    if (typeof http.createServer().closeIdleConnections !== "function") {
      t.skip("runtime has no closeIdleConnections");
      return;
    }

    // Rather than mutating process-global signal state (removeAllListeners /
    // emit, which can disturb other tests or the runner), snapshot the SIGTERM
    // listeners, let startWebhook add its own, then invoke *that* handler directly.
    const before = new Set(process.listeners("SIGTERM"));

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

      // Grab the handler startWebhook installed (poll: it may appear a tick after
      // the socket is accepted), without touching anyone else's listeners.
      let stop: (() => void) | undefined;
      for (let i = 0; i < 50 && !stop; i++) {
        stop = process.listeners("SIGTERM").find((l) => !before.has(l)) as (() => void) | undefined;
        if (!stop) await new Promise((r) => setTimeout(r, 10));
      }
      assert.ok(stop, "startWebhook installed a SIGTERM handler");

      // Call it twice: the second is a no-op (idempotent stop).
      stop();
      stop();

      // Resolves rather than hanging: the idle keep-alive socket was dropped.
      await running;

      // finally ran: startWebhook removed its own handler (back to the snapshot).
      assert.ok(!process.listeners("SIGTERM").some((l) => !before.has(l)));
    } finally {
      agent.destroy();
    }
  });
});
