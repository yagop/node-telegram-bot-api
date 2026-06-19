/**
 * Generate the API reference in two stages:
 *
 *   Stage 1: TypeDoc  ->  doc/api.json   (the full serialized project reflection)
 *   Stage 2: JSON     ->  doc/api.md     (a single human-readable Markdown reference)
 *
 * Why two stages: TypeDoc owns type-graph parsing (generics, unions, literal
 * types, cross-references), and our small renderer owns presentation. The JSON
 * stays on disk (gitignored) as an inspectable intermediate. TypeDoc's public
 * `ReflectionKind` enum is imported so the kind numbers track the installed
 * version rather than being hardcoded.
 *
 * Run with: `npm run generate:docs` (== `bun scripts/generate-docs.ts`).
 */
import { Application, ReflectionKind } from "typedoc";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const ENTRY_POINTS = ["src/core/index.ts", "src/node/index.ts"];
const TSCONFIG = "tsconfig.json";
const JSON_OUT = "doc/api.json";
const MD_OUT = "doc/api.md";
const BASE_URL = "https://core.telegram.org/bots/api";

// ---------------------------------------------------------------- Stage 1 ----

const app = await Application.bootstrap({
  entryPoints: ENTRY_POINTS,
  tsconfig: TSCONFIG,
  excludePrivate: true,
  excludeProtected: true,
  excludeInternal: true,
  readme: "none",
  name: "node-telegram-bot-api",
});
const project = await app.convert();
if (!project) {
  console.error("TypeDoc failed to convert the project (see warnings above).");
  process.exit(1);
}
await app.generateJson(project, JSON_OUT);

// ---------------------------------------------------------------- Stage 2 ----

type Obj = Record<string, any>;
const doc: Obj = JSON.parse(await readFile(JSON_OUT, "utf8"));
const K = ReflectionKind;

// Collect concrete exported declarations (deduped by name, re-export References
// skipped) by walking through any Module/Namespace/Project wrappers.
const seen = new Set<string>();
const collected: Obj[] = [];
function collect(node: Obj): void {
  for (const c of node.children || []) {
    if (c.kind === K.Reference) continue;
    if (
      [K.Class, K.Interface, K.Function, K.Enum, K.Variable, K.TypeAlias].includes(c.kind) &&
      c.name &&
      !seen.has(c.name)
    ) {
      seen.add(c.name);
      collected.push(c);
    }
    if ([K.Project, K.Module, K.Namespace].includes(c.kind)) collect(c);
  }
}
collect(doc);

const byName = <T extends Obj>(arr: T[]) => arr.slice().sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
const classes = byName(collected.filter((c) => c.kind === K.Class));
const interfaces = byName(collected.filter((c) => c.kind === K.Interface));
const functions = byName(collected.filter((c) => c.kind === K.Function));
const enums = byName(collected.filter((c) => c.kind === K.Enum));
const variables = byName(collected.filter((c) => c.kind === K.Variable));
const aliases = byName(collected.filter((c) => c.kind === K.TypeAlias));

