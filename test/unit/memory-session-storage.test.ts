import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { MemorySessionStorage } from "../../src/core/memory-session-storage.js";

describe("MemorySessionStorage", () => {
  test("round-trips a string and deletes it", () => {
    const store = new MemorySessionStorage();
    assert.equal(store.read("k"), undefined);
    store.write("k", "v1");
    assert.equal(store.read("k"), "v1");

    store.write("k", "v2");
    assert.equal(store.read("k"), "v2");

    store.delete("k");
    assert.equal(store.read("k"), undefined);
  });

  test("expires a value after its TTL", () => {
    const store = new MemorySessionStorage();
    store.write("k", "v", { ttlSeconds: -1 }); // already in the past
    assert.equal(store.read("k"), undefined);
  });
});
