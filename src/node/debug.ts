/**
 * Wire core's debug tracing to the Node `DEBUG` env var + stderr, matching the
 * `debug` package convention used by v1: `DEBUG="node-telegram-bot-api:*"`.
 *
 * Imported for its side effect by the `./node` entry, so `DEBUG=... node app.js`
 * (or `bun test`) just works. `enableDebugFromEnv()` is exported for explicit
 * control (e.g. re-reading after changing the env, or passing a custom filter).
 * This lives under `./node` because env + stderr access is Node-only.
 */

import process from "node:process";
import { type DebugSink, setDebugSink } from "../core/debug.js";

/**
 * Compile a `DEBUG`-style filter string into an `enabled(namespace)` predicate.
 * Comma/space-separated patterns; `*` is a wildcard; a leading `-` skips. A
 * namespace is on when it matches a positive pattern and no skip. An empty
 * string matches nothing.
 */
export function compileDebugFilter(env: string): (namespace: string) => boolean {
  const names: RegExp[] = [];
  const skips: RegExp[] = [];
  for (const token of env.split(/[\s,]+/).filter(Boolean)) {
    if (token.startsWith("-")) skips.push(toRegExp(token.slice(1)));
    else names.push(toRegExp(token));
  }
  return (namespace) => names.some((re) => re.test(namespace)) && !skips.some((re) => re.test(namespace));
}

/** Turn one pattern (with `*` wildcards) into an anchored RegExp. */
function toRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*?");
  return new RegExp(`^${escaped}$`);
}

/**
 * Read `DEBUG` (defaulting to `process.env.DEBUG`) and install a stderr-writing
 * sink for the namespaces it enables. With nothing enabled, the sink is cleared
 * so tracing stays a no-op.
 */
export function enableDebugFromEnv(env: string = process.env.DEBUG ?? ""): void {
  if (env.trim() === "") {
    setDebugSink(undefined);
    return;
  }
  const enabled = compileDebugFilter(env);
  // Per-namespace timestamp for the `+Nms` delta the `debug` package is known for.
  const last = new Map<string, number>();
  const sink: DebugSink = {
    enabled,
    write(namespace, line) {
      const nowMs = Date.now();
      const prev = last.get(namespace);
      last.set(namespace, nowMs);
      const delta = prev === undefined ? "" : ` +${nowMs - prev}ms`;
      process.stderr.write(`${namespace} ${line}${delta}\n`);
    },
  };
  setDebugSink(sink);
}

// Auto-enable on import, the way the `debug` package reads the env at load time.
enableDebugFromEnv();
