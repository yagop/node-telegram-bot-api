/**
 * scripts/schemas-to-v2.ts — v2 type-shape generator (offline path).
 *
 * Reads the already-generated, v1-shaped `src/types/schemas.ts` and transforms
 * it into the v2 surface `src/types/generated-v2.ts`, per ADR-001/002/007:
 *
 *   (a) a DISCRIMINATED `Update` union — one variant per payload key
 *       (`(UpdateBase & { message: Message }) | …`) plus an `UpdateKind` union,
 *       instead of one all-optional object.
 *   (b) `Json<T>` aliases for the structured (object / array / object-union)
 *       fields of every `*Params` type — `reply_markup`, the `*_entities`
 *       family, `reply_parameters`, `link_preview_options`, `allowed_updates`,
 *       inline `results`, `commands`, `media`, … — exactly the fields the v1
 *       request pipeline JSON-stringifies. File-bearing fields (`InputFile`)
 *       are left raw so uploads still work.
 *   (c) a `BotApi` method map `{ <method>: (params?: <Method>Params) =>
 *       <Method>Result; … }` plus `MethodName`, `ParamsOf<M>`, `ResultOf<M>`.
 *
 * Why a transform and not a fresh fetch: the live docs (used by
 * `scripts/api-parser.ts`) are unreachable from the build sandbox, but
 * `schemas.ts` already encodes the full, docs-faithful surface — so we derive
 * v2 from it deterministically and offline.
 *
 * Run with:  bun scripts/schemas-to-v2.ts
 *
 * Constraints: only writes `src/types/generated-v2.ts`; never edits schemas.ts,
 * v2.ts, index.ts, or core/*.
 */

const IN = new URL("../src/types/schemas.ts", import.meta.url);
const OUT = new URL("../src/types/generated-v2.ts", import.meta.url);

const src = await Bun.file(IN).text();

// ---------------------------------------------------------------------------
// Tokenize schemas.ts into top-level `export type Name = …;` declarations.
//
// schemas.ts is machine-generated with a stable shape: every declaration is a
// top-level `export type <Name> = <body>;`, where <body> is either an object
// literal block, `Record<string, never>`, a union of identifiers, or a single
// identifier / `T[]`. We split on the `;` that terminates each declaration at
// brace-depth 0.
// ---------------------------------------------------------------------------

interface Field {
  name: string;
  optional: boolean;
  type: string;
}
interface Decl {
  name: string;
  /** raw RHS text (object block, union, alias, …), trimmed */
  body: string;
  /** parsed fields when the body is an object literal, else null */
  fields: Field[] | null;
}

function parseDecls(text: string): Decl[] {
  const decls: Decl[] = [];
  const re = /export\s+type\s+([A-Za-z0-9_]+)\s*=\s*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const name = m[1];
    let i = re.lastIndex;
    let depth = 0;
    // Scan to the terminating top-level `;`.
    for (; i < text.length; i++) {
      const ch = text[i];
      if (ch === "{" || ch === "(" || ch === "[") depth++;
      else if (ch === "}" || ch === ")" || ch === "]") depth--;
      else if (ch === ";" && depth === 0) break;
    }
    const body = text.slice(re.lastIndex, i).trim();
    decls.push({ name, body, fields: parseObjectBody(body) });
    re.lastIndex = i + 1;
  }
  return decls;
}

/** Parse an object-literal RHS into fields; return null if it isn't one. */
function parseObjectBody(body: string): Field[] | null {
  if (!body.startsWith("{")) return null;
  const inner = body.slice(1, body.lastIndexOf("}"));
  const fields: Field[] = [];
  // Split member declarations on `;` at brace-depth 0 (handles nested
  // `{ … }` field types like InputProfilePhotoInput, though schemas.ts mostly
  // uses flat references).
  let depth = 0;
  let buf = "";
  const flush = () => {
    const s = buf.trim();
    buf = "";
    if (!s) return;
    const mm = s.match(/^([A-Za-z0-9_]+)(\?)?\s*:\s*([\s\S]+)$/);
    if (!mm) return;
    fields.push({ name: mm[1], optional: mm[2] === "?", type: mm[3].trim() });
  };
  for (const ch of inner) {
    if (ch === "{" || ch === "(" || ch === "[") depth++;
    else if (ch === "}" || ch === ")" || ch === "]") depth--;
    if (ch === ";" && depth === 0) {
      flush();
      continue;
    }
    buf += ch;
  }
  flush();
  return fields;
}

