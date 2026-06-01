/**
 * Static coverage audit for the integration test suite.
 *
 * Uses the TypeScript type-checker to resolve each public TelegramBot method's
 * FULL parameter set (positional args + every key of its trailing options type,
 * with `extends` chains expanded), then diffs that against:
 *   - which methods are actually called in test/integration/telegram.test.ts
 *   - which option keys are actually passed in those calls
 *
 * Output: docs/integration-coverage.md (a checklist).
 */
import { createRequire } from "node:module";
import { writeFileSync, readdirSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const ROOT = process.cwd();
const TELEGRAM_SRC = path.join(ROOT, "src/telegram.ts");
const INTEGRATION_DIR = path.join(ROOT, "test/integration");
const INTEGRATION_TESTS = readdirSync(INTEGRATION_DIR)
  .filter((n) => n.endsWith(".test.ts"))
  .sort()
  .map((n) => path.join(INTEGRATION_DIR, n));

// Library-internal helpers that are NOT Bot API methods — excluded from the audit.
const NOT_API = new Set([
  "startPolling", "stopPolling", "isPolling", "openWebHook", "closeWebHook",
  "hasOpenWebHook", "onText", "removeTextListener", "clearTextListeners",
  "onReplyToMessage", "removeReplyListener", "clearReplyListeners", "processUpdate",
  "getFileLink", "getFileStream", "downloadFile", "debug",
  // EventEmitter overrides exposed for typed events — not Bot API methods.
  "on", "once", "off", "emit", "addListener", "removeListener", "prependListener",
]);

// ---- build program ----------------------------------------------------------
const configPath = path.join(ROOT, "tsconfig.json");
const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, ROOT);
const program = ts.createProgram([TELEGRAM_SRC, ...INTEGRATION_TESTS], parsed.options);
const checker = program.getTypeChecker();

// ---- enumerate TelegramBot methods + parameter sets -------------------------
const tgSource = program.getSourceFile(TELEGRAM_SRC);
let classDecl;
ts.forEachChild(tgSource, function visit(node) {
  if (ts.isClassDeclaration(node) && node.name?.text === "TelegramBot") classDecl = node;
  else ts.forEachChild(node, visit);
});
if (!classDecl) throw new Error("TelegramBot class not found");

const classType = checker.getTypeAtLocation(classDecl);

/** @type {Map<string,{positional:string[], options:string[]}>} */
const methods = new Map();

for (const member of classDecl.members) {
  if (!ts.isMethodDeclaration(member)) continue;
  if (!member.name || !ts.isIdentifier(member.name)) continue;
  const name = member.name.text;
  if (name.startsWith("_") || NOT_API.has(name)) continue;
  // skip non-public
  const mods = ts.getCombinedModifierFlags(member);
  if (mods & (ts.ModifierFlags.Private | ts.ModifierFlags.Protected)) continue;

  const positional = [];
  let optionsKeys = [];
  const params = member.parameters;
  params.forEach((p, i) => {
    const pname = p.name.getText(tgSource);
    const isLast = i === params.length - 1;
    // The trailing param is the options/form bag when it's an object type with a default {}.
    const looksLikeOptionBag =
      isLast && (pname === "form" || pname === "options" || /Options$/.test(p.type?.getText(tgSource) ?? ""));
    if (looksLikeOptionBag && p.type) {
      const t = checker.getTypeFromTypeNode(p.type);
      optionsKeys = checker.getPropertiesOfType(t).map((s) => s.getName()).sort();
    } else {
      positional.push(pname);
    }
  });
  methods.set(name, { positional, options: optionsKeys });
}

// ---- parse integration tests: methods called + option keys passed -----------
/** @type {Map<string,Set<string>>} */ const calledOptionKeys = new Map();
/** @type {Set<string>} */ const calledMethods = new Set();
const spreadInCall = new Set(); // methods where an object spread hides keys

for (const testFile of INTEGRATION_TESTS) {
  const testSource = program.getSourceFile(testFile);
  if (!testSource) continue;
  ts.forEachChild(testSource, function walk(node) {
  if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
    const m = node.expression.name.text;
    if (methods.has(m)) {
      calledMethods.add(m);
      if (!calledOptionKeys.has(m)) calledOptionKeys.set(m, new Set());
      const keys = calledOptionKeys.get(m);
      for (const arg of node.arguments) {
        if (ts.isObjectLiteralExpression(arg)) {
          for (const prop of arg.properties) {
            if (ts.isPropertyAssignment(prop) || ts.isShorthandPropertyAssignment(prop)) {
              keys.add(prop.name.getText(testSource));
            } else if (ts.isSpreadAssignment(prop)) {
              spreadInCall.add(m);
            }
          }
        }
      }
    }
  }
    ts.forEachChild(node, walk);
  });
}

