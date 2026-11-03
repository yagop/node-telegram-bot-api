import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { Bot } from "../../src/core/bot.js";
import type { Update, User } from "../../src/types/index.js";

const FETCH_NEVER = (async () => {
  throw new Error("network should not be used in these tests");
}) as unknown as typeof fetch;

function newBot(): Bot {
  // `username` skips the init() getMe(), so these tests make no network call.
  return new Bot("123:ABC", { fetch: FETCH_NEVER, username: "testbot" });
}

/**
 * A fake `fetch` that answers `getMe` with a bot `User` carrying `username`,
 * counting how often it is called. Command bots learn their identity via
 * `getMe()`, so they need this instead of `FETCH_NEVER`.
 */
function getMeFetch(username = "thisbot"): { fetch: typeof fetch; counter: { calls: number } } {
  const counter = { calls: 0 };
  const fake = (async (url: string | URL | Request) => {
    counter.calls += 1;
    assert.match(String(url), /\/getMe$/, "a command bot should only call getMe");
    const result = { id: 7, is_bot: true, first_name: "Bot", username };
    return new Response(JSON.stringify({ ok: true, result }));
  }) as unknown as typeof fetch;
  return { fetch: fake, counter };
}

/** A command bot whose `getMe()` resolves to a fixed `username`. */
function newCommandBot(username = "thisbot"): Bot {
  return new Bot("123:ABC", getMeFetch(username));
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
    const bot = newCommandBot();
    let match: unknown;
    bot.command("start", (ctx) => {
      match = ctx.match;
    });
    await bot.handleUpdate(messageUpdate("/start a b"));
    assert.strictEqual(match, "a b");
  });

  test('command("start") sets ctx.match to "" with no args', async () => {
    const bot = newCommandBot();
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

describe("Bot command @-addressing", () => {
  // One axis only: the command name is held constant ("start") while the
  // `@name` suffix varies. `` and the own `@name` (any case) match; another
  // bot's `@name` falls through to downstream middleware.
  const cases: Array<{ suffix: string; matches: boolean }> = [
    { suffix: "", matches: true },
    { suffix: "@thisbot", matches: true },
    { suffix: "@THISBOT", matches: true },
    { suffix: "@otherbot", matches: false },
  ];

  for (const { suffix, matches } of cases) {
    const text = `/start${suffix} hi`;
    test(`${text} ${matches ? "matches this bot" : "falls through"}`, async () => {
      const bot = newCommandBot("thisbot");
      let fired = false;
      let fellThrough = false;
      bot.command("start", () => {
        fired = true;
      });
      bot.use(() => {
        fellThrough = true;
        return Promise.resolve();
      });
      await bot.handleUpdate(messageUpdate(text));
      assert.strictEqual(fired, matches, `handler for ${JSON.stringify(text)}`);
      assert.strictEqual(fellThrough, !matches, `fall-through for ${JSON.stringify(text)}`);
    });
  }

  test("command NAME stays case-sensitive (/START does not match start)", async () => {
    const bot = newCommandBot("thisbot");
    let fired = false;
    let fellThrough = false;
    bot.command("start", () => {
      fired = true;
    });
    bot.use(() => {
      fellThrough = true;
      return Promise.resolve();
    });
    await bot.handleUpdate(messageUpdate("/START"));
    assert.strictEqual(fired, false);
    assert.strictEqual(fellThrough, true);
  });

  test("the username option yields the same matching (and skips getMe)", async () => {
    // Leading `@` accepted; FETCH_NEVER proves getMe is never called.
    const bot = new Bot("123:ABC", { fetch: FETCH_NEVER, username: "@thisbot" });
    const log: string[] = [];
    bot.command("start", () => {
      log.push("cmd");
    });
    bot.use(() => {
      log.push("fallthrough");
      return Promise.resolve();
    });
    await bot.handleUpdate(messageUpdate("/start@thisbot", 1));
    await bot.handleUpdate(messageUpdate("/start@otherbot", 2));
    assert.deepStrictEqual(log, ["cmd", "fallthrough"]);
    // A name was supplied, not a full User.
    assert.strictEqual(bot.botInfo, undefined);
  });

  test("getMe runs at most once across many updates", async () => {
    const { fetch, counter } = getMeFetch();
    const bot = new Bot("123:ABC", { fetch });
    bot.command("start", () => {});
    await bot.handleUpdate(messageUpdate("/start", 1));
    await bot.handleUpdate(messageUpdate("/start", 2));
    await bot.init();
    assert.strictEqual(counter.calls, 1);
  });

  test("botInfo and ctx.me are populated for a command bot", async () => {
    const bot = newCommandBot("thisbot");
    let seen: User | undefined;
    bot.command("start", (ctx) => {
      seen = ctx.me;
    });
    await bot.handleUpdate(messageUpdate("/start"));
    assert.strictEqual(bot.botInfo?.username, "thisbot");
    assert.strictEqual(seen?.username, "thisbot");
  });

  test("a failed startup getMe reaches catch and retries on the next update", async () => {
    let attempt = 0;
    const fake = (async () => {
      attempt += 1;
      if (attempt === 1) {
        return new Response(JSON.stringify({ ok: false, error_code: 400, description: "boom" }));
      }
      const result = { id: 7, is_bot: true, first_name: "Bot", username: "thisbot" };
      return new Response(JSON.stringify({ ok: true, result }));
    }) as unknown as typeof fetch;
    const bot = new Bot("123:ABC", { fetch: fake });
    const caught: unknown[] = [];
    bot.catch((err) => {
      caught.push(err);
    });
    let fired = 0;
    bot.command("start", () => {
      fired += 1;
    });
    await bot.handleUpdate(messageUpdate("/start", 1));
    await bot.handleUpdate(messageUpdate("/start", 2));
    assert.strictEqual(caught.length, 1);
    assert.strictEqual(fired, 1);
    assert.strictEqual(bot.botInfo?.username, "thisbot");
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