const decls = parseDecls(src);
const byName = new Map(decls.map((d) => [d.name, d]));

// ---------------------------------------------------------------------------
// Classify declarations.
// ---------------------------------------------------------------------------

const PRELUDE_NAMES = new Set([
  "ChatId",
  "ReplyMarkup",
  "InputProfilePhotoInput",
  "InputFile",
  "MessageType",
  "ParseMode",
]);

// Names of the runtime helpers schemas.ts exports as `const` (not types).
const RUNTIME_CONST_NAMES = new Set(["MESSAGE_TYPES", "UPDATE_TYPES"]);

const methodDecls = decls.filter((d) => /Params$/.test(d.name) && /^[A-Z]/.test(d.name));
// A "method" is any X with both XParams and XResult.
interface Method {
  /** camelCase wire name, e.g. sendMessage */
  wire: string;
  /** PascalCase, e.g. SendMessage */
  pascal: string;
  paramsName: string;
  resultName: string;
}
const methods: Method[] = [];
for (const d of methodDecls) {
  const pascal = d.name.replace(/Params$/, "");
  if (!byName.has(`${pascal}Result`)) continue;
  const wire = pascal.charAt(0).toLowerCase() + pascal.slice(1);
  methods.push({ wire, pascal, paramsName: d.name, resultName: `${pascal}Result` });
}

// Object types = declarations with a parsed object body, excluding *Params
// (which we re-emit with Json<T> wrapping) and the all-optional `Update`.
// Names emitted by a dedicated stage (method params/results, the hand-written
// prelude, the derived Update, the dropped runtime consts) — every decl-driven
// section below must skip these so each identifier is emitted exactly once.
const reserved = new Set<string>([
  ...methods.map((m) => m.paramsName),
  ...methods.map((m) => m.resultName),
  ...PRELUDE_NAMES,
  ...RUNTIME_CONST_NAMES,
  "Update",
]);
const isReserved = (d: Decl) => reserved.has(d.name);

const objectDecls = decls.filter((d) => d.fields !== null && !isReserved(d));
// Placeholder objects: `Record<string, never>`.
const placeholderDecls = decls.filter(
  (d) => d.body === "Record<string, never>" && d.fields === null && !isReserved(d),
);
// Union aliases: `A | B | C` (all identifiers) and not an object/placeholder.
const unionDecls = decls.filter(
  (d) =>
    !isReserved(d) &&
    d.fields === null &&
    d.body !== "Record<string, never>" &&
    d.body.includes("|") &&
    !d.body.includes("{") &&
    /^[A-Za-z0-9_|\s]+$/.test(d.body),
);
// Anything left over that we haven't placed yet (defensive; usually empty).
const placedNames = new Set<string>([
  ...objectDecls.map((d) => d.name),
  ...placeholderDecls.map((d) => d.name),
  ...unionDecls.map((d) => d.name),
]);
const aliasDecls = decls.filter(
  (d) =>
    !isReserved(d) &&
    !placedNames.has(d.name) &&
    // Drop aliases that depend on the v1 runtime consts we intentionally don't
    // carry over (e.g. `UpdateType = (typeof UPDATE_TYPES)[number]`); v2 emits
    // its own `UpdateKind` + `UPDATE_KINDS` instead.
    ![...RUNTIME_CONST_NAMES].some((c) => new RegExp(`\\b${c}\\b`).test(d.body)),
);

// The set of "structured object-ish" type names: anything that is a documented
// object / union / placeholder. A field whose type references one of these
// (and is NOT a file upload) is JSON-serialized on the wire → wrap in Json<T>.
const objectish = new Set<string>([
  ...objectDecls.map((d) => d.name),
  ...placeholderDecls.map((d) => d.name),
  ...unionDecls.map((d) => d.name),
]);

