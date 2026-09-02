import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { SqliteSessionStorage } from "../../../src/bun/sqlite-storage.js";

// Bun-only (bun:sqlite). Lives in test/unit/bun/ so the Node runner's
// non-recursive `test/unit/*.test.ts` glob skips it; `bun test test/unit` runs it.

describe("SqliteSessionStorage", () => {
  test("round-trips a value and upserts on rewrite", () => {
    const store = new SqliteSessionStorage(); // :memory:
    store.write("chat:42", "v1");
    assert.equal(store.read("chat:42"), "v1");

    store.write("chat:42", "v2"); // ON CONFLICT -> update
    assert.equal(store.read("chat:42"), "v2");
  });

  test("read returns undefined for a missing key; delete removes it", () => {
    const store = new SqliteSessionStorage();
    assert.equal(store.read("chat:absent"), undefined);
    store.write("chat:1", "v");
    store.delete("chat:1");
    assert.equal(store.read("chat:1"), undefined);
    store.delete("chat:1"); // absent -> no throw
  });

  test("tracks created_at / updated_at columns for operational queries", async () => {
    const { Database } = await import("bun:sqlite");
    const db = new Database(":memory:");
    const store = new SqliteSessionStorage({ database: db });
    store.write("k", "v1");
    const inserted = db.query(`SELECT created_at, updated_at FROM "sessions" WHERE key = ?`).get("k") as {
      created_at: string;
      updated_at: string;
    };
    assert.match(inserted.created_at, /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(inserted.updated_at, inserted.created_at);

    await new Promise((resolve) => setTimeout(resolve, 2));
    store.write("k", "v2"); // upsert: created_at frozen, updated_at bumped
    const updated = db.query(`SELECT created_at, updated_at FROM "sessions" WHERE key = ?`).get("k") as {
      created_at: string;
      updated_at: string;
    };
    assert.equal(updated.created_at, inserted.created_at);
    assert.ok(updated.updated_at > inserted.updated_at, "updated_at must move forward");
  });

  test("a closed store that owned its database refuses further use", () => {
    const store = new SqliteSessionStorage(); // owns its :memory: database
    store.write("k", "v");
    store.close();
    assert.throws(() => store.read("k"), /was closed/);
    assert.throws(() => store.write("k", "v"), /was closed/);
  });

  test("reports a foreign table whose value column does not hold TEXT", async () => {
    const { Database } = await import("bun:sqlite");
    const db = new Database(":memory:");
    // SQLite is dynamically typed: a foreign writer can put a number in there.
    db.run(`CREATE TABLE "sessions" (key TEXT PRIMARY KEY, value BLOB NOT NULL,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`);
    db.run(`INSERT INTO "sessions" (key, value, created_at, updated_at) VALUES ('k', 42, 'now', 'now')`);

    const store = new SqliteSessionStorage({ database: db });
    assert.throws(() => store.read("k"), /sessions\.value must be TEXT/);
  });

  test("rejects an unsafe table name", () => {
    assert.throws(() => new SqliteSessionStorage({ table: "a; DROP TABLE x" }), /invalid table name/);
  });

  test("persists across instances sharing one Database; close leaves it open", async () => {
    const { Database } = await import("bun:sqlite");
    const db = new Database(":memory:");
    const first = new SqliteSessionStorage({ database: db });
    first.write("chat:7", "seen");
    // A second store over the same handle sees the row.
    const reopened = new SqliteSessionStorage({ database: db });
    assert.equal(reopened.read("chat:7"), "seen");

    // The handle is the caller's, so closing a store must not close it.
    first.close();
    assert.equal(reopened.read("chat:7"), "seen");
  });
});
