import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileSessionStorage } from "../../src/node/file-session-storage.js";

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
      const value = JSON.stringify({ v: 1, data: { n: 3 } });
      await a.write("chat:42", value);

      // A brand-new instance (i.e. after a restart) reads the string back verbatim.
      const b = new FileSessionStorage({ path: join(dir, "sessions") });
      assert.equal(await b.read("chat:42"), value);
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
      await store.write("chat:1", '{"v":1}');
      await store.delete("chat:1");
      assert.equal(await store.read("chat:1"), undefined);
      await store.delete("chat:1"); // absent -> must not throw
    });
  });

  test("init() creates the directory up front and is idempotent", async () => {
    await withDir(async (dir) => {
      const path = join(dir, "nested", "sessions");
      const store = new FileSessionStorage({ path });
      await store.init(); // fail-fast-at-boot path: dir created before any write
      await store.init(); // idempotent - no throw
      await store.write("k", '{"ok":true}');
      assert.equal(await store.read("k"), '{"ok":true}');
    });
  });

  test("retries directory creation after a transient failure (no permanently-cached rejection)", async () => {
    await withDir(async (dir) => {
      const target = join(dir, "blocked");
      // A regular file where the store wants a directory -> mkdir(recursive) rejects.
      await writeFile(target, "x");
      const store = new FileSessionStorage({ path: target });
      await assert.rejects(store.write("k", "{}"));

      // Clear the blocker; a later write must re-attempt mkdir, not re-throw the cached error.
      await rm(target);
      await store.write("k", '{"ok":true}');
      assert.equal(await store.read("k"), '{"ok":true}');
    });
  });

  test("encodes keys into safe filenames and leaves no temp files", async () => {
    await withDir(async (dir) => {
      const store = new FileSessionStorage({ path: dir });
      // A key with a path separator must not escape the directory.
      await store.write("chat:../../etc/x", '{"n":9}');
      const files = await readdir(dir);
      assert.equal(files.length, 1);
      assert.match(files[0]!, /\.json$/);
      assert.doesNotMatch(files[0]!, /\.tmp$/); // temp file was renamed away
      assert.equal(await store.read("chat:../../etc/x"), '{"n":9}');
    });
  });
});
