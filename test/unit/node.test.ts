/**
 * Node subpath (`node-telegram-bot-api/node`) smoke test — the only Node-only
 * code (fs upload + a node:http webhook server).
 */
import { test, expect, describe } from "bun:test";
import { writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

import { fromPath, createWebhookServer } from "../../src/node/index.js";
import { Bot, toBlob } from "../../src/core/index.js";

describe("node adapter", () => {
  test("fromPath reads a filesystem file into an InputFile", async () => {
    const p = join(tmpdir(), `ntba-v2-${Date.now()}.txt`);
    await writeFile(p, "hello-bytes");
    try {
      const f = await fromPath(p);
      const { blob, filename } = await toBlob(f);
      expect(filename).toBe(basename(p));
      expect(await blob.text()).toBe("hello-bytes");
    } finally {
      await rm(p, { force: true });
    }
  });

  test("createWebhookServer builds a node:http server", () => {
    const fetch = (async () => new Response(JSON.stringify({ ok: true, result: true }))) as unknown as typeof globalThis.fetch;
    const bot = new Bot("T", { fetch });
    const server = createWebhookServer(bot, { secretToken: "s", path: "/hook" });
    expect(typeof server.listen).toBe("function");
    server.close();
  });
});
