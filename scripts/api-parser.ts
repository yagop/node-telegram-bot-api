/**
 * scripts/api-parser.ts - Telegram Bot API type generator.
 *
 * Fetches the live Bot API reference (https://core.telegram.org/bots/api),
 * walks the documentation with Bun's streaming `HTMLRewriter`, and emits
 * `src/types/schemas.ts` - plain TypeScript `type` aliases (no Zod, no runtime
 * validation) covering:
 *
 *   - every documented object as `export type Name = { ... }`
 *   - abstract "it can be one of ..." objects as union aliases
 *   - per method: `<Method>Params` (full request), `<Method>Options`
 *     (request minus the positional args `telegram.ts` passes explicitly), and
 *     `<Method>Result` (the reply type parsed from the method's prose)
 *
 * Run with:  bun scripts/api-parser.ts
 *
 * The generator is deliberately strict: any documented type string it cannot
 * map, or any method whose reply type it cannot resolve, is a hard error
 * (logged, non-zero exit) - it never falls back to `unknown`.
 */

const API_URL = "https://core.telegram.org/bots/api";
const OUT = new URL("../src/types/schemas.ts", import.meta.url);
const API_OUT = new URL("../src/core/api.ts", import.meta.url);

/** Keep generated output ASCII: replace any em dash (U+2014) / ellipsis (U+2026) that leaks in from doc text. */
const EM_DASH = String.fromCharCode(0x2014);
const ELLIPSIS = String.fromCharCode(0x2026);
const ascii = (s: string): string =>
  s.split(EM_DASH).join("-").split(ELLIPSIS).join("...");

// ---------------------------------------------------------------------------
// Record model - one entry per <h4> in #dev_page_content
// ---------------------------------------------------------------------------

interface Rec {
  name: string;
  desc: string;
  headers: string[];
  rows: string[][];
  liItems: string[];
  _pendingRow: boolean;
}

const records: Rec[] = [];
let cur: Rec | null = null;

function finalize() {
  if (!cur) return;
  cur.name = cur.name.trim();
  cur.desc = cur.desc.trim();
  if (/^[A-Za-z][A-Za-z0-9]*$/.test(cur.name)) records.push(cur);
  cur = null;
}

function lastCell(rec: Rec): string[] | null {
  return rec.rows.length ? rec.rows[rec.rows.length - 1] : null;
}

// ---------------------------------------------------------------------------
// Fetch + parse
// ---------------------------------------------------------------------------

const html = await fetch(API_URL).then((r) => r.text());

const rewriter = new HTMLRewriter()
  .on("#dev_page_content h4", {
    element() {
      finalize();
      cur = { name: "", desc: "", headers: [], rows: [], liItems: [], _pendingRow: false };
    },
    text(t) {
      if (cur) cur.name += t.text;
    },
  })
  .on("#dev_page_content p", {
    text(t) {
      if (cur) cur.desc += t.text;
    },
  })
  .on("#dev_page_content tr", {
    element() {
      if (cur) cur._pendingRow = true;
    },
  })
  .on("#dev_page_content th", {
    element() {
      if (cur) cur.headers.push("");
    },
    text(t) {
      if (cur && cur.headers.length) cur.headers[cur.headers.length - 1] += t.text;
    },
  })
  .on("#dev_page_content td", {
    element() {
      if (!cur) return;
      if (cur._pendingRow) {
        cur.rows.push([]);
        cur._pendingRow = false;
      }
      lastCell(cur)?.push("");
    },
    text(t) {
      if (!cur) return;
      const row = lastCell(cur);
      if (row && row.length) row[row.length - 1] += t.text;
    },
  })
  .on("#dev_page_content ul li", {
    element() {
      if (cur) cur.liItems.push("");
    },
    text(t) {
      if (cur && cur.liItems.length) cur.liItems[cur.liItems.length - 1] += t.text;
    },
  });

await rewriter.transform(new Response(html)).text();
finalize();

// ---------------------------------------------------------------------------
// Type mapping (Telegram type string → TypeScript)
// ---------------------------------------------------------------------------

const unmapped = new Set<string>();

function splitUnion(s: string): string[] {
  const t = s
    .replace(/,\s*and\s+/gi, ", ")
    .replace(/\s+and\s+/gi, ", ")
    .replace(/\s+or\s+/gi, ", ");
  return t.includes(",") ? t.split(",").map((x) => x.trim()).filter(Boolean) : [s.trim()];
}

