import { afterEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { type DebugSink, debug, getDebugSink, setDebugSink } from "../../src/core/debug.js";
import { compileDebugFilter } from "../../src/node/debug.js";

describe("core debug", () => {
  const original = getDebugSink();
  afterEach(() => setDebugSink(original));

  /** Install a capturing sink and return the lines it records. */
  function capture(enabled: (ns: string) => boolean = () => true): Array<[string, string]> {
    const lines: Array<[string, string]> = [];
    const sink: DebugSink = { enabled, write: (ns, line) => lines.push([ns, line]) };
    setDebugSink(sink);
    return lines;
  }

  test("no sink -> logging is a silent no-op", () => {
    setDebugSink(undefined);
    assert.doesNotThrow(() => debug("transport")("hi %s", "x"));
  });

  test("emits under node-telegram-bot-api:<area> when enabled", () => {
    const lines = capture();
    debug("transport")("hello");
    assert.deepStrictEqual(lines, [["node-telegram-bot-api:transport", "hello"]]);
  });

  test("a disabled namespace is not written (and args are not formatted)", () => {
    const lines = capture((ns) => ns === "node-telegram-bot-api:polling");
    debug("transport")("nope");
    debug("polling")("yes");
    assert.deepStrictEqual(lines.map(([ns]) => ns), ["node-telegram-bot-api:polling"]);
  });

  test("printf format: %s %d %j %% and trailing args", () => {
    const lines = capture();
    debug("x")("%s=%d %j%% rest", "n", 3.9, { a: 1 }, "tail");
    assert.strictEqual(lines[0]![1], 'n=3 {"a":1}% rest tail');
  });
});

describe("DEBUG filter (node)", () => {
  test("wildcard enables sub-namespaces only", () => {
    const on = compileDebugFilter("node-telegram-bot-api:*");
    assert.strictEqual(on("node-telegram-bot-api:transport"), true);
    assert.strictEqual(on("node-telegram-bot-api:polling"), true);
    assert.strictEqual(on("other:thing"), false);
  });

  test("a leading - skips a namespace", () => {
    const on = compileDebugFilter("node-telegram-bot-api:*,-node-telegram-bot-api:polling");
    assert.strictEqual(on("node-telegram-bot-api:transport"), true);
    assert.strictEqual(on("node-telegram-bot-api:polling"), false);
  });

  test("empty enables nothing", () => {
    const on = compileDebugFilter("");
    assert.strictEqual(on("node-telegram-bot-api:transport"), false);
  });
});
