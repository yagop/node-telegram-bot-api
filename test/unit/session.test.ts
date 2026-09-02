import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Api } from "../../src/core/api.js";
import { Bot } from "../../src/core/bot.js";
import { Context } from "../../src/core/context.js";
import { expectReply, forgetReply, matchReply, taggedReplies } from "../../src/core/reply-tracking.js";
import { MemorySessionStorage } from "../../src/core/memory-session-storage.js";
import { createSession, session, type SessionStore } from "../../src/core/session.js";
import type { Update } from "../../src/types/index.js";

/** A recording store to assert persistence without a real backend. */
function fakeStore(): SessionStore & { reads: string[]; writes: Array<[string, string]>; deletes: string[] } {
  const map = new Map<string, string>();
  const reads: string[] = [];
  const writes: Array<[string, string]> = [];
  const deletes: string[] = [];
  return {
    reads,
    writes,
    deletes,
    read(key: string): string | undefined {
      reads.push(key);
      return map.get(key);
    },
    write(key: string, value: string): void {
      writes.push([key, value]);
      map.set(key, value);
    },
    delete(key: string): void {
      deletes.push(key);
      map.delete(key);
    },
  };
}

const api = {} as Api;

/** A frozen clock, so envelope timestamps are byte-comparable in assertions. */
const AT = "2030-01-01T00:00:00.000Z";
const now = (): number => Date.parse(AT);

/** The exact string the middleware persists for `{ data, ext? }` at `AT`. */
function encoded(rest: { data: unknown; ext?: unknown }): string {
  return JSON.stringify({ v: 1, ...rest, createdAt: AT, updatedAt: AT });
}

/** A message update, optionally a reply to `replyTo`, in a fixed chat. */
function msg(text: string, replyTo?: number): Update {
  return {
    update_id: 1,
    message: {
      message_id: 100,
      date: 0,
      chat: { id: 42, type: "private" },
      from: { id: 7, is_bot: false, first_name: "Ada" },
      text,
      ...(replyTo !== undefined ? { reply_to_message: { message_id: replyTo } } : {}),
    },
  } as unknown as Update;
}