function mapScalar(s: string): string {
  if (/^Integer$/.test(s)) return "number";
  if (/^Float( number)?$/.test(s)) return "number";
  if (/^String$/.test(s)) return "string";
  if (/^Boolean$/.test(s)) return "boolean";
  if (/^True$/.test(s)) return "true";
  // A bare `InputFile` always also accepts a file_id / URL string (ADR-006). This
  // is the one surviving param construct after ADR-002's reversal to plain params.
  if (/^InputFile$/.test(s)) return "InputFile | string";
  if (/^[A-Z][A-Za-z0-9]*$/.test(s)) return s; // reference to another type
  unmapped.add(s);
  return "never";
}

function mapType(raw: string): string {
  const s = raw.replace(/\s+/g, " ").trim();
  if (s.startsWith("Array of ")) {
    const inner = mapType(s.slice("Array of ".length));
    return /[ |]/.test(inner) ? `(${inner})[]` : `${inner}[]`;
  }
  const parts = splitUnion(s);
  if (parts.length > 1) return [...new Set(parts.map(mapType))].join(" | ");
  return mapScalar(s);
}

// ---------------------------------------------------------------------------
// File-target fields on `Input*` types (ADR-006)
// ---------------------------------------------------------------------------
//
// Under ADR-002's reversal (plain params, serialize in the pipeline) there is no
// param-only type transform: a param field is the SAME plain mapped type as a
// response field (one mapping path). The one exception is upload ergonomics: the
// nested file-target fields on the `Input*` types are documented "String" but also
// accept an uploaded `InputFile` (the encoder resolves it to `attach://`). Widen
// only those field NAMES, and only on `Input*` types - never `*.url`, venue/
// location coords, `photo_url`, or any response type.

const FILE_FIELDS = new Set([
  "media",
  "thumbnail",
  "photo",
  "cover",
  "animation",
  "video",
  "sticker",
]);

// ---------------------------------------------------------------------------
// Reply-type extraction from method prose
// ---------------------------------------------------------------------------

// Methods whose return prose the heuristic can't resolve cleanly. Each value is
// taken verbatim from the documentation wording.
const RETURN_OVERRIDES: Record<string, string> = {
  getUpdates: "Update[]",
  getMe: "User",
  getMyDefaultAdministratorRights: "ChatAdministratorRights",
  getUserProfilePhotos: "UserProfilePhotos",
  getUserProfileAudios: "UserProfileAudios",
  getStarTransactions: "StarTransactions",
  getMyStarBalance: "StarAmount",
  getBusinessAccountStarBalance: "StarAmount",
  getAvailableGifts: "Gifts",
  getBusinessAccountGifts: "OwnedGifts",
  getUserGifts: "OwnedGifts",
  getChatGifts: "OwnedGifts",
  getGameHighScores: "GameHighScore[]",
  savePreparedInlineMessage: "PreparedInlineMessage",
  savePreparedKeyboardButton: "PreparedInlineMessage",
  postStory: "Story",
  editStory: "Story",
  repostStory: "Story",
  getUserChatBoosts: "UserChatBoosts",
  getBusinessConnection: "BusinessConnection",
  getManagedBotToken: "BusinessConnection",
  getManagedBotAccessSettings: "BotAccessSettings",
  answerGuestQuery: "SentGuestMessage",
};

const unresolved: string[] = [];

