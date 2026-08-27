import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { SqliteSessionStorage } from "../../../src/bun/sqlite-storage.js";

// Bun-only (bun:sqlite). Lives in test/unit/bun/ so the Node runner's
// non-recursive `test/unit/*.test.ts` glob skips it; `bun test test/unit` runs it.

describe("SqliteSessionStorage", () => {
  test("round-trips a value and upserts on rewrite", () => {
    const store = new SqliteSessionStorage(); // :memory:
    store.write("chat:42", { data: { n: 1 }, awaiting: {} });
    assert.deepEqual(store.read("chat:42"), { data: { n: 1 }, awaiting: {} });

    store.write("chat:42", { data: { n: 2 }, awaiting: {} }); // ON CONFLICT -> update
    assert.deepEqual(store.read<{ data: { n: number } }>("chat:42")?.data, { n: 2 });
  });

  test("read returns undefined for a missing key; delete removes it", () => {
    const store = new SqliteSessionStorage();
    assert.equal(store.read("chat:absent"), undefined);
    store.write("chat:1", { data: {}, awaiting: {} });
    store.delete("chat:1");
    assert.equal(store.read("chat:1"), undefined);
    store.delete("chat:1"); // absent -> no throw
  });

  test("rejects an unsafe table name", () => {
    assert.throws(() => new SqliteSessionStorage({ table: "a; DROP TABLE x" }), /invalid table name/);
  });

  test("persists across instances sharing one Database", async () => {
    const { Database } = await import("bun:sqlite");
    const db = new Database(":memory:");
    new SqliteSessionStorage({ database: db }).write("chat:7", { data: { seen: true }, awaiting: {} });
    // A second store over the same handle sees the row.
    const reopened = new SqliteSessionStorage({ database: db });
    assert.deepEqual(reopened.read<{ data: { seen: boolean } }>("chat:7")?.data, { seen: true });
  });
});
