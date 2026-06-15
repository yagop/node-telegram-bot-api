/**
 * Debug tracing (the `debug`-style `DEBUG=...` convention).
 *
 * Core emits namespaced traces via `debug("<area>")` -> `node-telegram-bot-api:<area>`,
 * but stays free of Node globals (the edge-isolation lint forbids env/stderr access
 * here): the enable-check and the writer are PLUGGABLE and default to OFF, so every
 * trace is a zero-cost no-op until a sink is installed. The Node entry installs a
 * real sink from the `DEBUG` env var + stderr (see `src/node/debug.ts`), so
 * `DEBUG="node-telegram-bot-api:*"` prints traces on Node while the identical code
 * is inert on the edge.
 */

/** The namespace prefix all loggers share (the package name), per the v1 convention. */
export const DEBUG_PREFIX = "node-telegram-bot-api";

/** A namespaced trace logger. The message is printf-style (`%s`, `%d`, `%j`, `%%`). */
export type Debugger = (message: string, ...args: unknown[]) => void;

/**
 * The pluggable backend. `enabled` decides whether a namespace is active (so the
 * arguments are only formatted when it is); `write` emits the finished line.
 */
export interface DebugSink {
  enabled(namespace: string): boolean;
  write(namespace: string, line: string): void;
}

let sink: DebugSink | undefined;

/** Install the debug backend, or clear it with `undefined`. Called by the Node entry. */
export function setDebugSink(next: DebugSink | undefined): void {
  sink = next;
}

/** The current backend (for tests that snapshot/restore it). */
export function getDebugSink(): DebugSink | undefined {
  return sink;
}

/**
 * Create a logger for `node-telegram-bot-api:<area>`. Cheap to call when debug is
 * off: it short-circuits before formatting, so hot paths pay only a closure call
 * and one boolean check.
 */
export function debug(area: string): Debugger {
  const namespace = `${DEBUG_PREFIX}:${area}`;
  return (message, ...args) => {
    const active = sink;
    if (active && active.enabled(namespace)) {
      active.write(namespace, format(message, args));
    }
  };
}

/** JSON-stringify a value for a trace, never throwing (falls back to `String`). */
function stringify(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

/**
 * Minimal printf for trace messages: `%s` (string), `%d`/`%i` (integer),
 * `%j`/`%o`/`%O` (JSON), `%%` (literal `%`). Unconsumed args are appended.
 */
function format(message: string, args: unknown[]): string {
  if (args.length === 0) return message;
  let i = 0;
  let out = message.replace(/%([sdijoO%])/g, (match, spec: string) => {
    if (spec === "%") return "%";
    if (i >= args.length) return match;
    const arg = args[i++];
    switch (spec) {
      case "s":
        return String(arg);
      case "d":
      case "i":
        return String(Math.floor(Number(arg)));
      default:
        return stringify(arg);
    }
  });
  for (; i < args.length; i++) out += ` ${stringify(args[i])}`;
  return out;
}
