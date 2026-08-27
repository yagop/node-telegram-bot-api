import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { SQL } from "bun";
import { SqlSessionStorage } from "../../../src/bun/sql-storage.js";

// Bun-only (imports the `bun` module). Tested against a REAL in-memory database
// via Bun SQL's SQLite adapter - exercises the actual queries (safe templates +
// the validated-identifier fragment + ON CONFLICT upsert), no fake, no server.
// Lives in test/unit/bun/ so the Node runner skips it; `bun test` runs it.

const memSql = () => new SQL({ adapter: "sqlite", filename: ":memory:" });

describe("SqlSessionStorage", () => {
  test("round-trips a value and upserts on rewrite", async () => {
    const store = new SqlSessionStorage({ sql: memSql() });
    await store.write("chat:42", { data: { n: 1 }, awaiting: {} });
    assert.deepEqual(await store.read("chat:42"), { data: { n: 1 }, awaiting: {} });

    await store.write("chat:42", { data: { n: 2 }, awaiting: {} }); // ON CONFLICT -> update
    assert.deepEqual((await store.read<{ data: { n: number } }>("chat:42"))?.data, { n: 2 });
  });

  test("read returns undefined for a missing key; delete removes it", async () => {
    const store = new SqlSessionStorage({ sql: memSql() });
    assert.equal(await store.read("absent"), undefined);
    await store.write("k", { data: {}, awaiting: {} });
    await store.delete("k");
    assert.equal(await store.read("k"), undefined);
  });

  test("honors a custom table name", async () => {
    const store = new SqlSessionStorage({ sql: memSql(), table: "bot_sessions" });
    await store.write("k", { data: { ok: true }, awaiting: {} });
    assert.deepEqual((await store.read<{ data: { ok: boolean } }>("k"))?.data, { ok: true });
  });

  test("rejects an unsafe table name", () => {
    assert.throws(() => new SqlSessionStorage({ sql: memSql(), table: "a; DROP TABLE x" }), /invalid table name/);
  });
});