function parseReturn(method: string, descRaw: string): string {
  if (RETURN_OVERRIDES[method]) return RETURN_OVERRIDES[method];
  const d = descRaw.replace(/\s+/g, " ").trim();

  if (/otherwise\s+True\s+is\s+returned/i.test(d) && /Message\s+is\s+returned/.test(d))
    return "Message | boolean";
  if (/[Aa]rray of MessageId/.test(d)) return "MessageId[]";

  // "(an) array of X object(s) ... is returned" / "Returns an Array of X"
  let m =
    d.match(/[Rr]eturns an Array of ([A-Z][A-Za-z]+)/) ||
    d.match(/[Aa]rray of ([A-Z][A-Za-z]+) objects?/);
  if (m) return `${m[1]}[]`;

  if (/MessageId of the .*is returned|Returns the MessageId/.test(d)) return "MessageId";
  if (/Message\s+is\s+returned|the sent Message|the edited Message|the stopped Message|in form of a Message/.test(d))
    return "Message";

  // "as (a) X object" - e.g. "the new invite link as ChatInviteLink object"
  m = d.match(/\bas (?:a |an )?([A-Z][A-Za-z]+) object/);
  if (m) return m[1];
  // "in form of a X object" / "(a|an) X object is returned" / "Returns a X object"
  m =
    d.match(/in form of (?:a|an) ([A-Z][A-Za-z]+) object/) ||
    d.match(/(?:a|an) ([A-Z][A-Za-z]+) object is returned/) ||
    d.match(/[Rr]eturns (?:a|an) ([A-Z][A-Za-z]+) object/);
  if (m) return m[1];
  // "the ... X (object) is returned"
  m = d.match(/the (?:new |uploaded |stopped |edited |sent |revoked |created )?([A-Z][A-Za-z]+) (?:object )?is returned/);
  if (m) return m[1];
  // "Returns X on success." / "Returns the uploaded X"
  m = d.match(/[Rr]eturns (?:the (?:new |edited |uploaded )?)?([A-Z][A-Za-z]+)(?: on success| objects?)?\b/);
  if (
    m &&
    !/^(True|False|Int|Integer|String|Boolean|Float|Bot|JSON|Use|On|If|It|Telegram|Currently|Array|An|A)$/.test(m[1])
  )
    return m[1];

  if (/invite link as String|as a? ?String\b/.test(d)) return "string";
  if (/Returns True|True is returned|returns? .*\btrue\b/i.test(d)) return "boolean";
  if (/Returns .*\bString\b/.test(d)) return "string";
  if (/Returns .*\bInt(?:eger)?\b/.test(d)) return "number";

  unresolved.push(method);
  return "boolean";
}

// ---------------------------------------------------------------------------
// Classify records
// ---------------------------------------------------------------------------

interface Field {
  name: string;
  type: string;
  optional: boolean;
}

interface TypeDef {
  name: string;
  fields: Field[];
}
interface UnionDef {
  name: string;
  members: string[];
}
interface MethodDef {
  name: string;
  fields: Field[];
  ret: string;
}

const types: TypeDef[] = [];
const unions: UnionDef[] = [];
const methods: MethodDef[] = [];
const emptyTypeCandidates: string[] = [];

function colIndices(headers: string[]) {
  const h = headers.map((x) => x.trim().toLowerCase());
  return {
    name: h.findIndex((x) => x === "field" || x === "parameter"),
    type: h.indexOf("type"),
    required: h.indexOf("required"),
    desc: h.indexOf("description"),
  };
}

function fieldsFromRows(rec: Rec, isMethod: boolean): Field[] {
  const c = colIndices(rec.headers);
  return rec.rows.map((row) => {
    const fname = (row[c.name] ?? "").trim();
    // One mapping path for params AND response objects: plain mapped types. Params
    // are serialized in the pipeline (ADR-002 -> Option-D), not pre-branded.
    let type = mapType(row[c.type] ?? "");
    // Upload ergonomics: a documented-"String" file-target field on an `Input*` type
    // also accepts an `InputFile` (resolved to attach:// in the encoder).
    if (rec.name.startsWith("Input") && FILE_FIELDS.has(fname) && type === "string") {
      type = "InputFile | string";
    }
    const optional = isMethod
      ? (row[c.required] ?? "").trim() !== "Yes"
      : /^Optional\b/.test((row[c.desc] ?? "").trim());
    return { name: fname, type, optional };
  });
}