describe("createSession()", () => {
  test("keys per chat and exposes a typed handle through .get(ctx)", async () => {
    const store = fakeStore();
    const mw = createSession<{ n: number }>({ store, initial: () => ({ n: 0 }), now });
    const ctx = new Context(msg("hi"), api);

    await mw(ctx, async () => {
      mw.get(ctx).data.n += 1;
    });
    assert.deepEqual(store.reads, ["chat:42"]);
    assert.deepEqual(store.writes, [["chat:42", encoded({ data: { n: 1 } })]]);
  });

  test("skips the write when nothing changed", async () => {
    const store = fakeStore();
    const mw = createSession<{ n: number }>({ store, initial: () => ({ n: 0 }) });

    await mw(new Context(msg("a"), api), async () => {});
    assert.equal(store.writes.length, 0); // fresh, untouched session -> no row created

    const ctx = new Context(msg("b"), api);
    await mw(ctx, async () => {
      mw.get(ctx).data.n = 1;
    });
    assert.equal(store.writes.length, 1);

    const again = new Context(msg("c"), api);
    await mw(again, async () => {
      mw.get(again).data.n = 1; // same value -> byte-identical envelope
    });
    assert.equal(store.writes.length, 1, "an unchanged envelope must not be rewritten");
  });

  test("stores strings, so a store never sees (or shares) a live object", async () => {
    const store = fakeStore();
    const mw = createSession<{ when: unknown }>({ store, initial: () => ({ when: null as unknown }) });

    const first = new Context(msg("a"), api);
    await mw(first, async () => {
      mw.get(first).data.when = new Date(0);
    });

    const second = new Context(msg("b"), api);
    let seen: unknown;
    await mw(second, async () => {
      seen = mw.get(second).data.when;
    });
    // Memory behaves exactly like a durable backend: JSON round-trip, not a live ref.
    assert.equal(seen, "1970-01-01T00:00:00.000Z");
  });

  test("persists mutations across updates on the same key", async () => {
    const mw = createSession<{ n: number }>({ store: new MemorySessionStorage(), initial: () => ({ n: 0 }) });

    const first = new Context(msg("a"), api);
    await mw(first, async () => {
      mw.get(first).data.n++;
    });

    const second = new Context(msg("b"), api);
    let seen = -1;
    await mw(second, async () => {
      seen = mw.get(second).data.n;
    });
    assert.equal(seen, 1);
  });

  test("starts fresh when the stored value is not a well-formed envelope", async () => {
    const store = fakeStore();
    store.write("chat:42", JSON.stringify("not-an-envelope"));
    store.writes.length = 0;
    const mw = createSession<{ n: number }>({ store, initial: () => ({ n: 7 }), now });
    const ctx = new Context(msg("hi"), api);
    await mw(ctx, async () => {
      assert.equal(mw.get(ctx).data.n, 7);
      mw.get(ctx).data.n = 8;
    });
    assert.deepEqual(store.writes.at(-1), ["chat:42", encoded({ data: { n: 8 } })]);
  });

  test("ignores a malformed ext namespace instead of throwing", async () => {
    const store = fakeStore();
    store.write("chat:42", JSON.stringify({ v: 1, data: { n: 1 }, ext: { reply: "corrupt" }, createdAt: AT, updatedAt: AT }));
    const mw = createSession<{ n: number }>({ store, now });
    const ctx = new Context(msg("hi"), api);
    await mw(ctx, async () => {
      assert.equal(mw.get(ctx).data.n, 1); // data preserved
      expectReply(ctx, 9, { ok: true }); // would throw on `"corrupt"[9] = ...`
    });
    assert.deepEqual(store.writes.at(-1), [
      "chat:42",
      encoded({ data: { n: 1 }, ext: { reply: { awaiting: { 9: { ok: true } } } } }),
    ]);
  });

  test("replaces an ext slot that fails its validity check", async () => {
    const store = fakeStore();
    // A plain object, but not a well-formed reply table (no `awaiting`).
    store.write("chat:42", JSON.stringify({ v: 1, data: {}, ext: { reply: {} }, createdAt: AT, updatedAt: AT }));
    const mw = createSession({ store, now });
    const ctx = new Context(msg("hi"), api);
    await mw(ctx, async () => {
      expectReply(ctx, 7, { ok: true }); // would throw on `undefined[7] = ...`
    });
    assert.deepEqual(store.writes.at(-1), [
      "chat:42",
      encoded({ data: {}, ext: { reply: { awaiting: { 7: { ok: true } } } } }),
    ]);
  });

  test("throws on a corrupt encoding rather than silently resetting", async () => {
    const store = fakeStore();
    store.write("chat:42", "{not json");
    const mw = createSession({ store });
    await assert.rejects(async () => {
      await mw(new Context(msg("hi"), api), async () => {});
    });
  });

  test("skips updates with no derivable key", async () => {
    const store = fakeStore();
    const mw = createSession({ store });
    const pollAnswer = { update_id: 2, poll_answer: { poll_id: "x", option_ids: [0] } } as unknown as Update;
    const ctx = new Context(pollAnswer, api);
    let ran = false;
    await mw(ctx, async () => {
      ran = true;
      assert.equal(mw.find(ctx), undefined);
      assert.throws(() => mw.get(ctx), /did not run/);
    });
    assert.equal(ran, true);
    assert.equal(store.reads.length, 0);
    assert.equal(store.writes.length, 0);
  });

  test("flushes even when the handler throws", async () => {
    const store = fakeStore();
    const mw = createSession<{ n: number }>({ store, initial: () => ({ n: 0 }), now });
    const ctx = new Context(msg("boom"), api);
    await assert.rejects(async () => {
      await mw(ctx, async () => {
        mw.get(ctx).data.n = 5;
        throw new Error("downstream");
      });
    });
    assert.deepEqual(store.writes, [["chat:42", encoded({ data: { n: 5 } })]]);
  });

  test("handle.delete() evicts the key", async () => {
    const store = fakeStore();
    const mw = createSession<{ n: number }>({ store, initial: () => ({ n: 0 }) });

    const first = new Context(msg("a"), api);
    await mw(first, async () => {
      mw.get(first).data.n = 3;
    });

    const second = new Context(msg("b"), api);
    await mw(second, async () => {
      mw.get(second).delete();
    });
    assert.deepEqual(store.deletes, ["chat:42"]);
    assert.equal(store.writes.length, 1, "a dropped session must not be written back");

    const third = new Context(msg("c"), api);
    let seen = -1;
    await mw(third, async () => {
      seen = mw.get(third).data.n;
    });
    assert.equal(seen, 0); // back to initial
  });

  test("stamps createdAt once and bumps updatedAt on each persisted write", async () => {
    const store = fakeStore();
    let clock = Date.parse("2030-01-01T00:00:00.000Z");
    const mw = createSession<{ n: number }>({ store, initial: () => ({ n: 0 }), now: () => clock });

    const first = new Context(msg("a"), api);
    await mw(first, async () => {
      assert.deepEqual(mw.get(first).createdAt, new Date(clock)); // never written -> now
      mw.get(first).data.n = 1;
    });

    clock += 60_000;
    const second = new Context(msg("b"), api);
    await mw(second, async () => {
      const handle = mw.get(second);
      assert.equal(handle.createdAt.toISOString(), "2030-01-01T00:00:00.000Z", "createdAt is carried through");
      assert.equal(handle.updatedAt.toISOString(), "2030-01-01T00:00:00.000Z", "as loaded: the previous write");
      handle.data.n = 2;
    });

    const stored = JSON.parse(store.writes.at(-1)?.[1] as string) as { createdAt: string; updatedAt: string };
    assert.equal(stored.createdAt, "2030-01-01T00:00:00.000Z");
    assert.equal(stored.updatedAt, "2030-01-01T00:01:00.000Z");
  });

  test("a skipped flush leaves updatedAt alone", async () => {
    const store = fakeStore();
    let clock = Date.parse("2030-01-01T00:00:00.000Z");
    const mw = createSession<{ n: number }>({ store, initial: () => ({ n: 0 }), now: () => clock });

    const first = new Context(msg("a"), api);
    await mw(first, async () => {
      mw.get(first).data.n = 1;
    });

    clock += 60_000;
    const second = new Context(msg("b"), api); // reads, changes nothing
    await mw(second, async () => {});

    assert.equal(store.writes.length, 1, "an untouched session must not be rewritten");
    const stored = JSON.parse(store.writes.at(-1)?.[1] as string) as { updatedAt: string };
    assert.equal(stored.updatedAt, "2030-01-01T00:00:00.000Z");
  });

  test("adopts timestamps for a record written before they existed", async () => {
    const store = fakeStore();
    store.write("chat:42", JSON.stringify({ v: 1, data: { n: 1 } })); // legacy shape
    const mw = createSession<{ n: number }>({ store, now });
    const ctx = new Context(msg("hi"), api);
    await mw(ctx, async () => {
      const handle = mw.get(ctx);
      assert.equal(handle.data.n, 1); // data preserved
      assert.equal(handle.createdAt.toISOString(), AT); // first sighting, not an invented past
      assert.equal(handle.updatedAt.toISOString(), AT);
    });
  });

  test("`session` is an alias of `createSession`", () => {
    assert.equal(session, createSession);
  });
});

