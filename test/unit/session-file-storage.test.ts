import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileSessionStorage } from "../../src/node/session-file-storage.js";

async function withDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "ntba-session-"));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
}

describe("FileSessionStorage", () => {
  test("round-trips a value and survives a fresh instance (durable)", async () => {
    await withDir(async (dir) => {
      const a = new FileSessionStorage({ path: join(dir, "sessions") });
      const value = { data: { n: 3 }, awaiting: { 555: { field: "name" } } };
      await a.write("chat:42", value);

      // A brand-new instance (i.e. after a restart) reads it back.
      const b = new FileSessionStorage({ path: join(dir, "sessions") });
      assert.deepEqual(await b.read("chat:42"), value);
    });
  });

  test("read returns undefined for a missing key", async () => {
    await withDir(async (dir) => {
      const store = new FileSessionStorage({ path: dir });
      assert.equal(await store.read("chat:absent"), undefined);
    });
  });

  test("delete removes the key and is a no-op when absent", async () => {
    await withDir(async (dir) => {
      const store = new FileSessionStorage({ path: dir });
      await store.write("chat:1", { data: { n: 1 }, awaiting: {} });
      await store.delete("chat:1");
      assert.equal(await store.read("chat:1"), undefined);
      await store.delete("chat:1"); // absent -> must not throw
    });
  });

  test("encodes keys into safe filenames and leaves no temp files", async () => {
    await withDir(async (dir) => {
      const store = new FileSessionStorage({ path: dir });
      // A key with a path separator must not escape the directory.
      await store.write("chat:../../etc/x", { data: { n: 9 }, awaiting: {} });
      const files = await readdir(dir);
      assert.equal(files.length, 1);
      assert.match(files[0]!, /\.json$/);
      assert.doesNotMatch(files[0]!, /\.tmp$/); // temp file was renamed away
      const loaded = (await store.read("chat:../../etc/x")) as { data: unknown };
      assert.deepEqual(loaded.data, { n: 9 });
    });
  });
});