// ---------------------------------------------------------------------------
// Json<T> wrapping for *Params fields.
// ---------------------------------------------------------------------------

/** Does this field type reference any structured object/union type? */
function referencesObjectish(type: string): boolean {
  const ids = type.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? [];
  return ids.some((id) => objectish.has(id));
}

/** Does this field type carry an uploadable file (left raw, never serialized)? */
function hasInputFile(type: string): boolean {
  return /\bInputFile\b/.test(type);
}

/**
 * Decide the v2 type for a *Params field.
 *
 * Rules (mirror the v1 `_fix*` request pipeline + ADR-002):
 *   - file-bearing fields (`InputFile…`) stay raw — uploads must not be
 *     JSON-stringified.
 *   - `reply_markup` → `Json<ReplyMarkup>` (collapse the 4-way union the docs
 *     spell out into the library's `ReplyMarkup` alias, matching v2.ts).
 *   - any other field that references a structured object/union, OR is an array
 *     of objects, OR is `allowed_updates` (string[] of update kinds) →
 *     `Json<innerT>`.
 *   - everything else (scalars, ChatId, plain string/number, InputFile) stays
 *     raw.
 */
function v2FieldType(field: Field): string {
  const t = field.type;
  if (hasInputFile(t)) return t; // upload slot — never serialized

  if (field.name === "reply_markup") return "Json<ReplyMarkup>";

  // `allowed_updates` is documented as `string[]` but is semantically a list of
  // update kinds; v2.ts types it `Json<UpdateKind[]>`.
  if (field.name === "allowed_updates" && /string\[\]$/.test(t)) {
    return "Json<UpdateKind[]>";
  }

  if (referencesObjectish(t)) return `Json<${t}>`;

  return t;
}

// ---------------------------------------------------------------------------
// Build the discriminated Update union from the v1 all-optional `Update`.
// ---------------------------------------------------------------------------

const updateDecl = byName.get("Update");
if (!updateDecl || !updateDecl.fields) {
  throw new Error("Could not find the `Update` object in schemas.ts");
}
const updateVariants = updateDecl.fields.filter((f) => f.name !== "update_id");
if (!updateVariants.length) throw new Error("`Update` has no payload fields");

// ---------------------------------------------------------------------------
// Emit.
// ---------------------------------------------------------------------------

const out: string[] = [];

out.push(`/* eslint-disable */
/**
 * AUTO-GENERATED by scripts/schemas-to-v2.ts — DO NOT EDIT BY HAND.
 *
 * v2 type shapes (ADR-001/002/007), transformed from src/types/schemas.ts:
 *   - a discriminated \`Update\` union (one variant per payload key)
 *   - \`Json<T>\` aliases for structured \`*Params\` fields (wire-ready strings)
 *   - the \`BotApi\` method map + \`MethodName\` / \`ParamsOf\` / \`ResultOf\`
 *
 * Regenerate with: bun scripts/schemas-to-v2.ts
 */

import type { Json } from "../core/json.js";
`);

// --- Library prelude (scalars + ReplyMarkup + InputFile + InputProfilePhotoInput).
out.push(`// ---------------------------------------------------------------------------
// Library-specific helpers (not 1:1 documented objects)
// ---------------------------------------------------------------------------

/** Chat identifier: numeric id or \`@username\`. */
export type ChatId = number | string;

/** Text formatting mode accepted by \`parse_mode\` fields. */
export type ParseMode = "Markdown" | "MarkdownV2" | "HTML";

/** Anything accepted in a file slot: file_id / URL (string) or local data. */
export type InputFile = string | Buffer | NodeJS.ReadableStream;

/** Union of the four reply-markup objects. */
export type ReplyMarkup =
  | InlineKeyboardMarkup
  | ReplyKeyboardMarkup
  | ReplyKeyboardRemove
  | ForceReply;

/**
 * Builder input for setMyProfilePhoto / setBusinessAccountProfilePhoto: the
 * photo/animation field accepts raw file data; the library attaches it.
 */
export type InputProfilePhotoInput =
  | { type: "static"; photo: InputFile }
  | { type: "animated"; animation: InputFile; main_frame_timestamp?: number };
`);

