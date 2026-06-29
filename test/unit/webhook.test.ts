import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Bot } from "../../src/core/bot.js";
import { type DebugSink, getDebugSink, setDebugSink } from "../../src/core/debug.js";
import { safeEqual, webhookCallback } from "../../src/core/webhook.js";
import { compileDebugFilter } from "../../src/node/debug.js";
import type { Update } from "../../src/types/index.js";

/** A fake Bot exposing only handleUpdate, recording the updates it receives. */
function fakeBot() {
  const received: Update[] = [];
  const bot = {
    handleUpdate: async (update: Update) => {
      received.push(update);
    },
  } as unknown as Bot;
  return { bot, received };
}

const UPDATE = { update_id: 1, message: { message_id: 1 } };

describe("webhookCallback", () => {
  test("valid POST with correct secret -> 200 and handleUpdate invoked", async () => {
    const { bot, received } = fakeBot();
    const handle = webhookCallback(bot, { secretToken: "s" });
    const res = await handle(
      new Request("https://h/hook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-telegram-bot-api-secret-token": "s",
        },
        body: JSON.stringify(UPDATE),
      }),
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(received.length, 1);
    assert.strictEqual(received[0]!.update_id, 1);
  });

  test("wrong secret -> 401, handleUpdate not invoked", async () => {
    const { bot, received } = fakeBot();
    const handle = webhookCallback(bot, { secretToken: "s" });
    const res = await handle(
      new Request("https://h/hook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-telegram-bot-api-secret-token": "wrong",
        },
        body: JSON.stringify(UPDATE),
      }),
    );
    assert.strictEqual(res.status, 401);
    assert.strictEqual(received.length, 0);
  });

  test("GET -> 405", async () => {
    const { bot } = fakeBot();
    const handle = webhookCallback(bot, { secretToken: "s" });
    const res = await handle(new Request("https://h/hook", { method: "GET" }));
    assert.strictEqual(res.status, 405);
  });

  test("malformed JSON body -> 400", async () => {
    const { bot, received } = fakeBot();
    const handle = webhookCallback(bot, { secretToken: "s" });
    const res = await handle(
      new Request("https://h/hook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-telegram-bot-api-secret-token": "s",
        },
        body: "{ not json",
      }),
    );
    assert.strictEqual(res.status, 400);
    assert.strictEqual(received.length, 0);
  });

  test("fastAck returns 200 before the handler finishes, but still invokes it", async () => {
    // handleUpdate stays pending until we trigger it; the handler must ACK first.
    let resolveHandler!: () => void;
    let invoked = false;
    const handlerDone = new Promise<void>((resolve) => {
      resolveHandler = resolve;
    });
    const bot = {
      handleUpdate: () => {
        invoked = true;
        return handlerDone;
      },
    } as unknown as Bot;

    const handle = webhookCallback(bot, { fastAck: true, allowUnauthenticated: true });
    const res = await handle(
      new Request("https://h/hook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(UPDATE),
      }),
    );

    // We resolved to a 200 while handleUpdate is still pending.
    assert.strictEqual(res.status, 200);
    assert.strictEqual(invoked, true);

    // Now let the background handler complete; should not throw.
    resolveHandler();
    await handlerDone;
  });

  test("waitUntil receives the background promise and 200 is returned without awaiting", async () => {
    let resolveHandler!: () => void;
    const handlerDone = new Promise<void>((resolve) => {
      resolveHandler = resolve;
    });
    const bot = {
      handleUpdate: () => handlerDone,
    } as unknown as Bot;

    let captured: Promise<unknown> | undefined;
    const handle = webhookCallback(bot, {
      allowUnauthenticated: true,
      waitUntil: (p) => {
        captured = p;
      },
    });
    const res = await handle(
      new Request("https://h/hook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(UPDATE),
      }),
    );

    assert.strictEqual(res.status, 200);
    assert.ok(captured instanceof Promise);

    resolveHandler();
    await captured; // wrapped promise resolves (and never rejects)
  });

  test("fastAck swallows a rejecting handler (no unhandled rejection)", async () => {
    const bot = {
      handleUpdate: () => Promise.reject(new Error("boom")),
    } as unknown as Bot;

    let captured: Promise<unknown> | undefined;
    const handle = webhookCallback(bot, {
      allowUnauthenticated: true,
      waitUntil: (p) => {
        captured = p;
      },
    });
    const res = await handle(
      new Request("https://h/hook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(UPDATE),
      }),
    );

    assert.strictEqual(res.status, 200);
    // The promise handed to waitUntil resolves (rejection is swallowed).
    assert.strictEqual(await captured, undefined);
  });

  test("fastAck logs a rejecting handler when no bot.catch() recovers it", async () => {
    // With debug tracing captured, a handler rejection that escapes handleUpdate
    // (no bot.catch() boundary) must surface in the log instead of vanishing.
    const original = getDebugSink();
    setDebugSink({
      enabled: (ns) => ns === "node-telegram-bot-api:webhook",
      write: (ns, line) => lines.push([ns, line]),
    });
    const lines: Array<[string, string]> = [];
    try {
      const bot = {
        handleUpdate: () => Promise.reject(new Error("handler boom")),
      } as unknown as Bot;
      const handle = webhookCallback(bot, { fastAck: true, allowUnauthenticated: true });
      const res = await handle(
        new Request("https://h/hook", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(UPDATE),
        }),
      );
      assert.strictEqual(res.status, 200);
      // Let the background `.catch` (which writes the log line) settle.
      await new Promise((r) => setTimeout(r, 0));
      assert.ok(
        lines.some(([, line]) => line.includes("background handleUpdate failed") && line.includes("handler boom")),
        `expected a failure log line, got: ${JSON.stringify(lines)}`,
      );
    } finally {
      setDebugSink(original);
    }
  });

  test("no secret and no opt-out -> throws at setup", () => {
    const { bot } = fakeBot();
    assert.throws(() => webhookCallback(bot), /requires `secretToken`/);
    assert.throws(() => webhookCallback(bot, {}), /requires `secretToken`/);
  });

  test("no secret but allowUnauthenticated -> ok (no throw)", () => {
    const { bot } = fakeBot();
    assert.doesNotThrow(() => webhookCallback(bot, { allowUnauthenticated: true }));
  });

  test("malformed secret token -> throws at setup", () => {
    const { bot } = fakeBot();
    assert.throws(() => webhookCallback(bot, { secretToken: "" }), /Invalid `secretToken`/);
    assert.throws(() => webhookCallback(bot, { secretToken: "has spaces" }), /Invalid `secretToken`/);
    assert.throws(() => webhookCallback(bot, { secretToken: "a".repeat(257) }), /Invalid `secretToken`/);
  });

  test("missing secret header runs the compare and fails with 401", async () => {
    const { bot, received } = fakeBot();
    const handle = webhookCallback(bot, { secretToken: "s" });
    const res = await handle(
      new Request("https://h/hook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(UPDATE),
      }),
    );
    assert.strictEqual(res.status, 401);
    assert.strictEqual(received.length, 0);
  });
});

describe("safeEqual", () => {
  test("equal strings -> true", () => {
    assert.strictEqual(safeEqual("secret", "secret"), true);
    assert.strictEqual(safeEqual("", ""), true);
  });

  test("differing content of same length -> false", () => {
    assert.strictEqual(safeEqual("secret", "secreT"), false);
    assert.strictEqual(safeEqual("aaaa", "aaab"), false);
  });

  test("differing lengths -> false", () => {
    assert.strictEqual(safeEqual("secret", "secre"), false);
    assert.strictEqual(safeEqual("", "x"), false);
    assert.strictEqual(safeEqual("x", ""), false);
  });
});