// GitHub heading anchor (GFM): lowercase, drop punctuation EXCEPT word chars /
// spaces / hyphens (underscores are kept), spaces -> hyphens. Keeping underscores
// matters here: `UPDATE_TYPES` anchors to `#update_types`, not `#update-types`.
const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
const known = new Set(collected.map((c) => c.name));
const linkRef = (name: string) => (known.has(name) ? `[${name}](#${slug(name)})` : name);
const hasSep = (s: string) => s.includes(" | ") || s.includes(" & ") || s.includes(" => ");
const paren = (s: string) => (hasSep(s) ? `(${s})` : s);
const escCell = (s: string) => (s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");

// Type -> string. `inline` collapses object literals to a single line; when
// false, object literals are pretty-printed (used for fenced type blocks).
function renderType(t: Obj | undefined, inline = true, indent = ""): string {
  if (!t) return "";
  switch (t.type) {
    case "intrinsic":
      return t.name;
    case "literal":
      if (t.value === null) return "null";
      return typeof t.value === "string" ? JSON.stringify(t.value) : String(t.value);
    case "array":
      return `${paren(renderType(t.elementType, inline, indent))}[]`;
    case "union":
      return (t.types || []).map((x: Obj) => renderType(x, inline, indent)).join(" | ");
    case "intersection":
      return (t.types || []).map((x: Obj) => renderType(x, inline, indent)).join(" & ");
    case "tuple":
      return `[${(t.elements || []).map((x: Obj) => renderType(x, inline, indent)).join(", ")}]`;
    case "namedTupleMember":
      return `${t.name}${t.isOptional ? "?" : ""}: ${renderType(t.elementType, inline, indent)}`;
    case "rest":
      return `...${paren(renderType(t.elementType, inline, indent))}[]`;
    case "typeOperator":
      return `${t.operator} ${renderType(t.target, inline, indent)}`;
    case "predicate":
      return `${t.asserts ? "asserts " : ""}${t.name}${t.targetType ? ` is ${renderType(t.targetType, inline, indent)}` : ""}`;
    case "query":
      return `typeof ${renderType(t.queryType, inline, indent)}`;
    case "indexedAccess":
      return `${paren(renderType(t.objectType, inline, indent))}[${renderType(t.indexType, inline, indent)}]`;
    case "conditional":
      return `${renderType(t.checkType, inline, indent)} extends ${renderType(t.extendsType, inline, indent)} ? ${renderType(t.trueType, inline, indent)} : ${renderType(t.falseType, inline, indent)}`;
    case "inferred":
      return `infer ${t.name}`;
    case "reference": {
      let s = linkRef(t.name ?? "");
      if (t.typeArguments?.length) s += `<${t.typeArguments.map((x: Obj) => renderType(x, inline, indent)).join(", ")}>`;
      return s;
    }
    case "reflection":
      return renderDeclType(t.declaration, inline, indent);
    case "mapped":
      // TypeDoc shape: { parameter, parameterType, templateType, readonlyModifier?,
      // optionalModifier?, nameType? }. Render the templateType as the value, with
      // the optional modifiers inlined so `{ +readonly [P in K]?: V }` survives.
      return `{ ${t.readonlyModifier ? `${t.readonlyModifier}readonly ` : ""}[${t.parameter ?? "K"} in ${renderType(t.parameterType, inline, indent)}]${t.optionalModifier ? `${t.optionalModifier}?` : ""}: ${renderType(t.templateType, inline, indent)} }`;
    case "template-literal": {
      // TypeDoc shape: { head: string, tail: [[type, sep], ...] }. Each tail
      // entry is a substitution type followed by its literal separator.
      let s = `\`${t.head ?? ""}`;
      for (const [sub, sep] of t.tail || []) s += `\${${renderType(sub, inline, indent)}}${sep ?? ""}`;
      return `${s}\``;
    }
    case "unknown":
      return t.name || "unknown";
    default:
      return t.name || "";
  }
}

function fieldSig(m: Obj, indent = ""): string {
  const ro = m.flags?.isReadonly ? "readonly " : "";
  const rest = m.flags?.isRest ? "..." : "";
  const opt = m.flags?.isOptional ? "?" : "";
  return `${ro}${rest}${m.name}${opt}: ${renderType(m.type, true, indent)}`;
}

function renderDeclType(decl: Obj | undefined, inline: boolean, indent: string): string {
  if (!decl) return "{}";
  if (decl.signatures?.length) {
    const sig = decl.signatures[0];
    const params = (sig.parameters || []).map((p: Obj) => fieldSig(p)).join(", ");
    return `(${params}) => ${renderType(sig.type, inline, indent)}`;
  }
  if (decl.children?.length) {
    const fields: Obj[] = decl.children;
    if (inline) return `{ ${fields.map((m: Obj) => fieldSig(m)).join("; ")} }`;
    const inner = `${indent}  `;
    const lines = fields.map((m: Obj) => `${inner}${fieldSig(m, inner)};`);
    return `{\n${lines.join("\n")}\n${indent}}`;
  }
  if (decl.indexSignature) {
    const is = Array.isArray(decl.indexSignature) ? decl.indexSignature[0] : decl.indexSignature;
    const key = (is.parameters || []).map((p: Obj) => `[${p.name}: ${renderType(p.type, inline, indent)}]`).join(", ");
    return `{ ${key}: ${renderType(is.type, inline, indent)} }`;
  }
  return "{}";
}

// alias body -> readable right-hand side (handles object aliases that expose
// `children` directly, scalar/union aliases that expose `type`, and function-typed aliases)
// alias/variable body -> readable right-hand side. `block` pretty-prints object
// literals across multiple lines (used inside fenced ```ts blocks).
function aliasRhs(a: Obj, block = false): string {
  if (a.children?.length) return renderDeclType(a, !block, "");
  if (a.signatures?.length) return renderDeclType(a, !block, "");
  return renderType(a.type, !block, "");
}

function renderPart(p: Obj): string {
  if (p.kind === "inline-tag") {
    if (p.tag === "@link" || p.tag === "@linkplain") {
      const text = p.text || "";
      if (typeof p.target === "string" && /^https?:/.test(p.target)) return `[${text || p.target}](${p.target})`;
      return text;
    }
    return "";
  }
  if (p.kind === "relative-link") return "";
  return p.text || "";
}
const renderSummary = (comment: Obj | undefined) =>
  comment?.summary?.map(renderPart).join("").trim() || "";

function telegramLink(comment: Obj | undefined): string | null {
  for (const p of comment?.summary || []) {
    if (p.tag === "@link" && typeof p.target === "string" && p.target.startsWith(BASE_URL)) return p.target;
  }
  return null;
}

// Members of a class/interface, grouped by kind.
const membersOf = (r: Obj) => r.children || [];
const methodsOf = (r: Obj) => membersOf(r).filter((m: Obj) => m.kind === K.Method || m.kind === K.Function);
const propsOf = (r: Obj) => membersOf(r).filter((m: Obj) => m.kind === K.Property || m.kind === K.Accessor);

// --- emitters ---

function emitClass(c: Obj): string {
  const out: string[] = [];
  out.push(`### \`${c.name}\``);
  const sum = renderSummary(c.comment);
  if (sum) out.push("", sum);
  const sigsOf = (m: Obj) => m.signatures || [];
  const methods = methodsOf(c);
  if (methods.length) {
    out.push("", "#### Methods", "", "| Method | Params | Returns | Bot API |", "| --- | --- | --- | --- |");
    for (const m of methods) {
      const sig = sigsOf(m)[0];
      if (!sig) continue;
      const params = (sig.parameters || [])
        .map((p: Obj) => `\`${p.flags?.isRest ? "..." : ""}${p.name}${p.flags?.isOptional ? "?" : ""}\`: ${escCell(renderType(p.type, true))}`)
        .join(", ");
      const ret = escCell(renderType(sig.type, true));
      const link = telegramLink(sig.comment || m.comment);
      out.push(`| \`${m.name}\` | ${params || "-"} | ${ret || "void"} | ${link ? `[${m.name}](${link})` : "-"} |`);
    }
  }
  const props = propsOf(c);
  if (props.length) {
    out.push("", "#### Properties", "", "| Property | Type |", "| --- | --- |");
    for (const p of props) {
      // Accessor .getSignature is a single signature object in TypeDoc 0.28
      // (not an array), and the accessor has no own .type; guard both shapes.
      // escCell is mandatory: accessor types are unions like `T | undefined`
      // whose raw `|` would split the table cell.
      const acc = Array.isArray(p.getSignature) ? p.getSignature[0]?.type : p.getSignature?.type;
      const ty = escCell(renderType(acc ?? p.type, true)) || "void";
      out.push(`| \`${p.name}\`${p.flags?.isOptional ? "?" : ""} | ${ty} |`);
    }
  }
  return out.join("\n");
}

function emitFunction(f: Obj): string {
  const out: string[] = [];
  const sig = f.signatures?.[0];
  out.push(`### \`${f.name}()\``);
  const sum = renderSummary(sig?.comment || f.comment);
  if (sum) out.push("", sum);
  const params = sig?.parameters || [];
  if (params.length) {
    out.push("", "| Param | Type |", "| --- | --- |");
    for (const p of params) out.push(`| \`${p.flags?.isRest ? "..." : ""}${p.name}${p.flags?.isOptional ? "?" : ""}\` | ${escCell(renderType(p.type, true)) || "void"} |`);
  }
  const ret = renderType(sig?.type, true);
  out.push("", `**Returns:** ${ret || "void"}`);
  return out.join("\n");
}

function emitInterface(i: Obj): string {
  const out: string[] = [];
  out.push(`### \`${i.name}\``);
  const sum = renderSummary(i.comment);
  if (sum) out.push("", sum);
  const props = propsOf(i);
  const calls = membersOf(i).filter((m: Obj) => m.kind === K.CallSignature);
  if (props.length) {
    out.push("", "| Property | Type |", "| --- | --- |");
    for (const p of props) out.push(`| \`${p.name}\`${p.flags?.isOptional ? "?" : ""} | ${escCell(renderType(p.type, true)) || "void"} |`);
  }
  if (calls.length) {
    out.push("", "**Call signature:**", "");
    for (const s of calls) {
      const params = (s.parameters || []).map((p: Obj) => `\`${p.name}\`: ${escCell(renderType(p.type, true))}`).join(", ");
      out.push(`\`(${params}) => ${escCell(renderType(s.type, true))}\``);
    }
  }
  return out.join("\n");
}

function emitEnum(e: Obj): string {
  const out: string[] = [];
  out.push(`### \`${e.name}\``);
  const members = membersOf(e).filter((m: Obj) => m.kind === K.EnumMember);
  if (members.length) {
    out.push("", "| Member | Value |", "| --- | --- |");
    for (const m of members) {
      const v = m.type?.type === "literal" ? renderType(m.type) : m.defaultValue ?? "";
      out.push(`| \`${m.name}\` | ${v || "-"} |`);
    }
  }
  return out.join("\n");
}

// Self-tests for the renderers that the current public surface never exercises
// (mapped / template-literal / conditional). Run with `bun test test/unit/generate-docs.test.ts`.
// TypeDoc JSON node shapes are documented at:
//   mapped         { parameter, parameterType, templateType, readonlyModifier?, optionalModifier?, nameType? }
//   template-lit   { head: string, tail: [[type, string], ...] }
//   conditional    { checkType, extendsType, trueType, falseType }
export const __test = { renderType, slug, byName };

// ---------------------------------------------------------------- assemble ---

const md: string[] = [];
md.push("# node-telegram-bot-api - API reference");
md.push("");
md.push(
  "Auto-generated by `scripts/generate-docs.ts` from the TypeScript source via [TypeDoc](https://typedoc.org). Regenerate with `npm run generate:docs`. Every `Api` method links to its [Bot API](https://core.telegram.org/bots/api) page.",
);
md.push("");
md.push("## Contents");
md.push("");
const toc: string[] = [];
if (classes.length) toc.push("- [Classes](#classes)");
if (functions.length) toc.push("- [Functions](#functions)");
if (interfaces.length) toc.push("- [Interfaces](#interfaces)");
if (enums.length) toc.push("- [Enums](#enums)");
if (aliases.length) toc.push("- [Type aliases](#type-aliases)");
if (variables.length) toc.push("- [Variables](#variables)");
md.push(...toc);

const section = (title: string, items: Obj[], emit: (x: Obj) => string) => {
  if (!items.length) return;
  md.push("", `## ${title}`, "");
  for (const it of items) md.push("", emit(it));
};
section("Classes", classes, emitClass);
section("Functions", functions, emitFunction);
section("Interfaces", interfaces, emitInterface);
section("Enums", enums, emitEnum);

// Aliases and variables are emitted as headings (not table rows) so the
// cross-reference links rendered in method/property tables resolve.
if (aliases.length) {
  md.push("", "## Type aliases");
  for (const a of aliases) {
    md.push("", `### \`${a.name}\``);
    const sum = renderSummary(a.comment);
    if (sum) md.push("", sum);
    md.push("", "```ts", `type ${a.name} = ${aliasRhs(a, true)};`, "```");
  }
}
if (variables.length) {
  md.push("", "## Variables");
  for (const v of variables) {
    md.push("", `### \`${v.name}\``);
    const sum = renderSummary(v.comment);
    if (sum) md.push("", sum);
    md.push("", "```ts", `const ${v.name}: ${renderType(v.type, false)};`, "```");
  }
}
md.push("");

await mkdir("doc", { recursive: true });
await writeFile(MD_OUT, md.join("\n"));

console.log(`\u2713 wrote ${JSON_OUT}`);
console.log(`\u2713 wrote ${MD_OUT}`);
console.log(`  classes:    ${classes.length}`);
console.log(`  functions:  ${functions.length}`);
console.log(`  interfaces: ${interfaces.length}`);
console.log(`  enums:      ${enums.length}`);
console.log(`  aliases:    ${aliases.length}`);
console.log(`  variables:  ${variables.length}`);
