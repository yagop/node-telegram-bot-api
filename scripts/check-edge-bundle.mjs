#!/usr/bin/env bun
/**
 * CI edge-safety gate (ADR-009): the runtime-agnostic core (`src/core/**`) must
 * bundle for a browser/edge target with **zero** Node dependencies.
 *
 * Where `check-core-imports.mjs` reads the source statically, this check proves
 * the guarantee at the *bundler* level: it asks Bun to bundle the core entry the
 * way an edge platform (Cloudflare Workers, Vercel/Deno Edge) would, and fails if
 * a Node builtin is reachable from `src/core/index.ts` - even transitively, past
 * the import-specifier lint.
 *
 * Why a resolver plugin instead of just scanning the output: Bun's
 * `target: "browser"` *polyfills* Node builtins (a stray `node:crypto` bloats the
 * bundle to ~950 KiB but leaves no `node:` text to grep for). A real edge runtime
 * provides no such polyfills, so we model that faithfully - a custom resolver
 * intercepts every `node:*` / bare-builtin import and makes the build FAIL, which
 * is exactly what would happen on a Worker. A literal `node:` scan of the output
 * is kept as a redundant second layer.
 *
 * Run with Bun (uses the Bun.build API): `bun scripts/check-edge-bundle.mjs`.
 * Exit 0 if the core is Node-free, 1 otherwise.
 */
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENTRY = join(ROOT, "src", "core", "index.ts");

/** Node built-in module names that may appear without the `node:` prefix. */
const BUILTINS = new Set([
  "assert", "async_hooks", "buffer", "child_process", "cluster", "console",
  "constants", "crypto", "dgram", "diagnostics_channel", "dns", "domain",
  "events", "fs", "http", "http2", "https", "inspector", "module", "net", "os",
  "path", "perf_hooks", "process", "punycode", "querystring", "readline", "repl",
  "stream", "string_decoder", "sys", "timers", "tls", "trace_events", "tty",
  "url", "util", "v8", "vm", "wasi", "worker_threads", "zlib",
]);

/** True if `spec` resolves to a Node builtin, with or without the `node:` prefix. */
function isNodeBuiltin(spec) {
  if (spec.startsWith("node:")) return true;
  return BUILTINS.has(spec.split("/")[0]);
}

// Records every Node builtin the bundler tried to resolve from core.
const leaked = [];

/**
 * Edge resolver: no Node builtins exist. Any `node:*` or bare-builtin import is
 * routed to a namespace whose loader throws, so `Bun.build` reports failure -
 * mirroring what an edge runtime (Cloudflare Workers, etc.) would do.
 */
const noNodeBuiltins = {
  name: "no-node-builtins",
  setup(build) {
    build.onResolve({ filter: /^node:/ }, (args) => {
      leaked.push(args.path);
      return { path: args.path, namespace: "node-leak" };
    });
    build.onResolve({ filter: /.*/ }, (args) => {
      if (isNodeBuiltin(args.path)) {
        leaked.push(args.path);
        return { path: args.path, namespace: "node-leak" };
      }
      return undefined;
    });
    build.onLoad({ filter: /.*/, namespace: "node-leak" }, (args) => {
      throw new Error(
        `Node builtin "${args.path}" is not available on a browser/edge target`,
      );
    });
  },
};

const result = await Bun.build({
  entrypoints: [ENTRY],
  target: "browser",
  plugins: [noNodeBuiltins],
});

if (!result.success) {
  for (const m of result.logs) console.error(String(m));
  if (leaked.length > 0) {
    console.error(
      `\nFAIL: core pulls in Node builtin(s) [${[...new Set(leaked)].join(", ")}]; ` +
        `it cannot bundle Node-free for the edge.`,
    );
  } else {
    console.error("\nFAIL: core did not bundle for a browser/edge target.");
  }
  process.exit(1);
}

// Redundant second layer: assert no `node:` builtin reference survived in output.
let bad = false;
let totalBytes = 0;
for (const out of result.outputs) {
  const code = await out.text();
  totalBytes += code.length;
  const m = code.match(/(?:require\(|from\s*)["']node:[^"']+["']/);
  if (m) {
    console.error(`FAIL: bundled core references ${m[0]} (in ${out.path}).`);
    bad = true;
  }
}

if (bad) {
  console.error("\nA Node builtin leaked into the edge bundle; the core is not Node-free.");
  process.exit(1);
}

const kib = (totalBytes / 1024).toFixed(1);
console.log(
  `OK: core bundled Node-free for target "browser" - ` +
    `${result.outputs.length} output(s), ${totalBytes} bytes (${kib} KiB); ` +
    `no Node builtins reachable, no "node:" references survived.`,
);
process.exit(0);