for (const rec of records) {
  const isMethod = /^[a-z]/.test(rec.name);
  if (isMethod) {
    methods.push({
      name: rec.name,
      fields: rec.rows.length ? fieldsFromRows(rec, true) : [],
      ret: parseReturn(rec.name, rec.desc),
    });
  } else if (rec.rows.length) {
    types.push({ name: rec.name, fields: fieldsFromRows(rec, false) });
  } else if (
    rec.liItems.length >= 2 &&
    rec.liItems.every((x) => /^[A-Z][A-Za-z0-9]*$/.test(x.trim()))
  ) {
    // No field table, but a bullet list of type-name links → "one of" union.
    unions.push({ name: rec.name, members: rec.liItems.map((x) => x.trim()).filter(Boolean) });
  } else {
    emptyTypeCandidates.push(rec.name);
  }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------------------------------------------------------------------------
// Emit
// ---------------------------------------------------------------------------

// `InputFile` is NOT listed here: it is no longer defined in schemas.ts; it is
// imported from the Phase-1 core class (../core/files.js). It is therefore still
// a "known" name for the empty-object filter, handled separately below.
const PRELUDE_NAMES = new Set([
  "ChatId",
  "ReplyMarkup",
  "InputProfilePhotoInput",
  "ParseMode",
]);

const PRELUDE = `// ---------------------------------------------------------------------------
// Library-specific helpers (not 1:1 documented objects)
// ---------------------------------------------------------------------------

/** Chat identifier: numeric id or \`@username\`. */
export type ChatId = number | string;

/** Text formatting mode accepted by \`parse_mode\` fields. */
export type ParseMode = "Markdown" | "MarkdownV2" | "HTML";

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
`;

function emitFields(fields: Field[]): string {
  if (!fields.length) return "Record<string, never>";
  const body = fields
    .map((f) => `  ${f.name}${f.optional ? "?" : ""}: ${f.type};`)
    .join("\n");
  return `{\n${body}\n}`;
}

// Names that are referenced as a field/param type but have no own definition
// (placeholder objects like CallbackGame) → emitted as empty objects.
const defined = new Set<string>([
  ...types.map((t) => t.name),
  ...unions.map((u) => u.name),
  ...PRELUDE_NAMES,
  "InputFile", // imported from ../core/files.js, not emitted as a placeholder
]);
const referenced = new Set<string>();
const collect = (ts: string) =>
  ts.match(/[A-Z][A-Za-z0-9]*/g)?.forEach((n) => referenced.add(n));
for (const t of types) t.fields.forEach((f) => collect(f.type));
for (const m of methods) {
  m.fields.forEach((f) => collect(f.type));
  collect(m.ret);
}
for (const u of unions) u.members.forEach((n) => referenced.add(n));

const emptyTypes = [...new Set(emptyTypeCandidates)]
  .filter((n) => referenced.has(n) && !defined.has(n))
  .sort();

// Fail loudly rather than emit `unknown`/`never`.
if (unmapped.size) {
  console.error("✗ Unmapped Telegram type strings:");
  for (const u of unmapped) console.error("   - " + JSON.stringify(u));
  process.exit(1);
}

const out: string[] = [];
out.push(`/* eslint-disable */
/**
 * AUTO-GENERATED by scripts/api-parser.ts - DO NOT EDIT BY HAND.
 *
 * Source: ${API_URL}
 * Regenerate with: bun scripts/api-parser.ts
 */
import type { InputFile } from "../core/files.js";
`);
out.push(PRELUDE);

// `Update` is emitted as a DISCRIMINATED UNION (ADR-007): one variant per
// payload key, each `{ update_id: number } & { <key>: <Type> }`. This lets
// `if ('message' in u)` narrow `u.message` to `Message`, instead of the v1
// all-optional object where every field was `T | undefined`.
const updateDef = types.find((t) => t.name === "Update");
if (!updateDef) throw new Error("Could not find the `Update` object in the parsed docs");
const updateVariants = updateDef.fields.filter((f) => f.name !== "update_id");
const updateKeys = updateVariants.map((f) => f.name);

out.push(`\n// ---------------------------------------------------------------------------
// Update - discriminated union (ADR-007), one variant per payload key
// ---------------------------------------------------------------------------\n`);
out.push(
  `export type Update =\n` +
    updateVariants
      .map((f) => `  | ({ update_id: number } & { ${f.name}: ${f.type} })`)
      .join("\n") +
    `;\n`,
);

// All payload keys across every `Update` variant. A discriminated union's
// `keyof` is only the common key (`update_id`), so distribute over the union
// (via a naked type parameter) to collect each variant's own keys, then union
// them.
out.push(
  `\n/** \`keyof\` distributed over a union (each member's keys, unioned). */\n` +
    `type _KeysOfUnion<T> = T extends unknown ? keyof T : never;\n` +
    `/** Every payload key across all \`Update\` variants. */\n` +
    `type _UpdateKeys = _KeysOfUnion<Update>;\n`,
);

out.push(
  `\n/** \`Update\` field names dispatched as events (every \`Update\` payload key except \`update_id\`). */\n` +
    `export const UPDATE_TYPES = [\n` +
    updateKeys.map((n) => `  ${JSON.stringify(n)},`).join("\n") +
    `\n] as const satisfies readonly Exclude<_UpdateKeys, "update_id">[];\n` +
    `export type UpdateType = (typeof UPDATE_TYPES)[number];\n` +
    `\n// Compile-time proof that UPDATE_TYPES stays in lockstep with \`Update\`: the\n` +
    `// \`satisfies\` above rejects any entry that is not an \`Update\` payload key, and\n` +
    `// this rejects the reverse - a payload key that is missing from UPDATE_TYPES.\n` +
    `type _AssertNever<T extends never> = T;\n` +
    `type _UpdateTypesAreExhaustive = _AssertNever<Exclude<Exclude<_UpdateKeys, "update_id">, UpdateType>>;\n`,
);

out.push(`\n// ---------------------------------------------------------------------------
// Objects
// ---------------------------------------------------------------------------\n`);
for (const t of types) {
  if (t.name === "Update") continue; // emitted above as a discriminated union
  out.push(`export type ${t.name} = ${emitFields(t.fields)};\n`);
}

if (emptyTypes.length) {
  out.push(`\n// Placeholder objects (documented as holding no fields)\n`);
  for (const n of emptyTypes) out.push(`export type ${n} = Record<string, never>;\n`);
}

out.push(`\n// ---------------------------------------------------------------------------
// Union ("one of") objects
// ---------------------------------------------------------------------------\n`);
for (const u of unions) out.push(`export type ${u.name} = ${u.members.join(" | ")};\n`);

out.push(`\n// ---------------------------------------------------------------------------
// Methods: request params + reply types
// ---------------------------------------------------------------------------\n`);
for (const m of methods) {
  const C = cap(m.name);
  out.push(`export type ${C}Params = ${emitFields(m.fields)};`);
  out.push(`export type ${C}Result = ${m.ret};\n`);
}

await Bun.write(OUT, ascii(out.join("\n")));

// ---------------------------------------------------------------------------
// Emit the single generated `Api` class (ADR-001) → src/core/api.ts
// ---------------------------------------------------------------------------
//
// One concrete method per Bot API method, each a one-liner over the shared
// `request()`. No Proxy, no Raw/Api split. Every method takes a single `params`
// argument plus an optional trailing `signal`. Types come from the types barrel
// via a namespace import (`T.SendMessageParams`, `T.Message`, ...) so we never
// maintain a giant import list.

const apiOut: string[] = [];
apiOut.push(`/* eslint-disable */
/** AUTO-GENERATED by scripts/api-parser.ts - DO NOT EDIT BY HAND. */
import { Transport, type TransportOptions } from "./transport.js";
import { serializeParams } from "./serialize.js";
import type * as T from "../types/index.js";

export class Api {
  protected readonly transport: Transport;

  constructor(token: string, options?: TransportOptions) {
    this.transport = new Transport(token, options);
  }

  protected request<R>(
    method: string,
    params?: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<R> {
    // ADR-002 (Option-D): structured params are plain objects; serialize once here
    // (before the transport retry loop) into the wire-ready record encodeForm takes.
    return this.transport.request<R>(method, params ? serializeParams(params) : params, signal);
  }
`);

for (const m of methods) {
  const C = cap(m.name);
  const result = `T.${C}Result`;
  const hasFields = m.fields.length > 0;
  const allOptional = hasFields && m.fields.every((f) => f.optional);

  if (!hasFields) {
    // No params at all → no params argument, pass `undefined`.
    apiOut.push(
      `  ${m.name}(signal?: AbortSignal): Promise<${result}> {\n` +
        `    return this.request<${result}>(${JSON.stringify(m.name)}, undefined, signal);\n` +
        `  }`,
    );
  } else if (allOptional) {
    // Every field optional → params is optional.
    apiOut.push(
      `  ${m.name}(params?: T.${C}Params, signal?: AbortSignal): Promise<${result}> {\n` +
        `    return this.request<${result}>(${JSON.stringify(m.name)}, params, signal);\n` +
        `  }`,
    );
  } else {
    // At least one required field → params is required.
    apiOut.push(
      `  ${m.name}(params: T.${C}Params, signal?: AbortSignal): Promise<${result}> {\n` +
        `    return this.request<${result}>(${JSON.stringify(m.name)}, params, signal);\n` +
        `  }`,
    );
  }
}

apiOut.push(`}\n`);

await Bun.write(API_OUT, ascii(apiOut.join("\n")));

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log(`✓ wrote ${OUT.pathname}`);
console.log(`✓ wrote ${API_OUT.pathname}`);
console.log(`  objects:        ${types.length}`);
console.log(`  unions:         ${unions.length}`);
console.log(`  empty objects:  ${emptyTypes.length} (${emptyTypes.join(", ") || "none"})`);
console.log(`  methods:        ${methods.length}`);
if (unresolved.length) {
  console.log(`\n⚠ reply type fell back to boolean for ${unresolved.length} method(s):`);
  console.log("   " + unresolved.join(", "));
  console.log("   (add to RETURN_OVERRIDES if wrong)");
}
