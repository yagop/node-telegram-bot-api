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

/** Run `fn` with `process.exit` stubbed, returning the exit codes it requested. */
async function captureExit(fn: () => Promise<void>): Promise<number[]> {
  const original = process.exit;
  const codes: number[] = [];
  process.exit = ((code?: number) => {
    codes.push(code ?? 0);
    // Do not actually exit; let `run` finish so the test can assert.
  }) as typeof process.exit;
  try {
    await fn();
  } finally {
    process.exit = original;
  }
  return codes;
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

  test("exitOnError exits non-zero after a fatal poll-stop", async () => {
    const bot = new Bot("123:abc", {
      fetch: envelopeFetch({ ok: false, error_code: 401, description: "Unauthorized" }),
    });

    let codes: number[] = [];
    // Suppress the stderr line so it doesn't clutter the test output.
    await captureStderr(async () => {
      codes = await captureExit(async () => {
        // Still re-throws (exit is stubbed, so control returns to the caller).
        await assert.rejects(run(bot, { retry: false, exitOnError: true }), TelegramApiError);
      });
    });

    assert.deepStrictEqual(codes, [1]);
  });

  test("exitOnError does not exit on a clean stop", async () => {
    const bot = new Bot("123:abc", {
      fetch: envelopeFetch({ ok: true, result: [] }),
    });

    const codes = await captureExit(async () => {
      const running = run(bot, { exitOnError: true });
      bot.stop();
      await running;
    });

    assert.deepStrictEqual(codes, []);
  });
});
