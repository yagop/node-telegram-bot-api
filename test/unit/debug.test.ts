import { afterEach, describe, expect, test } from "bun:test";
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
    expect(() => debug("transport")("hi %s", "x")).not.toThrow();
  });

  test("emits under node-telegram-bot-api:<area> when enabled", () => {
    const lines = capture();
    debug("transport")("hello");
    expect(lines).toEqual([["node-telegram-bot-api:transport", "hello"]]);
  });

  test("a disabled namespace is not written (and args are not formatted)", () => {
    const lines = capture((ns) => ns === "node-telegram-bot-api:polling");
    debug("transport")("nope");
    debug("polling")("yes");
    expect(lines.map(([ns]) => ns)).toEqual(["node-telegram-bot-api:polling"]);
  });

  test("printf format: %s %d %j %% and trailing args", () => {
    const lines = capture();
    debug("x")("%s=%d %j%% rest", "n", 3.9, { a: 1 }, "tail");
    expect(lines[0]![1]).toBe('n=3 {"a":1}% rest tail');
  });
});

describe("DEBUG filter (node)", () => {
  test("wildcard enables sub-namespaces only", () => {
    const on = compileDebugFilter("node-telegram-bot-api:*");
    expect(on("node-telegram-bot-api:transport")).toBe(true);
    expect(on("node-telegram-bot-api:polling")).toBe(true);
    expect(on("other:thing")).toBe(false);
  });

  test("a leading - skips a namespace", () => {
    const on = compileDebugFilter("node-telegram-bot-api:*,-node-telegram-bot-api:polling");
    expect(on("node-telegram-bot-api:transport")).toBe(true);
    expect(on("node-telegram-bot-api:polling")).toBe(false);
  });

  test("empty enables nothing", () => {
    const on = compileDebugFilter("");
    expect(on("node-telegram-bot-api:transport")).toBe(false);
  });
});