// --- Discriminated Update union.
out.push(`
// ---------------------------------------------------------------------------
// Discriminated \`Update\` union (one variant per payload key)
// ---------------------------------------------------------------------------

export interface UpdateBase {
  update_id: number;
}

export type Update =
${updateVariants.map((f) => `  | (UpdateBase & { ${f.name}: ${f.type} })`).join("\n")};

/** The payload key of every \`Update\` variant. */
export type UpdateKind =
${updateVariants.map((f) => `  | ${JSON.stringify(f.name)}`).join("\n")};

/** Runtime list of every dispatchable update kind (\`Update\` key). */
export const UPDATE_KINDS = [
${updateVariants.map((f) => `  ${JSON.stringify(f.name)},`).join("\n")}
] as const satisfies readonly UpdateKind[];
`);

// --- Objects.
out.push(`
// ---------------------------------------------------------------------------
// Objects
// ---------------------------------------------------------------------------
`);
for (const d of objectDecls) {
  out.push(`export type ${d.name} = ${d.body};\n`);
}

// --- Placeholder objects.
if (placeholderDecls.length) {
  out.push(`
// Placeholder objects (documented as holding no fields)
`);
  for (const d of placeholderDecls) out.push(`export type ${d.name} = Record<string, never>;\n`);
}

// --- Union ("one of") objects.
out.push(`
// ---------------------------------------------------------------------------
// Union ("one of") objects
// ---------------------------------------------------------------------------
`);
for (const d of unionDecls) out.push(`export type ${d.name} = ${d.body};\n`);

// --- Any remaining simple aliases (defensive; usually empty).
const extraAliases = aliasDecls.filter((d) => !PRELUDE_NAMES.has(d.name));
if (extraAliases.length) {
  out.push(`
// ---------------------------------------------------------------------------
// Other aliases
// ---------------------------------------------------------------------------
`);
  for (const d of extraAliases) out.push(`export type ${d.name} = ${d.body};\n`);
}

// --- Method params (Json<T>-wrapped) + results.
out.push(`
// ---------------------------------------------------------------------------
// Methods: request params (Json<T> for structured fields) + reply types
// ---------------------------------------------------------------------------
`);
for (const m of methods) {
  const pd = byName.get(m.paramsName)!;
  const rd = byName.get(m.resultName)!;
  if (pd.fields && pd.fields.length) {
    const body = pd.fields
      .map((f) => `  ${f.name}${f.optional ? "?" : ""}: ${v2FieldType(f)};`)
      .join("\n");
    out.push(`export type ${m.paramsName} = {\n${body}\n};`);
  } else {
    out.push(`export type ${m.paramsName} = Record<string, never>;`);
  }
  out.push(`export type ${m.resultName} = ${rd.body};\n`);
}

// --- BotApi method map + helpers.
out.push(`
// ---------------------------------------------------------------------------
// The generated method map
// ---------------------------------------------------------------------------
`);
out.push(`export interface BotApi {`);
for (const m of methods) {
  // A method takes optional params when EVERY field is optional (or it's empty).
  const pd = byName.get(m.paramsName)!;
  const allOptional = !pd.fields || pd.fields.length === 0 || pd.fields.every((f) => f.optional);
  const sep = allOptional ? "params?" : "params";
  out.push(`  ${m.wire}: (${sep}: ${m.paramsName}) => ${m.resultName};`);
}
out.push(`}`);
out.push(`
export type MethodName = keyof BotApi;
export type ParamsOf<M extends MethodName> = Parameters<BotApi[M]>[0];
export type ResultOf<M extends MethodName> = ReturnType<BotApi[M]>;
`);

await Bun.write(OUT, out.join("\n"));

// ---------------------------------------------------------------------------
// Report.
// ---------------------------------------------------------------------------

console.log(`✓ wrote ${OUT.pathname}`);
console.log(`  objects:        ${objectDecls.length}`);
console.log(`  placeholders:   ${placeholderDecls.length}`);
console.log(`  unions:         ${unionDecls.length}`);
console.log(`  extra aliases:  ${extraAliases.length}`);
console.log(`  methods:        ${methods.length}`);
console.log(`  Update variants:${updateVariants.length}`);
