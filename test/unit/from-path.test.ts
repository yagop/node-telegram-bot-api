import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { describe, test } from "node:test";
import { fromPath } from "../../src/node/from-path.js";

describe("fromPath", () => {
  test("returns a replayable stream without reading the whole file", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ntba-from-path-"));
    const path = join(directory, "fixture.txt");
    await writeFile(path, "streamed from disk");

    try {
      const file = await fromPath(path, { contentType: "text/plain" });
      assert.strictEqual(file.meta?.filename, basename(path));
      assert.strictEqual(typeof file.data, "function");
      if (typeof file.data !== "function") assert.fail("expected a stream factory");

      const first = await file.data();
      const second = await file.data();
      assert.strictEqual(await new Response(first).text(), "streamed from disk");
      assert.strictEqual(await new Response(second).text(), "streamed from disk");
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  });
});
