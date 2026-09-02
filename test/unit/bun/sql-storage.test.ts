import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { SQL } from "bun";
import { SqlSessionStorage } from "../../../src/bun/sql-storage.js";

// Bun-only (imports the `bun` module). Tested against a REAL in-memory database
// via Bun SQL's SQLite adapter - exercises the actual queries (safe templates +
// the validated-identifier fragment + the ON CONFLICT upsert), no fake, no
// server. Lives in test/unit/bun/ so the Node runner skips it.

const memSql = () => new SQL({ adapter: "sqlite", filename: ":memory:" });

describe("SqlSessionStorage", () => {
  test("round-trips a value and upserts on rewrite", async () => {
    const store = new SqlSessionStorage({ sql: memSql() });
    await store.write("chat:42", "v1");
    assert.equal(await store.read("chat:42"), "v1");

    await store.write("chat:42", "v2"); // ON CONFLICT -> update
    assert.equal(await store.read("chat:42"), "v2");
  });

  test("read returns undefined for a missing key; delete removes it", async () => {
    const store = new SqlSessionStorage({ sql: memSql() });
    assert.equal(await store.read("absent"), undefined);
    await store.write("k", "v");
    await store.delete("k");
    assert.equal(await store.read("k"), undefined);
  });

  test("tracks created_at / updated_at columns for operational queries", async () => {
    const sql = memSql();
    const store = new SqlSessionStorage({ sql });
    await store.write("k", "v1");
    const [inserted] = (await sql`SELECT created_at, updated_at FROM sessions WHERE key = ${"k"}`) as Array<{
      created_at: string;
      updated_at: string;
    }>;
    assert.match(inserted?.created_at ?? "", /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(inserted?.updated_at, inserted?.created_at);

    await new Promise((resolve) => setTimeout(resolve, 2));
    await store.write("k", "v2"); // the upsert stamps updated_at
    const [updated] = (await sql`SELECT created_at, updated_at FROM sessions WHERE key = ${"k"}`) as Array<{
      created_at: string;
      updated_at: string;
    }>;
    assert.equal(updated?.created_at, inserted?.created_at, "created_at is never touched again");
    assert.ok((updated?.updated_at ?? "") > (inserted?.updated_at ?? ""), "updated_at must move forward");
  });

  test("honors a custom table name", async () => {
    const store = new SqlSessionStorage({ sql: memSql(), table: "bot_sessions" });
    await store.write("k", "v");
    assert.equal(await store.read("k"), "v");
  });

  test("rejects an unsafe table name", () => {
    assert.throws(() => new SqlSessionStorage({ sql: memSql(), table: "a; DROP TABLE x" }), /invalid table name/);
  });

  test("dispose leaves a caller-supplied client open", async () => {
    const sql = memSql();
    const store = new SqlSessionStorage({ sql });
    await store.write("k", "v");
    await store.dispose();
    assert.equal(await store.read("k"), "v");
  });
});
