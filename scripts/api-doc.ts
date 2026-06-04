/**
 * Generates `doc/api.md` from `src/telegram.ts`.
 *
 * A deliberately small, dependency-free alternative to TypeDoc: it walks the
 * `TelegramBot` class with the TypeScript compiler API (syntax only, no type
 * checker) and emits a focused, jsdoc2md-style API reference - a table of
 * contents plus one section per public method (signature, return, a link to
 * the matching Telegram Bot API method, and a parameter table).
 *
 * It documents ONLY the public surface of the class: no inherited EventEmitter
 * members, no "Defined in" source links, and no dump of the generated request/
 * reply types.
 *
 * Runtime-agnostic: uses only `node:fs/promises` and the `typescript` package,
 * so it runs under both `bun scripts/api-doc.ts` and `node scripts/api-doc.ts`
 * (Node >=23.6 / 24 strips the TypeScript types natively). See the
 * `generate:docs` npm script.
 */
import { readFile, writeFile } from "node:fs/promises";
import ts from "typescript";

const SRC = "src/telegram.ts";
const OUT = "doc/api.md";
const API_BASE = "https://core.telegram.org/bots/api";

const source = await readFile(SRC, "utf8");
const sf = ts.createSourceFile(SRC, source, ts.ScriptTarget.Latest, true);

// --- Type prettifying -------------------------------------------------------
// Map a written TypeScript type to the human-friendly tokens the old api.md
// used (`Number`, `String`, `Object`, ...). Unknown object types collapse to
// `Object` so the reference stays readable rather than echoing internal names.
function mapToken(raw: string): string[] {
  const t = raw.trim();
  if (!t || t === "null" || t === "undefined" || t === "void") return [];
  if (t === "string") return ["String"];
  if (t === "number") return ["Number"];
  if (t === "boolean") return ["Boolean"];
  if (t === "RegExp") return ["RegExp"];
  if (t === "ChatId") return ["Number", "String"];
  if (t === "InputFile" || t === "FileInput") return ["String", "Stream", "Buffer"];
  if (t === "Buffer") return ["Buffer"];
  if (/^(Readable|ReadableStream|Stream)$/.test(t) || /Readable/.test(t)) return ["Stream"];
  if (t.endsWith("[]") || /^(Readonly)?Array</.test(t)) return ["Array"];
  if (t.includes("=>")) return ["function"];
  return ["Object"];
}

// Split a union type at the top level only (ignore `|` nested inside <...>).
function splitUnion(t: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of t) {
    if (ch === "<" || ch === "(" || ch === "{" || ch === "[") depth++;
    else if (ch === ">" || ch === ")" || ch === "}" || ch === "]") depth--;
    if (ch === "|" && depth === 0) {
      parts.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur) parts.push(cur);
  return parts;
}

function unique(arr: string[]): string[] {
  return [...new Set(arr)];
}

function displayType(typeText: string | undefined, optionsBag = false): string {
  if (optionsBag) return "Object";
  const t = (typeText ?? "").replace(/\s+/g, " ").trim();
  if (!t) return "Object";
  const tokens = unique(splitUnion(t).flatMap(mapToken));
  return tokens.length ? tokens.join(" \\| ") : "Object";
}

function displayReturn(typeText: string | undefined): string {
  const t = (typeText ?? "").replace(/\s+/g, " ").trim();
  if (!t || t === "void") return "";
  if (t.startsWith("Promise")) return "Promise";
  if (/Readable/.test(t)) return "stream.Readable";
  const tokens = unique(splitUnion(t).flatMap(mapToken));
  return tokens.length ? tokens.join(" \\| ") : "Object";
}

// --- Method model -----------------------------------------------------------
interface Param {
  name: string;
  display: string; // name shown in signatures/tables (`form` bag -> `options`)
  type: string;
  optional: boolean;
  description: string;
}
interface MethodDoc {
  name: string;
  params: Param[];
  ret: string;
  api?: string; // matching Telegram Bot API method name, if any
  summary: string;
}

function isPublic(m: ts.HasModifiers): boolean {
  const mods = ts.getModifiers(m) ?? [];
  return !mods.some(
    (mod) => mod.kind === ts.SyntaxKind.PrivateKeyword || mod.kind === ts.SyntaxKind.ProtectedKeyword,
  );
}

function jsDocOf(node: ts.Node): { summary: string; params: Record<string, string> } {
  const docs = (node as unknown as { jsDoc?: ts.JSDoc[] }).jsDoc;
  const params: Record<string, string> = {};
  if (!docs?.length) return { summary: "", params };
  const jd = docs[docs.length - 1]!;
  const summary = ts.getTextOfJSDocComment(jd.comment) ?? "";
  for (const tag of jd.tags ?? []) {
    if (ts.isJSDocParameterTag(tag)) {
      params[tag.name.getText(sf)] = ts.getTextOfJSDocComment(tag.comment) ?? "";
    }
  }
  return { summary, params };
}

