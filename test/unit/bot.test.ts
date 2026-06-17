import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { Bot } from "../../src/core/bot.js";
import type { Update } from "../../src/types/index.js";

const FETCH_NEVER = (async () => {
  throw new Error("network should not be used in these tests");
}) as unknown as typeof fetch;

function newBot(): Bot {
  return new Bot("123:ABC", { fetch: FETCH_NEVER });
}

function messageUpdate(text: string): Update {
  return {
    update_id: 1,
    message: {
      message_id: 1,
      date: 0,
      chat: { id: 1, type: "private" },
      from: { id: 2, is_bot: false, first_name: "A" },
      text,
    },
  } as unknown as Update;
}

function callbackUpdate(): Update {
  return {
    update_id: 2,
    callback_query: {
      id: "cq",
      from: { id: 2, is_bot: false, first_name: "A" },
      chat_instance: "ci",
      data: "d",
    },
  } as unknown as Update;
}

describe("Bot routing", () => {
  test('on("message") fires only for message updates', async () => {
    const bot = newBot();
    let fired = 0;
    bot.on("message", (_ctx, next) => {
      fired += 1;
      return next();
    });
    await bot.handleUpdate(messageUpdate("hello"));
    await bot.handleUpdate(callbackUpdate());
    assert.strictEqual(fired, 1);
  });

  test('command("start") sets ctx.match to the args string', async () => {
    const bot = newBot();
    let match: unknown;
    bot.command("start", (ctx) => {
      match = ctx.match;
    });
    await bot.handleUpdate(messageUpdate("/start a b"));
    assert.strictEqual(match, "a b");
  });

  test('command("start") sets ctx.match to "" with no args', async () => {
    const bot = newBot();
    let match: unknown = "unset";
    bot.command("start", (ctx) => {
      match = ctx.match;
    });
    await bot.handleUpdate(messageUpdate("/start"));
    assert.strictEqual(match, "");
  });

  test("hears(/n(\\d+)/) sets ctx.match to the RegExpMatchArray", async () => {
    const bot = newBot();
    let match: RegExpMatchArray | undefined;
    bot.hears(/n(\d+)/, (ctx) => {
      match = ctx.match as RegExpMatchArray;
    });
    await bot.handleUpdate(messageUpdate("n42"));
    assert.notStrictEqual(match, undefined);
    assert.strictEqual(match![1], "42");
  });

  test("catch handler receives a thrown error", async () => {
    const bot = newBot();
    const boom = new Error("boom");
    let caught: unknown;
    bot.catch((err) => {
      caught = err;
    });
    bot.on("message", () => {
      throw boom;
    });
    await bot.handleUpdate(messageUpdate("x"));
    assert.strictEqual(caught, boom);
  });
});

describe("Bot polling", () => {
  test("startPolling throws if called while already running (keeps isRunning truthful)", async () => {
    const bot = newBot();
    // A source whose first `next()` blocks until we resolve it, so the pump
    // stays parked with `running === true`.
    const waiters: Array<() => void> = [];
    const source: AsyncIterable<Update> = {
      [Symbol.asyncIterator]() {
        return {
          next: () =>
            new Promise<IteratorResult<Update>>((resolve) => {
              waiters.push(() => resolve({ done: true, value: undefined as unknown as Update }));
            }),
        };
      },
    };

    const first = bot.startPolling(source);
    await Promise.resolve(); // let `running = true` apply synchronously
    assert.strictEqual(bot.isRunning(), true);

    await assert.rejects(() => bot.startPolling(source), /already running/);

    // Draining the source ends the first run cleanly.
    waiters.forEach((fn) => fn());
    await first;
    assert.strictEqual(bot.isRunning(), false);
  });
});
