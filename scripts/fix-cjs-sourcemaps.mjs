// Postbuild: repair source-map references in the CommonJS build output.
//
// zshy emits dual ESM + CJS, but the CJS artifacts (`*.cjs` / `*.d.cts`) copy
// the ESM `//# sourceMappingURL=` comment verbatim, so they point at the ESM
// map (`*.js.map` / `*.d.ts.map`) instead of their own companion map
// (`*.cjs.map` / `*.d.cts.map`). The two maps have different `mappings`, so
// every CJS consumer — Node `--enable-source-maps`, source-map-support,
// ts-node/tsx, Jest/Mocha, IDE "go to definition" — would misreport positions.
// The companion `*.cjs.map` / `*.d.cts.map` files also carry the wrong `file`
// field (the ESM name).
//
// This walks dist/ and rewrites both the comment and the map `file` field so
// each CJS artifact references its own map. It is idempotent: once corrected,
// none of the patterns match again. Runs under plain Node (no bun) because it
// executes via `npm run build` / `prepare`, which consumers run on install.
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const distDir = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");

// Longest suffix first so `.cjs.map` / `.d.cts.map` win over `.cjs` / `.d.cts`.
/** @type {Array<{ suffix: string, find: RegExp, replace: string }>} */
const RULES = [
  // map `file` field must name the artifact the map belongs to
  { suffix: ".cjs.map", find: /("file":"[^"]+)\.js"/, replace: '$1.cjs"' },
  { suffix: ".d.cts.map", find: /("file":"[^"]+)\.d\.ts"/, replace: '$1.d.cts"' },
  // CJS declarations → their own .d.cts.map
  { suffix: ".d.cts", find: /(\/\/# sourceMappingURL=\S+)\.d\.ts\.map$/m, replace: "$1.d.cts.map" },
  // CJS code → its own .cjs.map
  { suffix: ".cjs", find: /(\/\/# sourceMappingURL=\S+)\.js\.map$/m, replace: "$1.cjs.map" },
];

function ruleFor(name) {
  return RULES.find((r) => name.endsWith(r.suffix));
}

let patched = 0;
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full);
      continue;
    }
    const rule = ruleFor(entry);
    if (!rule) continue;
    const original = readFileSync(full, "utf8");
    const fixed = original.replace(rule.find, rule.replace);
    if (fixed !== original) {
      writeFileSync(full, fixed);
      patched += 1;
    }
  }
}

walk(distDir);
console.log(`fix-cjs-sourcemaps: patched ${patched} file(s) in dist/`);