describe("session TTL", () => {
  test("refreshes the expiry when a read-only update skips the write", async () => {
    const touches: Array<[string, number]> = [];
    const base = fakeStore();
    const store: SessionStore = { ...base, touch: (key, ttlSeconds) => void touches.push([key, ttlSeconds]) };
    const mw = createSession<{ n: number }>({ store, initial: () => ({ n: 0 }), ttlSeconds: 60 });

    const first = new Context(msg("a"), api);
    await mw(first, async () => {
      mw.get(first).data.n = 1;
    });
    assert.equal(base.writes.length, 1);
    assert.deepEqual(touches, [], "the write itself carries the TTL");

    const second = new Context(msg("b"), api); // reads, changes nothing
    await mw(second, async () => {});
    assert.equal(base.writes.length, 1, "still no rewrite");
    assert.deepEqual(touches, [["chat:42", 60]], "but the TTL must not lapse");
  });

  test("does not touch a session that was never stored, or when no TTL is set", async () => {
    const touches: string[] = [];
    const base = fakeStore();
    const store: SessionStore = { ...base, touch: (key) => void touches.push(key) };

    const withTtl = createSession({ store, ttlSeconds: 60 });
    await withTtl(new Context(msg("a"), api), async () => {}); // nothing stored yet
    assert.deepEqual(touches, []);

    const noTtl = createSession<{ n: number }>({ store, initial: () => ({ n: 0 }) });
    const ctx = new Context(msg("b"), api);
    await noTtl(ctx, async () => {
      noTtl.get(ctx).data.n = 1;
    });
    await noTtl(new Context(msg("c"), api), async () => {});
    assert.deepEqual(touches, []);
  });

  test("a store without touch is left alone", async () => {
    const store = fakeStore();
    assert.equal("touch" in store, false);
    const mw = createSession<{ n: number }>({ store, initial: () => ({ n: 0 }), ttlSeconds: 60 });
    const first = new Context(msg("a"), api);
    await mw(first, async () => {
      mw.get(first).data.n = 1;
    });
    await mw(new Context(msg("b"), api), async () => {}); // must not throw
    assert.equal(store.writes.length, 1);
  });
});

