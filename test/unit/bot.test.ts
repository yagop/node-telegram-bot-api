import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { Bot } from "../../src/core/bot.js";
import type { Update } from "../../src/types/index.js";

const FETCH_NEVER = (async () => {
  throw new Error("network should not be used in these tests");
}) as unknown as typeof fetch;

function newBot(): Bot {
  return new Bot("123:ABC", { fetch: FETCH_NEVER, username: "test_bot" });
}

function messageUpdate(text: string, updateId = 1): Update {
  return {
    update_id: updateId,
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

  test("hears matches a sticky RegExp independently for each update", async () => {
    const bot = newBot();
    const matches: string[] = [];
    bot.hears(/n(\d+)/y, (ctx) => {
      matches.push((ctx.match as RegExpMatchArray)[1]!);
    });

    await bot.handleUpdate(messageUpdate("n42", 1));
    await bot.handleUpdate(messageUpdate("n43", 2));
    await bot.handleUpdate(messageUpdate("other", 3));
    await bot.handleUpdate(messageUpdate("n44", 4));

    assert.deepEqual(matches, ["42", "43", "44"]);
  });

  test("hears starts matching a reused sticky RegExp at the beginning", async () => {
    const bot = newBot();
    const trigger = /hello/y;
    trigger.lastIndex = 2;
    let fired = 0;
    bot.hears(["other", trigger], () => {
      fired += 1;
    });

    await bot.handleUpdate(messageUpdate("hello"));

    assert.equal(fired, 1);
  });

  test("hears supports a frozen RegExp without stateful flags", async () => {
    const bot = newBot();
    let fired = 0;
    bot.hears(Object.freeze(/hello/), () => {
      fired += 1;
    });

    await bot.handleUpdate(messageUpdate("hello"));

    assert.equal(fired, 1);
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

/** Capture `console.error` calls for the duration of `fn`, restoring after. */
async function captureConsoleError<T>(fn: () => Promise<T>): Promise<{ value: T; calls: unknown[][] }> {
  const calls: unknown[][] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    calls.push(args);
  };
  try {
    const value = await fn();
    return { value, calls };
  } finally {
    console.error = original;
  }
}

describe("Bot error boundary", () => {
  test("default boundary: a throwing handler is logged and the update consumed", async () => {
    const bot = newBot();
    bot.on("message", () => {
      throw new Error("boom");
    });
    // handleUpdate resolving IS the assertion that the update was consumed.
    const { calls } = await captureConsoleError(() => bot.handleUpdate(messageUpdate("x", 7)));
    assert.strictEqual(calls.length, 1);
    assert.match(String(calls[0]?.[0]), /update 7/);
  });

  test("catch() replaces the default boundary (nothing hits console.error)", async () => {
    const bot = newBot();
    let caught: unknown;
    bot.catch((err) => {
      caught = err;
    });
    bot.on("message", () => {
      throw new Error("boom");
    });
    const { calls } = await captureConsoleError(() => bot.handleUpdate(messageUpdate("x")));
    assert.strictEqual((caught as Error).message, "boom");
    assert.strictEqual(calls.length, 0);
  });

  test("polling survives a throwing handler and continues to the next update", async () => {
    const bot = newBot();
    const handled: number[] = [];
    bot.on("message", (ctx) => {
      handled.push(ctx.update.update_id);
      if (ctx.update.update_id === 1) throw new Error("boom");
      return Promise.resolve();
    });
    async function* source(): AsyncGenerator<Update> {
      yield messageUpdate("a", 1);
      yield messageUpdate("b", 2);
    }
    await captureConsoleError(() => bot.startPolling(source()));
    assert.deepStrictEqual(handled, [1, 2]);
    assert.strictEqual(bot.isRunning(), false);
  });

  test("a throw from the catch boundary stops polling (fail-loud opt-in)", async () => {
    const bot = newBot();
    bot.catch((err) => {
      throw err;
    });
    const handled: number[] = [];
    bot.on("message", (ctx) => {
      handled.push(ctx.update.update_id);
      throw new Error("boom");
    });
    async function* source(): AsyncGenerator<Update> {
      yield messageUpdate("a", 1);
      yield messageUpdate("b", 2);
    }
    await assert.rejects(() => bot.startPolling(source()), /boom/);
    assert.deepStrictEqual(handled, [1]);
    assert.strictEqual(bot.isRunning(), false);
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

function meResponse(username: string): Response {
  const result = { id: 1, is_bot: true, first_name: "B", username };
  return new Response(JSON.stringify({ ok: true, result }));
}

/** A fake `fetch` that answers `getMe` with the username(s) given, last one repeating. */
function getMeFetch(...results: Array<string | Error>): {
  fetch: typeof fetch;
  calls: () => number;
} {
  let calls = 0;
  const impl = (async () => {
    const result = results[Math.min(calls, results.length - 1)] as string | Error;
    calls += 1;
    if (result instanceof Error) {
      throw result;
    }
    return meResponse(result);
  }) as unknown as typeof fetch;
  return { fetch: impl, calls: () => calls };
}

/** Run `fn` with `Date.now()` moved `ms` into the future. */
async function afterMs(ms: number, fn: () => Promise<void>): Promise<void> {
  const realNow = Date.now;
  const start = realNow();
  Date.now = () => start + ms;
  try {
    await fn();
  } finally {
    Date.now = realNow;
  }
}

/** Let an in-flight background refresh settle. */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("Bot command addressing", () => {
  const HOUR = 60 * 60 * 1000;

  async function handled(bot: Bot, name: string, text: string): Promise<boolean> {
    let hit = false;
    let fellThrough = false;
    bot.command(name, () => {
      hit = true;
    });
    bot.use(() => {
      fellThrough = true;
    });
    await bot.handleUpdate(messageUpdate(text));
    assert.strictEqual(fellThrough, !hit, "a non-matching command must reach next()");
    return hit;
  }

  const cases: Array<[name: string, text: string, expected: boolean]> = [
    ["start", "/start", true],
    ["start", "/start@my_bot", true],
    ["start", "/start@MY_BOT", true],
    ["START", "/START@MY_BOT", true],
    ["start", "/start@other_bot", false],
    // The command name stays case-sensitive; only the @name part is not.
    ["start", "/START@MY_BOT", false],
    ["start", "/START", false],
  ];

  for (const [name, text, expected] of cases) {
    test(`getMe: command("${name}") ${expected ? "handles" : "ignores"} ${text}`, async () => {
      const { fetch } = getMeFetch("My_Bot");
      assert.strictEqual(await handled(new Bot("123:ABC", { fetch }), name, text), expected);
    });

    test(`option: command("${name}") ${expected ? "handles" : "ignores"} ${text}`, async () => {
      const bot = new Bot("123:ABC", { fetch: FETCH_NEVER, username: "My_Bot" });
      assert.strictEqual(await handled(bot, name, text), expected);
    });
  }

  test("ctx.match is still the args of a command addressed to this bot", async () => {
    const { fetch } = getMeFetch("my_bot");
    const bot = new Bot("123:ABC", { fetch });
    let match: unknown;
    bot.command("start", (ctx) => {
      match = ctx.match;
    });
    await bot.handleUpdate(messageUpdate("/start@my_bot a b"));
    assert.strictEqual(match, "a b");
  });

  test("the username option skips getMe and accepts a leading @", async () => {
    const bot = new Bot("123:ABC", { fetch: FETCH_NEVER, username: "@my_bot" });
    assert.strictEqual(await handled(bot, "start", "/start@my_bot"), true);
    assert.strictEqual(bot.botInfo, undefined);
  });

  test("init() exposes the getMe result as botInfo and calls it once", async () => {
    const { fetch, calls } = getMeFetch("my_bot");
    const bot = new Bot("123:ABC", { fetch });
    const before = bot.botInfo;
    await bot.init();
    await bot.handleUpdate(messageUpdate("hello"));
    assert.strictEqual(before, undefined);
    assert.strictEqual(bot.botInfo?.username, "my_bot");
    assert.strictEqual(calls(), 1);
  });

  test("a failed startup getMe reaches the catch boundary and is retried", async () => {
    const { fetch, calls } = getMeFetch(new Error("down"), "my_bot");
    const bot = new Bot("123:ABC", { fetch, maxRetries: 0 });
    const errors: unknown[] = [];
    let hits = 0;
    bot.catch((err) => {
      errors.push(err);
    });
    bot.command("start", () => {
      hits += 1;
    });
    await bot.handleUpdate(messageUpdate("/start@my_bot"));
    assert.strictEqual(errors.length, 1);
    assert.strictEqual(hits, 0);
    await bot.handleUpdate(messageUpdate("/start@my_bot"));
    assert.strictEqual(errors.length, 1);
    assert.strictEqual(hits, 1);
    assert.strictEqual(calls(), 2);
  });

  test("an expired username is refreshed in the background by the next update", async () => {
    const { fetch, calls } = getMeFetch("old_bot", "new_bot");
    const bot = new Bot("123:ABC", { fetch });
    const hits: string[] = [];
    bot.command("start", (ctx) => {
      hits.push(ctx.message?.text ?? "");
    });
    await bot.init();

    await afterMs(HOUR - 1000, async () => {
      await bot.handleUpdate(messageUpdate("/start@old_bot"));
      assert.strictEqual(calls(), 1);
    });

    await afterMs(HOUR + 1000, async () => {
      // The update that triggers the refresh is matched against the old value.
      await bot.handleUpdate(messageUpdate("/start@old_bot"));
      assert.strictEqual(calls(), 2);
      await settle();
      await bot.handleUpdate(messageUpdate("/start@new_bot"));
      await bot.handleUpdate(messageUpdate("/start@old_bot"));
    });

    assert.deepStrictEqual(hits, ["/start@old_bot", "/start@old_bot", "/start@new_bot"]);
    assert.strictEqual(bot.botInfo?.username, "new_bot");
    assert.strictEqual(calls(), 2);
  });

  test("a failed refresh keeps the old username and is tried again", async () => {
    const { fetch, calls } = getMeFetch("my_bot", new Error("down"), "my_bot");
    const bot = new Bot("123:ABC", { fetch, maxRetries: 0 });
    const errors: unknown[] = [];
    let hits = 0;
    bot.catch((err) => {
      errors.push(err);
    });
    bot.command("start", () => {
      hits += 1;
    });
    await bot.init();

    await afterMs(HOUR + 1000, async () => {
      await bot.handleUpdate(messageUpdate("/start@my_bot"));
      await settle();
      await bot.handleUpdate(messageUpdate("/start@my_bot"));
      await settle();
      assert.strictEqual(calls(), 3);
      await bot.handleUpdate(messageUpdate("/start@my_bot"));
    });

    assert.strictEqual(hits, 3);
    assert.deepStrictEqual(errors, []);
    assert.strictEqual(calls(), 3);
  });

  test("only one refresh is in flight at a time", async () => {
    let release = (): void => {};
    let calls = 0;
    const fetch = (async () => {
      calls += 1;
      if (calls > 1) {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      }
      return meResponse("my_bot");
    }) as unknown as typeof globalThis.fetch;
    const bot = new Bot("123:ABC", { fetch });
    await bot.init();

    await afterMs(HOUR + 1000, async () => {
      await bot.handleUpdate(messageUpdate("a"));
      await bot.handleUpdate(messageUpdate("b"));
      assert.strictEqual(calls, 2);
      release();
      await settle();
    });
  });

  test("close() and a later init() keep the cached botInfo", async () => {
    const { fetch, calls } = getMeFetch("my_bot");
    const bot = new Bot("123:ABC", { fetch });
    await bot.init();
    await bot.close();
    await bot.init();
    assert.strictEqual(calls(), 1);
  });
});
