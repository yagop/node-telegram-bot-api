#!/usr/bin/env node
/**
 * CI lint gate: the runtime-agnostic core (`src/core/**`) must not depend on any
 * Node built-in. This catches `node:fs` imports, bare-builtin imports (`fs`,
 * `path`, ...), `export ... from` re-exports, dynamic `import()` and `require()`.
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

// Match an import/export/dynamic-import/require specifier. Run over the WHOLE
// file (global) and anchored on the specifier itself (after `from` / `import` /
// `import(` / `require(`), so a multi-line `import { ... } from "node:fs"` -
// keyword and clause on different lines - is still caught. `spec` captures it.
const SPEC = String.raw`["'\`](?<spec>[^"'\`]+)["'\`]`;
const PATTERNS = [
  new RegExp(String.raw`\bfrom\s*${SPEC}`, "g"),
  new RegExp(String.raw`\bimport\s*${SPEC}`, "g"),
  new RegExp(String.raw`\bimport\s*\(\s*${SPEC}`, "g"),
  new RegExp(String.raw`\brequire\s*\(\s*${SPEC}`, "g"),
];

/** Blank out comments while preserving newline positions, so line numbers stay accurate. */
function stripCommentsWhole(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/\/\/[^\n]*/g, "");
}

/** Strip line/block comments so we don't match specifiers inside comments. */
function stripComments(line) {
  // Block-comment fragments on a single line, then a line comment tail.
  return line.replace(/\/\*.*?\*\//g, "").replace(/\/\/.*$/, "");
}

/**
 * Blank out the *contents* of string and template literals on a single line so
 * an identifier mentioned inside a string (e.g. `"see process docs"`) is never
 * mistaken for a real global reference. The quotes themselves are kept so the
 * import-specifier patterns above still work; only the inner characters are
 * replaced with spaces (preserving column positions).
 */
function stripStringContents(line) {
  return line.replace(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g, (_m, q, body) => q + " ".repeat(body.length) + q);
}

/**
 * Node-only globals that must never appear in `src/core`. Each is matched only
 * as a *standalone identifier read as a global* - never as a property access
 * (`obj.process`), an object/interface key (`global?: number`), or a substring
 * of a longer word (`processing`, `preprocess`, `globalThis`).
 *
 * Allowed web globals (`globalThis`, `setTimeout`, `queueMicrotask`, `fetch`,
 * `Blob`, `FormData`, `TextDecoder`, `AbortSignal`, `Response`, `Request`,
 * `URLSearchParams`, ...) are intentionally absent and never flagged.
 */
const NODE_GLOBALS = ["Buffer", "process", "global", "__dirname", "__filename", "setImmediate", "clearImmediate"];

/**
 * Build the matcher for a single Node global.
 *  - `(?<![\w$.])`  - not preceded by an identifier char or a `.` (rules out
 *                     property access like `opts.global` / `this.process`).
 *  - `(?![\w$])`    - not followed by an identifier char (rules out `processing`,
 *                     and stops `global` from matching inside `globalThis`).
 *  - `(?!\s*\??:)`  - not immediately used as an object/interface property key
 *                     (rules out `global?: number` and `global: 30`).
 */
function globalMatcher(name) {
  const id = name.replace(/[$]/g, "\\$&"); // escape `$` (none here, but safe)
  return new RegExp(`(?<![\\w$.])${id}(?![\\w$])(?!\\s*\\??:)`);
}
const GLOBAL_PATTERNS = NODE_GLOBALS.map((name) => ({ name, re: globalMatcher(name) }));

/**
 * Special case from the spec: `globalThis.process` is a real Node-global access
 * even though `process` is preceded by a `.` (so the matcher above skips it).
 * Flag `globalThis.<denied>` for any denied global reachable off `globalThis`.
 */
const GLOBALTHIS_PATTERN = new RegExp(`\\bglobalThis\\s*\\.\\s*(?<name>${NODE_GLOBALS.join("|")})(?![\\w$])`);

const files = collectTsFiles(CORE_DIR);
const importOffenders = [];
const globalOffenders = [];

// ── Node built-in import/require specifiers (whole-file, multi-line safe) ────
for (const file of files) {
  const raw = readFileSync(file, "utf8");
  const rawLines = raw.split(/\r?\n/);
  const scanned = stripCommentsWhole(raw);
  const seen = new Set();
  for (const re of PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(scanned)) !== null) {
      const spec = m.groups?.spec;
      if (!spec || !isNodeBuiltin(spec)) continue;
      const line = scanned.slice(0, m.index).split(/\r?\n/).length;
      const key = `${line}:${spec}`;
      if (seen.has(key)) continue;
      seen.add(key);
      importOffenders.push({ file: file.slice(ROOT.length + 1), line, spec, text: (rawLines[line - 1] ?? "").trim() });
    }
  }
}

// ── Node-only globals (line-based; globals are single tokens) ────────────────
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

    // ── Node-only globals as identifiers ──────────────────────────────────
    // String contents are blanked so globals named inside a literal don't trip
    // the scan; comments are already stripped above.
    const code = stripStringContents(cleaned);

    // `globalThis.process` & friends count as a hit on the underlying global.
    const gt = GLOBALTHIS_PATTERN.exec(code);
    if (gt?.groups?.name) {
      globalOffenders.push({
        file: file.slice(ROOT.length + 1),
        line: i + 1,
        name: gt.groups.name,
        text: line.trim(),
      });
    } else {
      for (const { name, re } of GLOBAL_PATTERNS) {
        if (re.test(code)) {
          globalOffenders.push({
            file: file.slice(ROOT.length + 1),
            line: i + 1,
            name,
            text: line.trim(),
          });
          break; // one report per line is enough
        }
      }
    }
  }
}

let failed = false;

if (importOffenders.length > 0) {
  failed = true;
  console.error("FAIL [imports]: src/core must not import Node built-ins.\n");
  for (const o of importOffenders) {
    console.error(`  ${o.file}:${o.line}  imports "${o.spec}"`);
    console.error(`      ${o.text}`);
  }
  console.error(`\n${importOffenders.length} offending import(s) found in src/core.\n`);
}

if (globalOffenders.length > 0) {
  failed = true;
  console.error("FAIL [globals]: src/core must not use Node-only globals.\n");
  for (const o of globalOffenders) {
    console.error(`  ${o.file}:${o.line}  uses "${o.name}"`);
    console.error(`      ${o.text}`);
  }
  console.error(`\n${globalOffenders.length} offending global use(s) found in src/core.\n`);
}

if (failed) process.exit(1);

console.log(
  `OK: scanned ${files.length} file(s) in src/core; ` +
    `no Node built-in imports and no Node-only globals ` +
    `(${NODE_GLOBALS.join(", ")}) found.`,
);
process.exit(0);