describe("ctx.getSession", () => {
  test("reads and writes the bag through the handle", async () => {
    const store = fakeStore();
    const mw = createSession<{ n: number }>({ store, initial: () => ({ n: 0 }), now });

    const first = new Context(msg("a"), api);
    await mw(first, async () => {
      const handle = first.getSession<{ n: number }>();
      assert.equal(handle.data.n, 0);
      handle.data.n += 1;
    });
    assert.deepEqual(store.writes.at(-1), ["chat:42", encoded({ data: { n: 1 } })]);

    // Reassigning `data` replaces the whole bag.
    const second = new Context(msg("b"), api);
    await mw(second, async () => {
      second.getSession<{ n: number }>().data = { n: 42 };
    });
    assert.deepEqual(store.writes.at(-1), ["chat:42", encoded({ data: { n: 42 } })]);
  });

  test("throws when no session was installed for this update", () => {
    const ctx = new Context(msg("hi"), api);
    assert.throws(() => ctx.getSession(), /no session for this update/);
  });

  test("the middleware's own .get(ctx) returns the same handle", async () => {
    const mw = createSession<{ n: number }>({ store: new MemorySessionStorage() });
    const ctx = new Context(msg("hi"), api);
    await mw(ctx, async () => {
      assert.equal(mw.get(ctx), ctx.getSession<{ n: number }>());
    });
  });
});

describe("session concurrency", () => {
  test("serializes concurrent updates for the same key (no lost update)", async () => {
    const store = new MemorySessionStorage();
    const mw = createSession<{ n: number }>({ store, initial: () => ({ n: 0 }) });

    // Both handlers read, yield, then increment - the classic interleaving that
    // loses one increment without a per-key lock.
    const run = async (): Promise<void> => {
      const ctx = new Context(msg("x"), api);
      await mw(ctx, async () => {
        const handle = mw.get(ctx);
        await Promise.resolve();
        handle.data.n += 1;
      });
    };
    await Promise.all([run(), run(), run()]);

    const ctx = new Context(msg("read"), api);
    let seen = -1;
    await mw(ctx, async () => {
      seen = mw.get(ctx).data.n;
    });
    assert.equal(seen, 3);
  });

  test("different keys are not serialized against each other", async () => {
    const mw = createSession({ store: new MemorySessionStorage(), getSessionKey: (ctx) => ctx.message?.text });
    let inFlight = 0;
    let maxInFlight = 0;
    const run = async (key: string): Promise<void> => {
      const ctx = new Context(msg(key), api);
      await mw(ctx, async () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await Promise.resolve();
        inFlight -= 1;
      });
    };
    await Promise.all([run("a"), run("b")]);
    assert.equal(maxInFlight, 2);
  });
});

