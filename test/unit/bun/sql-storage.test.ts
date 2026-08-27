import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { SQL } from "bun";
import { SqlSessionStorage } from "../../../src/bun/sql-storage.js";

// Bun-only (imports the `bun` module). A fake SQL client backed by a Map
// exercises the store's logic deterministically, with no live Postgres. Lives in
// test/unit/bun/ so the Node runner skips it; `bun test test/unit` runs it.

/** Minimal fake of `sql.unsafe`, dispatching on the leading SQL keyword. */
function fakeSql(): SQL & { rows: Map<string, string>; created: string[] } {
  const rows = new Map<string, string>();
  const created: string[] = [];
  async function unsafe(query: string, values: unknown[] = []): Promise<unknown> {
    const verb = query.trimStart().split(/\s+/, 1)[0]?.toUpperCase();
    const params = values as string[];
    if (verb === "CREATE") {
      created.push(query);
      return [];
    }
    if (verb === "INSERT") {
      rows.set(params[0]!, params[1]!); // upsert: VALUES ($1, $2) ON CONFLICT ... DO UPDATE
      return [];
    }
    if (verb === "SELECT") {
      return rows.has(params[0]!) ? [{ value: rows.get(params[0]!) }] : [];
    }
    if (verb === "DELETE") {
      rows.delete(params[0]!);
      return [];
    }
    throw new Error(`unexpected query: ${query}`);
  }
  return { rows, created, unsafe } as unknown as SQL & { rows: Map<string, string>; created: string[] };
}

describe("SqlSessionStorage", () => {
  test("creates the table once (lazily) and round-trips a value", async () => {
    const sql = fakeSql();
    const store = new SqlSessionStorage({ sql });

    await store.write("chat:42", { data: { n: 1 }, awaiting: {} });
    await store.write("chat:42", { data: { n: 2 }, awaiting: {} }); // upsert
    assert.equal(sql.created.length, 1); // CREATE TABLE ran exactly once
    assert.deepEqual(await store.read<{ data: { n: number } }>("chat:42"), { data: { n: 2 }, awaiting: {} });
  });

  test("read returns undefined for a missing key; delete removes it", async () => {
    const sql = fakeSql();
    const store = new SqlSessionStorage({ sql });
    assert.equal(await store.read("absent"), undefined);
    await store.write("k", { data: {}, awaiting: {} });
    await store.delete("k");
    assert.equal(await store.read("k"), undefined);
  });

  test("uses the configured table name and rejects an unsafe one", async () => {
    const sql = fakeSql();
    await new SqlSessionStorage({ sql, table: "bot_sessions" }).write("k", { data: {}, awaiting: {} });
    assert.match(sql.created[0]!, /CREATE TABLE IF NOT EXISTS bot_sessions/);
    assert.throws(() => new SqlSessionStorage({ sql, table: "a; DROP TABLE x" }), /invalid table name/);
  });
});
