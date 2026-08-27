import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { RedisClient } from "bun";
import { RedisSessionStorage } from "../../../src/bun/redis-storage.js";

// Bun-only (imports the `bun` module). A fake client exercises the store's logic
// deterministically, with no live Redis server. Lives in test/unit/bun/ so the
// Node runner skips it; `bun test test/unit` runs it.

/** Minimal in-memory stand-in for the RedisClient methods the store uses. */
function fakeRedis(): RedisClient & { store: Map<string, string>; expires: Map<string, number> } {
  const store = new Map<string, string>();
  const expires = new Map<string, number>();
  const client = {
    store,
    expires,
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
  };
  return client as unknown as RedisClient & { store: Map<string, string>; expires: Map<string, number> };
}

describe("RedisSessionStorage", () => {
  test("prefixes keys and round-trips JSON", async () => {
    const client = fakeRedis();
    const store = new RedisSessionStorage({ client });
    await store.write("chat:42", { data: { n: 1 }, awaiting: {} });

    assert.equal(client.store.has("session:chat:42"), true); // default prefix applied
    assert.deepEqual(await store.read("chat:42"), { data: { n: 1 }, awaiting: {} });
  });

  test("read returns undefined for a missing key; delete removes it", async () => {
    const client = fakeRedis();
    const store = new RedisSessionStorage({ client, prefix: "s:" });
    assert.equal(await store.read("nope"), undefined);
    await store.write("k", { data: {}, awaiting: {} });
    await store.delete("k");
    assert.equal(client.store.has("s:k"), false);
    assert.equal(await store.read("k"), undefined);
  });

  test("applies a TTL on write only when configured", async () => {
    const withTtl = fakeRedis();
    await new RedisSessionStorage({ client: withTtl, ttlSeconds: 3600 }).write("k", { data: {}, awaiting: {} });
    assert.equal(withTtl.expires.get("session:k"), 3600);

    const noTtl = fakeRedis();
    await new RedisSessionStorage({ client: noTtl }).write("k", { data: {}, awaiting: {} });
    assert.equal(noTtl.expires.has("session:k"), false);
  });
});