describe("session lifecycle", () => {
  test("bot.init() runs store setup once and bot.close() tears it down", async () => {
    let inits = 0;
    let closes = 0;
    const store: SessionStore = {
      ...fakeStore(),
      init: () => {
        inits += 1;
      },
      close: () => {
        closes += 1;
      },
    };
    const mw = createSession({ store });
    const bot = new Bot("123:abc");
    bot.use(mw);

    await bot.init();
    await bot.init();
    assert.equal(inits, 1, "init is memoized");

    await bot.handleUpdate(msg("hi"));
    assert.equal(inits, 1, "handleUpdate must not re-run setup");

    await bot.close();
    assert.equal(closes, 1);
  });

  test("a failing store surfaces at bot.init() and is retried, not cached", async () => {
    let attempts = 0;
    const store: SessionStore = {
      ...fakeStore(),
      init: () => {
        attempts += 1;
        if (attempts === 1) throw new Error("init boom");
      },
    };
    const bot = new Bot("123:abc").use(createSession({ store }));
    await assert.rejects(bot.init(), /init boom/);
    await bot.init(); // retried, now succeeds
    assert.equal(attempts, 2);
  });

  test("close drops the setup memo, so a later init re-runs store setup", async () => {
    let inits = 0;
    let closes = 0;
    const store: SessionStore = {
      ...fakeStore(),
      init: () => {
        inits += 1;
      },
      close: () => {
        closes += 1;
      },
    };
    const bot = new Bot("123:abc").use(createSession({ store }));

    await bot.init();
    await bot.close();
    await bot.init(); // a second run() in one process must not reuse a closed store
    assert.equal(inits, 2);
    assert.equal(closes, 1);
  });

  test("bot.close clears the memo only after teardown has finished", async () => {
    const order: string[] = [];
    let released!: () => void;
    const gate = new Promise<void>((resolve) => {
      released = resolve;
    });
    const store: SessionStore = {
      ...fakeStore(),
      init: () => {
        order.push("init");
      },
      close: async () => {
        order.push("close:start");
        await gate;
        order.push("close:end");
      },
    };
    const bot = new Bot("123:abc").use(createSession({ store }));
    await bot.init();

    const closing = bot.close();
    // An update landing mid-shutdown must not re-run setup behind close's back.
    const midShutdown = bot.handleUpdate(msg("hi"));
    released();
    await closing;
    await midShutdown;
    assert.deepEqual(order, ["init", "close:start", "close:end"]);
  });

  test("a failing close does not strand the other teardowns, and still clears the memo", async () => {
    const closed: string[] = [];
    let inits = 0;
    const plugin = (name: string, fail = false): SessionStore => ({
      ...fakeStore(),
      init: () => {
        inits += 1;
      },
      close: () => {
        closed.push(name);
        if (fail) throw new Error(`${name} boom`);
      },
    });
    const bot = new Bot("123:abc")
      .use(createSession({ store: plugin("first") }))
      .use(createSession({ store: plugin("second", true) }))
      .use(createSession({ store: plugin("third") }));

    await bot.init();
    assert.equal(inits, 3);

    // Reverse order, and the throw in the middle must not skip "first".
    await assert.rejects(bot.close(), /second boom/);
    assert.deepEqual(closed, ["third", "second", "first"]);

    // The memo was cleared despite the failure, so setup can run again.
    await bot.init();
    assert.equal(inits, 6);
  });

  test("several failing closes surface as an AggregateError", async () => {
    const boom = (name: string): SessionStore => ({
      ...fakeStore(),
      close: () => {
        throw new Error(`${name} boom`);
      },
    });
    const bot = new Bot("123:abc").use(createSession({ store: boom("a") })).use(createSession({ store: boom("b") }));

    await assert.rejects(bot.close(), (err: unknown) => {
      assert.ok(err instanceof AggregateError);
      assert.equal(err.errors.length, 2);
      assert.deepEqual(
        err.errors.map((e: unknown) => (e as Error).message),
        ["b boom", "a boom"],
      );
      return true;
    });
  });

  test("a store-init failure reaches the bot.catch boundary", async () => {
    const store: SessionStore = { ...fakeStore(), init: () => Promise.reject(new Error("init boom")) };
    const seen: unknown[] = [];
    const bot = new Bot("123:abc")
      .use(createSession({ store }))
      .catch((err) => {
        seen.push(err);
      });

    await bot.handleUpdate(msg("hi")); // consumed by the boundary, not thrown
    assert.equal(seen.length, 1);
    assert.match((seen[0] as Error).message, /init boom/);
  });

  test("the routing helpers pick up middleware lifecycle too", async () => {
    let inits = 0;
    const store: SessionStore = {
      ...fakeStore(),
      init: () => {
        inits += 1;
      },
    };
    const bot = new Bot("123:abc");
    bot.on("message", createSession({ store })); // not bot.use()
    await bot.init();
    assert.equal(inits, 1);
  });

  test("a store without init/close works unchanged", async () => {
    const store = fakeStore();
    assert.equal("init" in store, false);
    const mw = createSession({ store });
    const ctx = new Context(msg("hi"), api);
    let ran = false;
    await mw(ctx, async () => {
      ran = true;
      mw.get(ctx);
    });
    assert.equal(ran, true);
  });
});