// ---- assemble report --------------------------------------------------------
const allMethods = [...methods.keys()].sort();
const untestedMethods = allMethods.filter((m) => !calledMethods.has(m));
const testedMethods = allMethods.filter((m) => calledMethods.has(m));

// per-method untested option keys (only meaningful for tested methods)
const partial = [];
for (const m of testedMethods) {
  const { options } = methods.get(m);
  if (options.length === 0) continue;
  const passed = calledOptionKeys.get(m) ?? new Set();
  const missing = options.filter((k) => !passed.has(k));
  if (missing.length) partial.push({ m, missing, total: options.length, spread: spreadInCall.has(m) });
}

// totals
const totalOptionParams = allMethods.reduce((n, m) => n + methods.get(m).options.length, 0);
const testedOptionParams = testedMethods.reduce((n, m) => {
  const passed = calledOptionKeys.get(m) ?? new Set();
  return n + methods.get(m).options.filter((k) => passed.has(k)).length;
}, 0);

const lines = [];
lines.push("# Integration test coverage audit");
lines.push("");
lines.push(`> Generated by \`scripts/coverage-audit.mjs\` via the TypeScript type-checker.`);
lines.push(`> Source of truth: \`src/telegram.ts\` signatures + \`src/types/options.ts\`.`);
lines.push(`> "Untested" = the method / option key never appears in any \`test/integration/*.test.ts\` file.`);
lines.push(`> Scanned: ${INTEGRATION_TESTS.map((f) => "`" + path.basename(f) + "`").join(", ")}.`);
lines.push("");
lines.push("## Summary");
lines.push("");
lines.push(`| Dimension | Covered | Total | % |`);
lines.push(`| --- | --- | --- | --- |`);
lines.push(`| Bot API methods | ${testedMethods.length} | ${allMethods.length} | ${pct(testedMethods.length, allMethods.length)} |`);
lines.push(`| Optional/option params (across all methods) | ${testedOptionParams} | ${totalOptionParams} | ${pct(testedOptionParams, totalOptionParams)} |`);
lines.push("");

lines.push(`## Methods never called in integration tests (${untestedMethods.length})`);
lines.push("");
for (const m of untestedMethods) {
  const { positional, options } = methods.get(m);
  const sig = [...positional, options.length ? `{${options.length} opts}` : null].filter(Boolean).join(", ");
  lines.push(`- [ ] \`${m}(${sig})\``);
}
lines.push("");

lines.push(`## Methods called but with untested parameters (${partial.length})`);
lines.push("");
lines.push("Each box lists option keys defined by the method's options type that are never passed in any integration call.");
lines.push("");
for (const { m, missing, total, spread } of partial) {
  lines.push(`### \`${m}\` — ${missing.length}/${total} option params untested${spread ? " ⚠️ (a call uses object spread; some keys may actually be covered)" : ""}`);
  for (const k of missing) lines.push(`- [ ] \`${k}\``);
  lines.push("");
}

const fullyCovered = testedMethods.filter((m) => {
  const { options } = methods.get(m);
  if (!options.length) return true;
  const passed = calledOptionKeys.get(m) ?? new Set();
  return options.every((k) => passed.has(k));
});
lines.push(`## Methods with full parameter coverage (${fullyCovered.length})`);
lines.push("");
lines.push(fullyCovered.map((m) => `\`${m}\``).join(", ") || "_none_");
lines.push("");

const OUT = path.join(ROOT, "docs/integration-coverage.md");
writeFileSync(OUT, lines.join("\n"));
console.log(`methods: ${testedMethods.length}/${allMethods.length} tested, ${untestedMethods.length} untested`);
console.log(`option params: ${testedOptionParams}/${totalOptionParams} tested`);
console.log(`partial-param methods: ${partial.length}`);
console.log(`wrote ${path.relative(ROOT, OUT)}`);

function pct(a, b) { return b === 0 ? "—" : `${Math.round((a / b) * 100)}%`; }
