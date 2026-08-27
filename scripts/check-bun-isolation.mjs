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

/** Is `spec` the Bun module or a `bun:` builtin? */
function isBunModule(spec) {
  return spec === "bun" || spec.startsWith("bun:");
}

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

// import ... from "spec" / import "spec" / export ... from "spec" / import("spec") / require("spec")
const PATTERNS = [
  /\bimport\b(?:[^'"`;]*?\bfrom\s*)?["'`](?<spec>[^"'`]+)["'`]/,
  /\bexport\b[^'"`;]*?\bfrom\s*["'`](?<spec>[^"'`]+)["'`]/,
  /\bimport\s*\(\s*["'`](?<spec>[^"'`]+)["'`]\s*\)/,
  /\brequire\s*\(\s*["'`](?<spec>[^"'`]+)["'`]\s*\)/,
];

function stripComments(line) {
  return line.replace(/\/\*.*?\*\//g, "").replace(/\/\/.*$/, "");
}

const offenders = [];
for (const dir of GUARDED_DIRS) {
  for (const file of collectTsFiles(dir)) {
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const cleaned = stripComments(lines[i]);
      for (const re of PATTERNS) {
        const m = re.exec(cleaned);
        if (m?.groups?.spec && isBunModule(m.groups.spec)) {
          offenders.push({ file: file.slice(ROOT.length + 1), line: i + 1, spec: m.groups.spec, text: lines[i].trim() });
          break;
        }
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