describe("reply tracking", () => {
  test("matches a reply to the expected message and consumes the marker", async () => {
    const mw = createSession({ store: new MemorySessionStorage() });

    // Turn 1: register that message 555 awaits a "name".
    const ask = new Context(msg("What's your name?"), api);
    await mw(ask, async () => {
      expectReply(ask, 555, { field: "name" });
    });

    // Turn 2: a reply to 555 arrives.
    const answer = new Context(msg("Ada", 555), api);
    let hit: unknown;
    await mw(answer, async () => {
      hit = matchReply<{ field: string }>(answer);
    });
    assert.deepEqual(hit, { field: "name" });

    // Turn 3: the same reply no longer matches (marker consumed).
    const again = new Context(msg("Ada", 555), api);
    let second: unknown = "unset";
    await mw(again, async () => {
      second = matchReply(again);
    });
    assert.equal(second, undefined);
  });

  test("returns undefined for a non-reply or an unexpected reply", async () => {
    const mw = createSession({ store: new MemorySessionStorage() });
    const notReply = new Context(msg("hi"), api);
    await mw(notReply, async () => {
      assert.equal(matchReply(notReply), undefined);
    });
    const wrongTarget = new Context(msg("hi", 999), api);
    await mw(wrongTarget, async () => {
      assert.equal(matchReply(wrongTarget), undefined);
    });
  });

  test("forgetReply drops a pending expectation", async () => {
    const mw = createSession({ store: new MemorySessionStorage() });

    const ask = new Context(msg("?"), api);
    await mw(ask, async () => {
      expectReply(ask, 555);
      forgetReply(ask, 555);
    });

    const answer = new Context(msg("Ada", 555), api);
    await mw(answer, async () => {
      assert.equal(matchReply(answer), undefined);
    });
  });

  test("stores nothing in the envelope until a reply is expected", async () => {
    const store = fakeStore();
    const mw = createSession<{ n: number }>({ store, initial: () => ({ n: 0 }), now });
    const ctx = new Context(msg("hi"), api);
    await mw(ctx, async () => {
      mw.get(ctx).data.n = 1;
    });
    assert.deepEqual(store.writes.at(-1)?.[1], encoded({ data: { n: 1 } }));
  });
});

describe("taggedReplies", () => {
  test("boxes a string tag on expect and unboxes it on match", async () => {
    const mw = createSession({ store: new MemorySessionStorage() });

    const ask = new Context(msg("Your email?"), api);
    await mw(ask, async () => {
      taggedReplies<"NAME" | "EMAIL">(ask).expect(555, "EMAIL");
    });

    const answer = new Context(msg("a@b.c", 555), api);
    let tag: string | undefined = "unset";
    await mw(answer, async () => {
      tag = taggedReplies<"NAME" | "EMAIL">(answer).match();
    });
    assert.equal(tag, "EMAIL");

    const again = new Context(msg("a@b.c", 555), api);
    await mw(again, async () => {
      assert.equal(taggedReplies<"NAME" | "EMAIL">(again).match(), undefined);
    });
  });

  test("match returns undefined for a non-reply", async () => {
    const mw = createSession({ store: new MemorySessionStorage() });
    const ctx = new Context(msg("hi"), api);
    await mw(ctx, async () => {
      assert.equal(taggedReplies<"X">(ctx).match(), undefined);
    });
  });
});
