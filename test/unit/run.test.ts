import { describe, test } from "node:test";
import assert from "node:assert/strict";
import process from "node:process";
import { Bot } from "../../src/core/bot.js";
import { TelegramApiError } from "../../src/core/errors.js";
import { run } from "../../src/node/run.js";

/** A fetch that always answers with the given Bot API envelope. */
function envelopeFetch(body: unknown): typeof fetch {
  return (async () => new Response(JSON.stringify(body))) as unknown as typeof fetch;
}

/** Capture everything written to stderr for the duration of `fn`. */
async function captureStderr(fn: () => Promise<void>): Promise<string> {
  const original = process.stderr.write.bind(process.stderr);
  let captured = "";
  process.stderr.write = ((chunk: string | Uint8Array) => {
    captured += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString();
    return true;
  }) as typeof process.stderr.write;
  try {
    await fn();
  } finally {
    process.stderr.write = original;
  }
  return captured;
}

describe("run", () => {
  test("surfaces a fatal poll-stop to stderr and re-throws", async () => {
    // 401 is non-retriable; retry:false makes longPoll throw on the first poll.
    const bot = new Bot("123:abc", {
      fetch: envelopeFetch({ ok: false, error_code: 401, description: "Unauthorized" }),
    });

    let caught: unknown;
    const stderr = await captureStderr(async () => {
      try {
        await run(bot, { retry: false });
      } catch (err) {
        caught = err;
      }
    });

    // Re-thrown unchanged, so an awaiting caller still sees it...
    assert.ok(caught instanceof TelegramApiError);
    assert.strictEqual((caught as TelegramApiError).errorCode, 401);
    // ...and it was surfaced to stderr, so a dropped rejection can't be silent.
    assert.match(stderr, /polling stopped on a fatal error/);
    assert.strictEqual(bot.isRunning(), false);
  });

  test("a clean stop resolves without writing to stderr", async () => {
    const bot = new Bot("123:abc", {
      fetch: envelopeFetch({ ok: true, result: [] }),
    });

    const stderr = await captureStderr(async () => {
      const running = run(bot);
      bot.stop(); // abort before/while the first poll is in flight
      await running;
    });

    assert.strictEqual(stderr, "");
    assert.strictEqual(bot.isRunning(), false);
  });
});
