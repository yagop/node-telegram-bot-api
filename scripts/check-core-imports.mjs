#!/usr/bin/env node
/**
 * CI lint gate: the runtime-agnostic core (`src/core/**`) must not depend on any
 * Node built-in. This catches `node:fs` imports, bare-builtin imports (`fs`,
 * `path`, …), `export … from` re-exports, dynamic `import()` and `require()`.
 *
 * Plain Node ESM, no dependencies. Exit 0 if clean, 1 (with offenders) if not.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const CORE_DIR = join(ROOT, "src", "core");

/** Node built-in module names that may appear without the `node:` prefix. */
const BUILTINS = new Set([
  "assert",
  "async_hooks",
  "buffer",
  "child_process",
  "cluster",
  "console",
  "constants",
  "crypto",
  "dgram",
  "diagnostics_channel",
  "dns",
  "domain",
  "events",
  "fs",
  "http",
  "http2",
  "https",
  "inspector",
  "module",
  "net",
  "os",
  "path",
  "perf_hooks",
  "process",
  "punycode",
  "querystring",
  "readline",
  "repl",
  "stream",
  "string_decoder",
  "sys",
  "timers",
  "tls",
  "trace_events",
  "tty",
  "url",
  "util",
  "v8",
  "vm",
  "wasi",
  "worker_threads",
  "zlib",
]);

/** Is `spec` a Node built-in (with or without the `node:` prefix)? */
function isNodeBuiltin(spec) {
  if (spec.startsWith("node:")) return true;
  // Strip subpath (e.g. `fs/promises` -> `fs`).
  const top = spec.split("/")[0];
  return BUILTINS.has(top);
}

/** Recursively collect all `.ts` files under `dir`. */
function collectTsFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...collectTsFiles(full));
    else if (entry.endsWith(".ts")) out.push(full);
  }
  return out;
}

// Match the specifier of an import/export/dynamic-import/require statement.
// Grouped so whichever quote captures, the specifier is in group `spec`.
const PATTERNS = [
  // import ... from "spec"   /   import "spec"
  /\bimport\b(?:[^'"`;]*?\bfrom\s*)?["'`](?<spec>[^"'`]+)["'`]/,
  // export ... from "spec"
  /\bexport\b[^'"`;]*?\bfrom\s*["'`](?<spec>[^"'`]+)["'`]/,
  // dynamic import("spec")
  /\bimport\s*\(\s*["'`](?<spec>[^"'`]+)["'`]\s*\)/,
  // require("spec")
  /\brequire\s*\(\s*["'`](?<spec>[^"'`]+)["'`]\s*\)/,
];

/** Strip line/block comments so we don't match specifiers inside comments. */
function stripComments(line) {
  // Block-comment fragments on a single line, then a line comment tail.
  return line.replace(/\/\*.*?\*\//g, "").replace(/\/\/.*$/, "");
}

const files = collectTsFiles(CORE_DIR);
const offenders = [];

for (const file of files) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  let inBlockComment = false;
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Track multi-line block comments crudely; skip lines fully inside one.
    if (inBlockComment) {
      const end = line.indexOf("*/");
      if (end === -1) continue;
      line = line.slice(end + 2);
      inBlockComment = false;
    }
    const openBlock = line.lastIndexOf("/*");
    const closeBlock = line.lastIndexOf("*/");
    if (openBlock !== -1 && openBlock > closeBlock) {
      inBlockComment = true;
      line = line.slice(0, openBlock);
    }

    const cleaned = stripComments(line);

    for (const re of PATTERNS) {
      const m = re.exec(cleaned);
      if (m?.groups?.spec && isNodeBuiltin(m.groups.spec)) {
        offenders.push({
          file: file.slice(ROOT.length + 1),
          line: i + 1,
          spec: m.groups.spec,
          text: line.trim(),
        });
        break; // one report per line is enough
      }
    }
  }
}

if (offenders.length > 0) {
  console.error("FAIL: src/core must not import Node built-ins.\n");
  for (const o of offenders) {
    console.error(`  ${o.file}:${o.line}  imports "${o.spec}"`);
    console.error(`      ${o.text}`);
  }
  console.error(`\n${offenders.length} offending import(s) found in src/core.`);
  process.exit(1);
}

console.log(`OK: scanned ${files.length} file(s) in src/core; no Node built-in imports found.`);
process.exit(0);
