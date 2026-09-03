#!/usr/bin/env node
/**
 * CI lint gate: the Bun-only modules (`bun`, `bun:sqlite`, `bun:*`) must never
 * be reached from the runtime-agnostic core or the Node subpath. They live under
 * `src/bun/**` behind the `./bun` export; if `src/core` or `src/node` imported
 * them, a Node / edge install would resolve a nonexistent module. This scans
 * those two trees and fails on any `bun` / `bun:*` import specifier.
 *
 * (The reverse - `src/bun` importing core - is allowed and expected.)
 * Plain Node ESM, no dependencies. Exit 0 if clean, 1 (with offenders) if not.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const GUARDED_DIRS = [join(ROOT, "src", "core"), join(ROOT, "src", "node")];

function collectTsFiles(dir) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out; // dir may not exist
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectTsFiles(full));
    else if (entry.endsWith(".ts")) out.push(full);
  }
  return out;
}

// Specifier patterns, run over the WHOLE file (not line-by-line) and anchored on
// the `bun` / `bun:*` specifier itself, so a multi-line `import { ... } from
// "bun"` - where `import` and the `from "..."` clause sit on different lines - is
// still caught. Covers: import/export ... from, bare import, dynamic import(),
// and require().
const SPEC = String.raw`["'\`](bun|bun:[^"'\`]*)["'\`]`;
const PATTERNS = [
  new RegExp(String.raw`\bfrom\s*${SPEC}`, "g"),
  new RegExp(String.raw`\bimport\s*${SPEC}`, "g"),
  new RegExp(String.raw`\bimport\s*\(\s*${SPEC}`, "g"),
  new RegExp(String.raw`\brequire\s*\(\s*${SPEC}`, "g"),
];

/** Blank out comments while preserving newline positions, so line numbers stay accurate. */
function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/\/\/[^\n]*/g, "");
}

const offenders = [];
for (const dir of GUARDED_DIRS) {
  for (const file of collectTsFiles(dir)) {
    const raw = readFileSync(file, "utf8");
    const rawLines = raw.split(/\r?\n/);
    const scanned = stripComments(raw);
    const seen = new Set();
    for (const re of PATTERNS) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(scanned)) !== null) {
        const line = scanned.slice(0, m.index).split(/\r?\n/).length;
        const spec = m[1];
        const key = `${line}:${spec}`;
        if (seen.has(key)) continue;
        seen.add(key);
        offenders.push({ file: file.slice(ROOT.length + 1), line, spec, text: (rawLines[line - 1] ?? "").trim() });
      }
    }
  }
}

if (offenders.length > 0) {
  console.error("FAIL: src/core and src/node must not import Bun-only modules (bun, bun:*).\n");
  for (const o of offenders) {
    console.error(`  ${o.file}:${o.line}  imports "${o.spec}"`);
    console.error(`      ${o.text}`);
  }
  console.error(`\n${offenders.length} offending Bun import(s) found. Move the code to src/bun/.\n`);
  process.exit(1);
}

console.log("OK: no Bun-only imports (bun, bun:*) reachable from src/core or src/node.");
process.exit(0);
