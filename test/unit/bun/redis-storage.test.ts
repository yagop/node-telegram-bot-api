import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { RedisClient } from "bun";
import { RedisSessionStorage } from "../../../src/bun/redis-storage.js";

// Bun-only (imports the `bun` module). A fake client exercises the store's logic
// deterministically, with no live Redis server. Lives in test/unit/bun/ so the
// Node runner skips it; `bun test test/unit` runs it.

/** Minimal in-memory stand-in for the RedisClient methods the store uses. */
function fakeRedis(): RedisClient & { store: Map<string, string>; expires: Map<string, number>; closes: number } {
  const store = new Map<string, string>();
  const expires = new Map<string, number>();
  const client = {
    store,
    expires,
    closes: 0,
    async get(key: string): Promise<string | null> {
      return store.has(key) ? (store.get(key) as string) : null;
    },
    async set(key: string, value: string): Promise<"OK"> {
      store.set(key, value);
      return "OK";
    },
    async del(key: string): Promise<number> {
      return store.delete(key) ? 1 : 0;
    },
    async expire(key: string, seconds: number): Promise<number> {
      expires.set(key, seconds);
      return 1;
    },
    close(): void {
      client.closes += 1;
    },
  };
  return client as unknown as RedisClient & { store: Map<string, string>; expires: Map<string, number>; closes: number };
}

const envelope = JSON.stringify({ v: 1, data: { n: 1 } });

/**
 * A store that takes the `{ url }` (owned) path but whose owned client is `client`.
 * `createClient` is overridden via a closure (not an instance field), so the fake
 * is available during `super()` - a field initializer would run too late.
 */
function ownedStore(client: RedisClient): RedisSessionStorage {
  class Owned extends RedisSessionStorage {
    protected override createClient(): RedisClient {
      return client;
    }
  }
  return new Owned({ url: "redis://fake" });
}

describe("RedisSessionStorage", () => {
  test("prefixes keys and round-trips the encoded string", async () => {
    const client = fakeRedis();
    const store = new RedisSessionStorage({ client });
    await store.write("chat:42", envelope);

    assert.equal(client.store.get("session:chat:42"), envelope); // default prefix applied
    assert.equal(await store.read("chat:42"), envelope);
  });

  test("read returns undefined for a missing key; delete removes it", async () => {
    const client = fakeRedis();
    const store = new RedisSessionStorage({ client, prefix: "s:" });
    assert.equal(await store.read("nope"), undefined);
    await store.write("k", envelope);
    await store.delete("k");
    assert.equal(client.store.has("s:k"), false);
    assert.equal(await store.read("k"), undefined);
  });

  test("applies a TTL on write only when configured", async () => {
    const withTtl = fakeRedis();
    await new RedisSessionStorage({ client: withTtl, ttlSeconds: 3600 }).write("k", envelope);
    assert.equal(withTtl.expires.get("session:k"), 3600);

    const noTtl = fakeRedis();
    await new RedisSessionStorage({ client: noTtl }).write("k", envelope);
    assert.equal(noTtl.expires.has("session:k"), false);
  });

  test("touch re-sets the expiry without rewriting the value", async () => {
    const client = fakeRedis();
    const store = new RedisSessionStorage({ client });
    await store.write("k", envelope);
    await store.touch("k", 120);
    assert.equal(client.expires.get("session:k"), 120);
    assert.equal(client.store.get("session:k"), envelope); // value untouched
  });

  test("a per-write TTL (from the middleware) wins over the store default", async () => {
    const client = fakeRedis();
    await new RedisSessionStorage({ client, ttlSeconds: 3600 }).write("k", envelope, { ttlSeconds: 60 });
    assert.equal(client.expires.get("session:k"), 60);
  });

  test("close() does not close an injected client (the caller owns it) and the store stays usable", async () => {
    const client = fakeRedis();
    const store = new RedisSessionStorage({ client });
    store.close();
    assert.equal(client.closes, 0); // not ours to close
    await store.write("k", envelope); // still usable
    assert.equal(await store.read("k"), envelope);
  });

  test("a url-owned client is closed on close(), idempotently, and reuse throws", async () => {
    const client = fakeRedis();
    const store = ownedStore(client);

    await store.write("k", envelope); // usable while open
    assert.equal(await store.read("k"), envelope);

    store.close();
    assert.equal(client.closes, 1); // owned -> closed
    store.close();
    assert.equal(client.closes, 1); // idempotent, not double-closed

    await assert.rejects(store.read("k"), /was closed/);
    await assert.rejects(store.write("k", envelope), /was closed/);
  });
});
