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

  test("touch refreshes an existing expiry and ignores a missing key", () => {
    const store = new MemorySessionStorage();
    store.write("k", "v", { ttlSeconds: -1 }); // already expired...
    store.touch("k", 60); // ...but touched back to life before any read
    assert.equal(store.read("k"), "v");

    store.touch("absent", 60); // must not throw or create anything
    assert.equal(store.read("absent"), undefined);
  });

  test("a later TTL write sweeps keys that expired and were never read again", () => {
    const store = new MemorySessionStorage();
    store.write("abandoned", "v", { ttlSeconds: -1 });
    store.write("other", "v", { ttlSeconds: 60 }); // sweeps on the way in
    // Nothing reads "abandoned", so only the sweep can have dropped it.
    assert.equal(store.read("abandoned"), undefined);
    assert.equal(store.read("other"), "v");
  });
});
