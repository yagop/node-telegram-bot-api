import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Api } from "../../src/core/api.js";
import { Context } from "../../src/core/context.js";
import { SessionMemoryStorage, session, type SessionStore } from "../../src/core/session.js";
import type { Update } from "../../src/types/index.js";

/** A recording store to assert persistence without a real backend. */
function fakeStore(): SessionStore & { reads: string[]; writes: Array<[string, unknown]> } {
  const map = new Map<string, unknown>();
  const reads: string[] = [];
  const writes: Array<[string, unknown]> = [];
  return {
    reads,
    writes,
    read<V>(key: string): V | undefined {
      reads.push(key);
      return map.get(key) as V | undefined;
    },
    write(key, value) {
      writes.push([key, value]);
      map.set(key, value);
    },
    delete(key) {
      map.delete(key);
    },
  };
}

const api = {} as Api;

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

describe("session()", () => {
  test("keys per chat, defaults to an empty bag, writes back on flush", async () => {
    const store = fakeStore();
    const mw = session({ store });
    const ctx = new Context(msg("hi"), api);

    await mw(ctx, async () => {
      assert.deepEqual(ctx.getSession().data, {});
    });
    assert.deepEqual(store.reads, ["chat:42"]);
    assert.equal(store.writes.length, 1);
    assert.deepEqual(store.writes.at(0), ["chat:42", { data: {}, awaiting: {} }]);
  });

  test("persists mutations across updates on the same key", async () => {
    const store = fakeStore();
    const mw = session<{ n: number }>({ store, initial: () => ({ n: 0 }) });

    const first = new Context(msg("a"), api);
    await mw(first, async () => {
      first.getSession<{ n: number }>().data.n++;
    });

    const second = new Context(msg("b"), api);
    let seen = -1;
    await mw(second, async () => {
      seen = second.getSession<{ n: number }>().data.n;
    });
    assert.equal(seen, 1);
  });

  test("skips updates with no derivable key", async () => {
    const store = fakeStore();
    const mw = session({ store });
    const pollAnswer = { update_id: 2, poll_answer: { poll_id: "x", option_ids: [0] } } as unknown as Update;
    const ctx = new Context(pollAnswer, api);
    let ran = false;
    await mw(ctx, async () => {
      ran = true;
      assert.throws(() => ctx.getSession(), /not installed/);
    });
    assert.equal(ran, true);
    assert.equal(store.reads.length, 0);
    assert.equal(store.writes.length, 0);
  });

  test("flushes even when the handler throws", async () => {
    const store = fakeStore();
    const mw = session({ store });
    const ctx = new Context(msg("boom"), api);
    await assert.rejects(async () => {
      await mw(ctx, async () => {
        ctx.getSession().expectReply(555, { field: "name" });
        throw new Error("downstream");
      });
    });
    assert.equal(store.writes.length, 1);
    assert.deepEqual(store.writes.at(0)?.[1], { data: {}, awaiting: { 555: { field: "name" } } });
  });
});

describe("expectReply / matchReply", () => {
  test("matches a reply to the expected message and consumes the marker", async () => {
    const store = new SessionMemoryStorage();
    const mw = session({ store });

    // Turn 1: register that message 555 awaits a "name".
    const ask = new Context(msg("What's your name?"), api);
    await mw(ask, async () => {
      ask.getSession().expectReply(555, { field: "name" });
    });

    // Turn 2: a reply to 555 arrives.
    const answer = new Context(msg("Ada", 555), api);
    let hit: unknown;
    await mw(answer, async () => {
      hit = answer.getSession().matchReply();
    });
    assert.deepEqual(hit, { field: "name" });

    // Turn 3: the same reply no longer matches (marker consumed).
    const again = new Context(msg("Ada", 555), api);
    let second: unknown = "unset";
    await mw(again, async () => {
      second = again.getSession().matchReply();
    });
    assert.equal(second, undefined);
  });

  test("returns undefined for a non-reply or an unexpected reply", async () => {
    const mw = session({ store: new SessionMemoryStorage() });
    const notReply = new Context(msg("hi"), api);
    await mw(notReply, async () => {
      assert.equal(notReply.getSession().matchReply(), undefined);
    });
    const wrongTarget = new Context(msg("hi", 999), api);
    await mw(wrongTarget, async () => {
      assert.equal(wrongTarget.getSession().matchReply(), undefined);
    });
  });
});