// The Telegram method name is the first string literal passed to the request
// helpers (`this._form("sendMessage", ...)`), giving an exact docs anchor.
function apiMethodName(m: ts.MethodDeclaration): string | undefined {
  if (!m.body) return undefined;
  const match = m.body.getText(sf).match(/this\._(?:form|sendFile|request)\(\s*["']([^"']+)["']/);
  return match?.[1];
}

function isOptionsBag(p: ts.ParameterDeclaration): boolean {
  const t = p.type?.getText(sf) ?? "";
  return /Params\b/.test(t) || t === "{}" || (!!p.initializer && /^[A-Z]\w*(Meta|Options)$/.test(t));
}

function paramDescription(name: string, optionsBag: boolean, fromDoc: string): string {
  if (fromDoc) return fromDoc;
  if (optionsBag) return name === "fileOptions" ? "Additional file options" : "Additional Telegram query options";
  return "";
}

function buildMethod(m: ts.MethodDeclaration): MethodDoc {
  const { summary, params: paramDocs } = jsDocOf(m);
  const params: Param[] = m.parameters.map((p) => {
    const name = p.name.getText(sf);
    const bag = isOptionsBag(p);
    const optional = bag || !!p.initializer || !!p.questionToken;
    return {
      name,
      display: bag && name === "form" ? "options" : name,
      type: displayType(p.type?.getText(sf), bag),
      optional,
      description: paramDescription(name, bag, paramDocs[name] ?? ""),
    };
  });
  return {
    name: m.name.getText(sf),
    params,
    ret: displayReturn(m.type?.getText(sf)),
    api: apiMethodName(m),
    summary,
  };
}

// --- Collect ----------------------------------------------------------------
let cls: ts.ClassDeclaration | undefined;
sf.forEachChild((n) => {
  if (ts.isClassDeclaration(n) && n.name?.text === "TelegramBot") cls = n;
});
if (!cls) throw new Error("TelegramBot class not found in " + SRC);

const methods = new Map<string, MethodDoc>();
const staticProps: { name: string; type: string }[] = [];
let ctor: ts.ConstructorDeclaration | undefined;

for (const member of cls.members) {
  const isStatic = (ts.getModifiers(member as ts.HasModifiers) ?? []).some(
    (mod) => mod.kind === ts.SyntaxKind.StaticKeyword,
  );
  if (ts.isConstructorDeclaration(member) && member.body) {
    ctor = member;
  } else if (ts.isPropertyDeclaration(member) && isStatic && isPublic(member)) {
    const name = member.name.getText(sf);
    if (!name.startsWith("_")) staticProps.push({ name, type: displayType(member.type?.getText(sf)) });
  } else if (ts.isMethodDeclaration(member) && isPublic(member)) {
    const name = member.name.getText(sf);
    if (name.startsWith("_")) continue;
    // Prefer the implementation (the declaration that has a body) over overloads.
    if (methods.has(name) && !member.body) continue;
    methods.set(name, buildMethod(member));
  }
}
const methodList = [...methods.values()];

// --- Render -----------------------------------------------------------------
const anchor = (name: string) => `TelegramBot+${name}`;
const seeLink = (api?: string) => (api ? `${API_BASE}#${api.toLowerCase()}` : undefined);
const sig = (d: MethodDoc) => d.params.map((p) => (p.optional ? `[${p.display}]` : p.display)).join(", ");
const arrow = (ret: string) => (ret ? ` ⇒ <code>${ret}</code>` : "");

const out: string[] = [];
out.push("# API Reference");
out.push("");
out.push(
  "**Note:** If you are looking for available [events](usage.md#events) or usage of api, please refer [`usage.md`](usage.md).",
);
out.push("");
out.push(`> Generated from \`${SRC}\` by \`scripts/api-doc.ts\` - do not edit by hand.`);
out.push("");

// Table of contents
out.push('<a name="TelegramBot"></a>');
out.push("");
out.push("## TelegramBot");
out.push("");
out.push("**Kind**: global class");
out.push("");
out.push(`**See**: ${API_BASE}`);
out.push("");
out.push("* [TelegramBot](#TelegramBot)");
out.push("    * [new TelegramBot(token, [options])](#new_TelegramBot_new)");
out.push("    * _instance_");
for (const d of methodList) {
  out.push(`        * [.${d.name}(${sig(d)})](#${anchor(d.name)})${arrow(d.ret)}`);
}
if (staticProps.length) {
  out.push("    * _static_");
  for (const p of staticProps) {
    out.push(`        * [.${p.name}](#TelegramBot.${p.name}) : <code>${p.type}</code>`);
  }
}
out.push("");

// Constructor
out.push('<a name="new_TelegramBot_new"></a>');
out.push("");
out.push("### new TelegramBot(token, [options])");
const ctorDoc = ctor ? jsDocOf(ctor) : { summary: "", params: {} as Record<string, string> };
if (ctorDoc.summary) out.push(ctorDoc.summary);
out.push("");
out.push("| Param | Type | Description |");
out.push("| --- | --- | --- |");
out.push("| token | <code>String</code> | Telegram Bot API token |");
out.push("| [options] | <code>Object</code> | Constructor options (polling, webHook, baseApiUrl, ...) |");
out.push("");

// Members
for (const d of methodList) {
  out.push(`<a name="${anchor(d.name)}"></a>`);
  out.push("");
  out.push(`### telegramBot.${d.name}(${sig(d)})${arrow(d.ret)}`);
  if (d.summary) out.push(d.summary);
  out.push("");
  const meta = ["**Kind**: instance method of [<code>TelegramBot</code>](#TelegramBot)"];
  if (d.ret) meta.push(`**Returns**: <code>${d.ret}</code>`);
  const link = seeLink(d.api);
  if (link) meta.push(`**See**: ${link}`);
  out.push(meta.join("\n\n"));
  out.push("");
  if (d.params.length) {
    out.push("| Param | Type | Description |");
    out.push("| --- | --- | --- |");
    for (const p of d.params) {
      const label = p.optional ? `[${p.display}]` : p.display;
      out.push(`| ${label} | <code>${p.type}</code> | ${p.description} |`);
    }
    out.push("");
  }
}

out.push("* * *");
out.push("");

await writeFile(OUT, out.join("\n"));
console.log(`Wrote ${OUT}: ${methodList.length} methods, ${staticProps.length} static props.`);
