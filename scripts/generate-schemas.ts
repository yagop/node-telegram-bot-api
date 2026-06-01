#!/usr/bin/env node
/**
 * Scrape https://core.telegram.org/bots/api and emit Zod schemas to
 * `src/types/schemas.ts`. Run via `npm run gen:schemas`.
 *
 * Parsing strategy
 * ----------------
 * Cheerio CSS selectors walk the documentation:
 *   - `#dev_page_content > h4` — heading of either a type (capitalised
 *     single-word, e.g. `Update`) or a method (camelCase, e.g. `sendMessage`).
 *   - `.nextUntil("h3, h4")` from each heading gathers description `<p>`s,
 *     an optional subtype `<ul>` (denotes an abstract union), and the
 *     fields `<table>`.
 *   - Type tables have three columns (Field | Type | Description); when
 *     the description begins with `Optional.` the field is optional.
 *   - Method tables have four columns; the Required column is `Yes` or
 *     `Optional`.
 *
 * Recursion
 * ---------
 * Type→type references form a graph; cycles are found with Tarjan SCC.
 * Members of a non-trivial SCC are emitted with an explicit `interface`
 * declaration plus `z.lazy(...)` schema so both TypeScript and Zod
 * resolve the cycle correctly.
 *
 * Manual escape hatches (special cases)
 * -------------------------------------
 *  - `InputFile` — a multipart upload sentinel, not JSON. Mapped to
 *    `z.unknown()`.
 *  - `CallbackGame` — documented as "a placeholder, currently holds no
 *    information". Mapped to an empty `obj({})`.
 *  - Fields whose Type column is `String` but whose semantics are an
 *    enum (e.g. `parse_mode`) are bound to the static header schema via
 *    `FIELD_OVERRIDES`.
 */

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { load, type Cheerio } from "cheerio";
import type { AnyNode, Element } from "domhandler";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = process.env.TG_SCHEMAS_OUT
  ? path.resolve(process.env.TG_SCHEMAS_OUT)
  : path.resolve(__dirname, "..", "src", "types", "schemas.ts");
const API_URL = process.env.TG_API_URL ?? "https://core.telegram.org/bots/api";

// ---------------------------------------------------------------------------
// Static prelude/footer for the generated file
// ---------------------------------------------------------------------------

const STATIC_HEADER = `/**
 * @file Auto-generated Zod schemas for the Telegram Bot API.
 *
 * DO NOT EDIT — regenerate via \`npm run gen:schemas\`. The generator
 * lives at \`scripts/generate-schemas.ts\` and scrapes the official docs at
 * https://core.telegram.org/bots/api.
 *
 * Schemas are emitted as plain \`z.object(...)\` (strict). Callers that want
 * forward-compat through unknown-key preservation should use
 * \`parseWithPassthrough(SomeSchema, data)\` — it walks the schema tree and
 * applies \`.passthrough()\` at every object boundary before parsing.
 *
 * Why split it this way: keeping \`.passthrough()\` baked into every schema
 * forces every inferred type to carry \`& { [k: string]: unknown }\`, which
 * bloats the .d.ts output and triggers TS7056 for any moderately complex
 * type. By making passthrough an opt-in parse-time wrapper we get clean
 * strict inferred types here without losing forward-compat at the
 * response-parsing boundary.
 */

import { z } from "zod";

const obj = <T extends z.ZodRawShape>(shape: T) => z.object(shape);

/**
 * Recursively wrap a schema so every \`ZodObject\` inside parses in
 * passthrough mode (unknown keys survive). Use this when validating
 * incoming Telegram payloads — Telegram regularly extends responses with
 * new optional fields between API releases and silently dropping them
 * would break downstream readers.
 */
export function withPassthrough<T extends z.ZodTypeAny>(schema: T): T {
  if (schema instanceof z.ZodObject) {
    const shape: Record<string, z.ZodTypeAny> = {};
    for (const key of Object.keys(schema.shape)) {
      shape[key] = withPassthrough(schema.shape[key]);
    }
    return z.object(shape).passthrough() as unknown as T;
  }
  if (schema instanceof z.ZodArray) {
    return z.array(withPassthrough((schema as z.ZodArray<z.ZodTypeAny>).element)) as unknown as T;
  }
  if (schema instanceof z.ZodOptional) {
    return withPassthrough((schema as z.ZodOptional<z.ZodTypeAny>).unwrap()).optional() as unknown as T;
  }
  if (schema instanceof z.ZodNullable) {
    return withPassthrough((schema as z.ZodNullable<z.ZodTypeAny>).unwrap()).nullable() as unknown as T;
  }
  if (schema instanceof z.ZodUnion) {
    const options = (schema as z.ZodUnion<readonly [z.ZodTypeAny, ...z.ZodTypeAny[]]>).options;
    return z.union(options.map(withPassthrough) as unknown as readonly [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]) as unknown as T;
  }
  if (schema instanceof z.ZodLazy) {
    return z.lazy(() => withPassthrough((schema as z.ZodLazy<z.ZodTypeAny>).schema)) as unknown as T;
  }
  return schema;
}

/** Convenience wrapper: \`parseWithPassthrough(MessageSchema, payload)\`. */
export function parseWithPassthrough<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  return withPassthrough(schema).parse(data) as z.infer<T>;
}

// "Integer or String" is the chat-id shape used pervasively across the API.
export const ChatIdSchema = z.union([z.number().int(), z.string()]);
export type ChatId = z.infer<typeof ChatIdSchema>;

// ParseMode is documented only in prose ("Formatting options"), not as a type.
export const ParseModeSchema = z.enum(["MarkdownV2", "Markdown", "HTML"]);
export type ParseMode = z.infer<typeof ParseModeSchema>;

// Library-specific event names emitted on the \`message\` channel.
export const MESSAGE_TYPES = [
  "text", "animation", "audio", "channel_chat_created", "contact",
  "delete_chat_photo", "dice", "document", "game", "group_chat_created",
  "invoice", "left_chat_member", "location", "migrate_from_chat_id",
  "migrate_to_chat_id", "new_chat_members", "new_chat_photo", "new_chat_title",
  "passport_data", "photo", "pinned_message", "poll", "sticker",
  "successful_payment", "supergroup_chat_created", "video", "video_note",
  "voice", "video_chat_started", "video_chat_ended",
  "video_chat_participants_invited", "video_chat_scheduled",
  "message_auto_delete_timer_changed", "chat_invite_link",
  "chat_member_updated", "web_app_data", "message_reaction",
] as const;
export type MessageType = typeof MESSAGE_TYPES[number];
`;

const STATIC_FOOTER = `
// Generic envelope wrapping every Telegram HTTP response.
export const TelegramApiResponseSchema = z.object({
  ok: z.boolean(),
  result: z.unknown().optional(),
  description: z.string().optional(),
  error_code: z.number().int().optional(),
  parameters: z
    .object({
      migrate_to_chat_id: z.number().int().optional(),
      retry_after: z.number().int().optional(),
    })
    .passthrough()
    .optional(),
});
export type TelegramApiResponse<T = unknown> = {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
  parameters?: { migrate_to_chat_id?: number; retry_after?: number };
};
`;

// ---------------------------------------------------------------------------
// Manual overrides
// ---------------------------------------------------------------------------

/**
 * Types whose schema cannot be inferred from the docs table alone.
 *
 * `z.custom<unknown>(() => true)` is used instead of `z.unknown()` because
 * Zod's `z.unknown()` makes the enclosing field optional (unknown ⊇
 * undefined). For `InputFile` (a multipart upload sentinel) the docs list
 * the field as required, so we need a Zod expression whose inferred output
 * is required `unknown`.
 */
const TYPE_OVERRIDES: Record<string, { zod: string; ts: string }> = {
  InputFile: { zod: "z.custom<unknown>(() => true)", ts: "unknown" },
  CallbackGame: { zod: "obj({})", ts: "Record<string, unknown>" },
};

/** Fields whose Type column is too loose; bind to a static schema instead. */
const FIELD_OVERRIDES: Record<string, { zod: string; ts: string }> = {
  parse_mode: { zod: "ParseModeSchema", ts: "ParseMode" },
};

// Heading anchor names whose target is part of the static header.
const STATIC_TYPES = new Set(["ChatId", "ParseMode", "MessageType"]);

// ---------------------------------------------------------------------------
// Parsed shape of an API entry
// ---------------------------------------------------------------------------

interface Field {
  name: string;
  rawType: string;
  required: boolean;
  description: string;
}

interface ApiObject {
  kind: "type" | "method";
  name: string;
  description: string;
  fields: Field[];
  subtypes: string[];
  returnType: string | null;
}

// ---------------------------------------------------------------------------
// Step 1: fetch
// ---------------------------------------------------------------------------

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": "tg-schema-generator/1.0" } });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status} ${res.statusText}`);
  return res.text();
}

// ---------------------------------------------------------------------------
// Step 2: parse the doc into ApiObjects
// ---------------------------------------------------------------------------

function parsePage(html: string): ApiObject[] {
  const $ = load(html);
  const entries: ApiObject[] = [];

  $("#dev_page_content > h4").each((_, h4) => {
    const name = $(h4).text().trim();
    // Skip changelog headings ("May 8, 2026") and section headings
    // ("Formatting options") — those are not API entries.
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(name)) return;

    const kind: "type" | "method" = /^[a-z]/.test(name) ? "method" : "type";
    const section = collectSection($, h4);

    entries.push({
      kind,
      name,
      description: section.description,
      fields: parseTable($, section.table),
      subtypes: section.subtypes,
      returnType: kind === "method" ? extractReturnType(section.description) : null,
    });
  });

  return entries;
}

interface Section {
  description: string;
  subtypes: string[];
  table: Element | null;
}

function collectSection($: ReturnType<typeof load>, h4: AnyNode): Section {
  const paragraphs: string[] = [];
  const subtypes: string[] = [];
  let table: Element | null = null;

  const $h4 = $(h4);
  const siblings = $h4.nextUntil("h3, h4");
  siblings.each((_, el) => {
    const tag = (el as Element).tagName?.toLowerCase();
    const $el = $(el);
    if (tag === "p") {
      paragraphs.push($el.text().trim());
    } else if (tag === "ul") {
      // Concrete-subtype lists: <ul><li><a href="#x">X</a></li>…</ul>.
      $el.find("> li > a").each((__, a) => {
        const txt = $(a).text().trim();
        if (/^[A-Z][A-Za-z0-9]*$/.test(txt)) subtypes.push(txt);
      });
    } else if (tag === "table") {
      table = el as Element;
    }
  });

  return { description: paragraphs.join("\n"), subtypes, table };
}

function parseTable($: ReturnType<typeof load>, table: Element | null): Field[] {
  if (!table) return [];
  const out: Field[] = [];
  $(table).find("tbody > tr").each((_, tr) => {
    const cells = $(tr).find("> td");
    if (cells.length < 3) return;

    const name = $(cells[0]).text().trim();
    const rawType = $(cells[1]).text().trim();

    let required: boolean;
    let description: string;
    if (cells.length >= 4) {
      // Method table: Parameter | Type | Required | Description
      required = $(cells[2]).text().trim().toLowerCase() === "yes";
      description = $(cells[3]).text().trim();
    } else {
      // Type table: Field | Type | Description (with "Optional." prefix).
      description = $(cells[2]).text().trim();
      const optional = description.startsWith("Optional.");
      required = !optional;
      if (optional) description = description.replace(/^Optional\.\s*/, "");
    }

    out.push({ name, rawType, required, description });
  });
  return out;
}

function extractReturnType(description: string): string | null {
  // Patterns we try in order of specificity.
  const patterns: Array<{ re: RegExp; group?: number }> = [
    { re: /Returns?\s+an?\s+Array of\s+([A-Z][A-Za-z]+)\s+object/ },
    { re: /Returns?\s+(?:an?\s+)?Array of\s+([A-Z][A-Za-z]+)/ },
    { re: /Returns?\s+the\s+\w+\s+([A-Z][A-Za-z]+)\s+object/ },
    { re: /Returns?\s+(?:the\s+)?(?:edited|sent|new)\s+([A-Z][A-Za-z]+)/ },
    { re: /Returns?\s+(?:the\s+)?([A-Z][A-Za-z]+)\s+object/ },
    { re: /Returns?\s+a\s+([A-Z][A-Za-z]+)\s+object/ },
    { re: /On success(?:, an? array of)?\s+([A-Z][A-Za-z]+)\s+(?:objects?|is returned)/ },
    { re: /On success,?\s+(?:the\s+)?(?:\w+\s+)?([A-Z][A-Za-z]+)\s+is returned/ },
    { re: /Returns?\s+(True|False)/i },
    { re: /returns\s+(True|False)/i },
  ];
  for (const { re } of patterns) {
    const m = description.match(re);
    if (m) {
      const v = m[1];
      if (v.toLowerCase() === "true") return "True";
      if (v.toLowerCase() === "false") return "False";
      // The "Array of X" patterns capture only the element; reconstruct.
      if (/Array of/.test(re.source)) return `Array of ${v}`;
      return v;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Step 3: dependency analysis (topo order + Tarjan SCC for recursion)
// ---------------------------------------------------------------------------

function extractRefs(raw: string): string[] {
  if (raw === "Integer or String") return [];
  let cleaned = raw.trim();
  while (cleaned.startsWith("Array of ")) cleaned = cleaned.slice("Array of ".length).trim();
  const out: string[] = [];
  for (const part of cleaned.split(/\s+or\s+/g)) {
    const t = part.trim();
    if (/^[A-Z][A-Za-z0-9]*$/.test(t)) out.push(t);
  }
  return out;
}

function buildGraph(types: ApiObject[]): Map<string, Set<string>> {
  const g = new Map<string, Set<string>>();
  for (const t of types) {
    const deps = new Set<string>();
    for (const f of t.fields) for (const r of extractRefs(f.rawType)) deps.add(r);
    for (const s of t.subtypes) deps.add(s);
    g.set(t.name, deps);
  }
  return g;
}

/**
 * "Weight" of a type ≈ how big its inferred type expression will be in the
 * emitted .d.ts. Computed transitively over field/subtype references —
 * with one twist: references to schemas in `annotated` cost O(1), because
 * `z.ZodType<X>` collapses the inferred shape down to its alias.
 *
 * This is the lever that breaks TS7056 cascades. Annotating `MessageSchema`
 * is enough to make every type that merely *references* Message (like
 * `ChecklistTask`) drop below the complexity threshold, even though they
 * transitively touch Message's giant shape.
 */
function computeWeights(types: ApiObject[], annotated: Set<string>): Map<string, number> {
  const byName = new Map(types.map(t => [t.name, t]));
  const memo = new Map<string, number>();

  const visit = (name: string, path: Set<string>): number => {
    if (annotated.has(name)) return 1;
    const cached = memo.get(name);
    if (cached !== undefined) return cached;
    if (path.has(name)) return 0;
    const t = byName.get(name);
    if (!t) return 1;
    path.add(name);
    let total = Math.max(1, t.fields.length);
    for (const f of t.fields) {
      for (const ref of extractRefs(f.rawType)) total += visit(ref, path);
    }
    for (const s of t.subtypes) total += visit(s, path);
    path.delete(name);
    memo.set(name, total);
    return total;
  };

  for (const t of types) visit(t.name, new Set());
  return memo;
}

// Tuned empirically against the live spec: at threshold ≥ 2000 TS7056 fires
// for `PollSchema`. Without `.passthrough()` baked in, smaller types fit, so
// 1500 is a comfortable headroom — bumps from Telegram's seasonal API
// changes won't push us off the cliff.
const COMPLEX_THRESHOLD = 1500;

/**
 * Greedily annotate the heaviest type, recompute weights (with that type
 * now O(1) for its referrers), repeat until everything fits under the
 * threshold. Pre-seeded with the recursive set, which must be annotated
 * regardless.
 *
 * `extraAnchors` lets the caller force-annotate types empirically known to
 * trip TS7056 — even when their weight is under the threshold. (Generated
 * schemas like `InlineQueryResult` are a union of many subtypes whose
 * combined `.union([...])` payload is long even if the per-subtype weight
 * is small.)
 */
function findComplex(types: ApiObject[], recursive: Set<string>): { complex: Set<string>; weights: Map<string, number> } {
  const complex = new Set([...recursive, ...EXTRA_ANNOTATED]);
  let weights = computeWeights(types, complex);

  while (true) {
    let heaviest = "";
    let max = COMPLEX_THRESHOLD;
    for (const t of types) {
      if (complex.has(t.name)) continue;
      const w = weights.get(t.name) ?? 0;
      if (w > max) { max = w; heaviest = t.name; }
    }
    if (!heaviest) break;
    complex.add(heaviest);
    weights = computeWeights(types, complex);
  }
  return { complex, weights };
}

/**
 * Hand-maintained list of types that empirically trip TS7056 even when
 * the heuristic weight is fine. Add a name here only after `tsc --noEmit`
 * complains about it post-generation. (Empty today — the weight metric
 * catches everything on the current spec.)
 */
const EXTRA_ANNOTATED = new Set<string>([]);

function tarjanRecursive(graph: Map<string, Set<string>>): Set<string> {
  const indices = new Map<string, number>();
  const lowlinks = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const recursive = new Set<string>();
  let counter = 0;

  // Iterative DFS so deep type chains don't blow the call stack.
  for (const start of graph.keys()) {
    if (indices.has(start)) continue;
    type Frame = { node: string; iter: Iterator<string> };
    const dfs: Frame[] = [{ node: start, iter: (graph.get(start) ?? new Set()).values() }];
    indices.set(start, counter);
    lowlinks.set(start, counter);
    counter++;
    stack.push(start);
    onStack.add(start);

    while (dfs.length) {
      const frame = dfs[dfs.length - 1];
      const step = frame.iter.next();
      if (step.done) {
        if (lowlinks.get(frame.node) === indices.get(frame.node)) {
          const scc: string[] = [];
          let popped: string | undefined;
          do {
            popped = stack.pop();
            if (popped === undefined) break;
            onStack.delete(popped);
            scc.push(popped);
          } while (popped !== frame.node);
          const isRecursive = scc.length > 1 || (graph.get(scc[0])?.has(scc[0]) ?? false);
          if (isRecursive) for (const n of scc) recursive.add(n);
        }
        dfs.pop();
        if (dfs.length) {
          const parent = dfs[dfs.length - 1].node;
          lowlinks.set(parent, Math.min(lowlinks.get(parent)!, lowlinks.get(frame.node)!));
        }
        continue;
      }
      const next = step.value;
      if (!graph.has(next)) continue;
      if (!indices.has(next)) {
        indices.set(next, counter);
        lowlinks.set(next, counter);
        counter++;
        stack.push(next);
        onStack.add(next);
        dfs.push({ node: next, iter: (graph.get(next) ?? new Set()).values() });
      } else if (onStack.has(next)) {
        lowlinks.set(frame.node, Math.min(lowlinks.get(frame.node)!, indices.get(next)!));
      }
    }
  }
  return recursive;
}

function topoOrder(types: ApiObject[], graph: Map<string, Set<string>>): ApiObject[] {
  const byName = new Map(types.map(t => [t.name, t]));
  const visited = new Set<string>();
  const onPath = new Set<string>();
  const order: ApiObject[] = [];

  const visit = (name: string) => {
    if (visited.has(name) || onPath.has(name)) return;
    onPath.add(name);
    for (const ref of graph.get(name) ?? []) {
      if (byName.has(ref)) visit(ref);
    }
    onPath.delete(name);
    visited.add(name);
    const t = byName.get(name);
    if (t) order.push(t);
  };

  for (const t of types) visit(t.name);
  return order;
}

// ---------------------------------------------------------------------------
// Step 4: render Zod and TypeScript expressions
// ---------------------------------------------------------------------------

// Members of a comma/and union must look like type names (or known primitives).
const PRIMITIVES = new Set(["Integer", "Float", "Float number", "String", "Boolean", "True", "False"]);
function splitUnion(raw: string): string[] | null {
  if (!/\s+or\s+|,\s+|\s+and\s+/.test(raw)) return null;
  const parts = raw.split(/\s+or\s+|\s+and\s+|,\s+/g).map(p => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const ok = parts.every(p => PRIMITIVES.has(p) || /^[A-Z][A-Za-z0-9]*$/.test(p));
  return ok ? parts : null;
}

function toZod(raw: string, known: Set<string>): string {
  const r = raw.trim();
  if (r === "Integer or String") return "ChatIdSchema";
  if (r.startsWith("Array of ")) {
    return `z.array(${toZod(r.slice("Array of ".length), known)})`;
  }
  const union = splitUnion(r);
  if (union) {
    return `z.union([${union.map(p => toZod(p, known)).join(", ")}])`;
  }
  switch (r) {
    case "Integer": return "z.number().int()";
    case "Float":
    case "Float number": return "z.number()";
    case "String": return "z.string()";
    case "Boolean": return "z.boolean()";
    case "True": return "z.literal(true)";
    case "False": return "z.literal(false)";
  }
  if (TYPE_OVERRIDES[r]) return TYPE_OVERRIDES[r].zod;
  if (known.has(r) || STATIC_TYPES.has(r)) return `${r}Schema`;
  return `z.unknown() /* TODO: unknown type \`${r}\` */`;
}

function toTs(raw: string, known: Set<string>): string {
  const r = raw.trim();
  if (r === "Integer or String") return "ChatId";
  if (r.startsWith("Array of ")) {
    return `Array<${toTs(r.slice("Array of ".length), known)}>`;
  }
  const union = splitUnion(r);
  if (union) {
    return union.map(p => toTs(p, known)).join(" | ");
  }
  switch (r) {
    case "Integer":
    case "Float":
    case "Float number": return "number";
    case "String": return "string";
    case "Boolean": return "boolean";
    case "True": return "true";
    case "False": return "false";
  }
  if (TYPE_OVERRIDES[r]) return TYPE_OVERRIDES[r].ts;
  if (known.has(r) || STATIC_TYPES.has(r)) return r;
  return "unknown";
}

// ---------------------------------------------------------------------------
// Step 5: emit declarations
// ---------------------------------------------------------------------------

/**
 * Detect String-typed fields whose description spells out a closed enum, e.g.
 *   `Type of the chat, can be either "private", "group", "supergroup" or "channel"`
 *   `Type of the message origin, always "user"`
 * Returns the value list (single-element for `always`), else null.
 */
function detectEnum(rawType: string, description: string): string[] | null {
  if (rawType !== "String") return null;
  if (!/(?:must be|can be (?:either|one of)|always|currently,?\s+(?:must be|one of|either))/i.test(description)) {
    return null;
  }
  // Curly “smart” quotes are normalised to straight ones first.
  const text = description.replace(/[“”„«»]/g, "\"").replace(/[‘’‚]/g, "'");
  const values = new Set<string>();
  for (const m of text.matchAll(/["']([a-z][a-z0-9_]*)["']/gi)) {
    values.add(m[1]);
  }
  if (values.size === 0) return null;
  return [...values];
}

function fieldZodExpr(f: Field, known: Set<string>): string {
  if (FIELD_OVERRIDES[f.name]) {
    const base = FIELD_OVERRIDES[f.name].zod;
    return f.required ? base : `${base}.optional()`;
  }
  const enumValues = detectEnum(f.rawType, f.description);
  if (enumValues) {
    const base = enumValues.length === 1
      ? `z.literal(${JSON.stringify(enumValues[0])})`
      : `z.enum([${enumValues.map(v => JSON.stringify(v)).join(", ")}])`;
    return f.required ? base : `${base}.optional()`;
  }
  const base = toZod(f.rawType, known);
  return f.required ? base : `${base}.optional()`;
}

function fieldTsExpr(f: Field, known: Set<string>): string {
  if (FIELD_OVERRIDES[f.name]) return FIELD_OVERRIDES[f.name].ts;
  const enumValues = detectEnum(f.rawType, f.description);
  if (enumValues) {
    return enumValues.map(v => JSON.stringify(v)).join(" | ");
  }
  return toTs(f.rawType, known);
}

function isUnknownOptional(ts: string): boolean {
  // Zod treats `z.unknown()` / `z.custom<unknown>()` as optional in the
  // parent object's inferred type (`unknown` ⊇ `undefined`). Mirror that
  // here for fields whose TS resolves to bare `unknown` (ignore `Array<unknown>`,
  // since the array itself is still required).
  const stripped = ts.replace(/Array<[^<>]+>/g, "[]");
  return /\bunknown\b/.test(stripped);
}

function emitInterface(name: string, fields: Field[], known: Set<string>): string {
  const lines = fields
    .map(f => {
      const ts = fieldTsExpr(f, known);
      const optional = !f.required || isUnknownOptional(ts);
      return `  ${f.name}${optional ? "?" : ""}: ${ts};`;
    })
    .join("\n");
  return `export interface ${name} {\n${lines}\n}`;
}

function emitType(t: ApiObject, known: Set<string>, recursive: Set<string>, complex: Set<string>): string {
  const override = TYPE_OVERRIDES[t.name];
  if (override) {
    return (
      `export type ${t.name} = ${override.ts};\n` +
      `export const ${t.name}Schema: z.ZodType<${t.name}> = ${override.zod};`
    );
  }

  if (t.subtypes.length > 0) {
    const members = t.subtypes.map(s => `  ${s}Schema`).join(",\n");
    const tsUnion = t.subtypes.join(" | ");
    // If any subtype is recursive, the union must also be lazy so its
    // reference to the recursive schema resolves at use time, not at
    // declaration time. TS hoists type aliases so the forward reference
    // to a not-yet-emitted subtype is safe.
    const lazy = recursive.has(t.name) || t.subtypes.some(s => recursive.has(s));
    const body = `z.union([\n${members},\n])`;
    return (
      `export type ${t.name} = ${tsUnion};\n` +
      `export const ${t.name}Schema: z.ZodType<${t.name}> = ${lazy ? `z.lazy(() => ${body})` : body};`
    );
  }

  if (t.fields.length === 0) {
    return (
      `export const ${t.name}Schema = obj({});\n` +
      `export type ${t.name} = z.infer<typeof ${t.name}Schema>;`
    );
  }

  const zodLines = t.fields.map(f => `  ${f.name}: ${fieldZodExpr(f, known)},`).join("\n");

  // Recursive and TS7056-prone schemas need an explicit `z.ZodType<X>`
  // annotation backed by a hand-rolled interface. Everything else uses the
  // idiomatic `z.infer<typeof FooSchema>` pattern.
  if (recursive.has(t.name) || complex.has(t.name)) {
    const iface = emitInterface(t.name, t.fields, known);
    const body = `obj({\n${zodLines}\n})`;
    const expr = recursive.has(t.name) ? `z.lazy(() => ${body})` : body;
    return `${iface}\nexport const ${t.name}Schema: z.ZodType<${t.name}> = ${expr};`;
  }

  return (
    `export const ${t.name}Schema = obj({\n${zodLines}\n});\n` +
    `export type ${t.name} = z.infer<typeof ${t.name}Schema>;`
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function methodWeight(m: ApiObject, weights: Map<string, number>): number {
  let total = Math.max(1, m.fields.length);
  for (const f of m.fields) {
    for (const ref of extractRefs(f.rawType)) total += weights.get(ref) ?? 1;
  }
  return total;
}

function emitMethod(m: ApiObject, known: Set<string>, weights: Map<string, number>): string {
  const baseName = capitalize(m.name);
  const paramsType = `${baseName}Params`;
  const paramsSchema = `${baseName}ParamsSchema`;
  const resultType = `${baseName}Result`;
  const resultSchema = `${baseName}ResultSchema`;

  let paramsBlock: string;
  if (m.fields.length === 0) {
    paramsBlock =
      `export const ${paramsSchema} = obj({});\n` +
      `export type ${paramsType} = z.infer<typeof ${paramsSchema}>;`;
  } else if (methodWeight(m, weights) > COMPLEX_THRESHOLD) {
    const zodLines = m.fields.map(f => `  ${f.name}: ${fieldZodExpr(f, known)},`).join("\n");
    paramsBlock =
      emitInterface(paramsType, m.fields, known) +
      `\nexport const ${paramsSchema}: z.ZodType<${paramsType}> = obj({\n${zodLines}\n});`;
  } else {
    const zodLines = m.fields.map(f => `  ${f.name}: ${fieldZodExpr(f, known)},`).join("\n");
    paramsBlock =
      `export const ${paramsSchema} = obj({\n${zodLines}\n});\n` +
      `export type ${paramsType} = z.infer<typeof ${paramsSchema}>;`;
  }

  // The result schema is almost always a single reference (`MessageSchema`,
  // `z.array(UpdateSchema)`, `z.literal(true)`, …) so `z.infer` is fine.
  const resultZod = m.returnType ? toZod(m.returnType, known) : "z.unknown()";
  const resultBlock =
    `export const ${resultSchema} = ${resultZod};\n` +
    `export type ${resultType} = z.infer<typeof ${resultSchema}>;`;

  return `${paramsBlock}\n${resultBlock}`;
}

// ---------------------------------------------------------------------------
// Step 6: orchestrate
// ---------------------------------------------------------------------------

async function main() {
  console.log(`Fetching ${API_URL}…`);
  const html = await fetchHtml(API_URL);

  const entries = parsePage(html);
  const types = entries.filter(e => e.kind === "type");
  const methods = entries.filter(e => e.kind === "method");
  const knownTypes = new Set(types.map(t => t.name));
  const graph = buildGraph(types);
  const recursive = tarjanRecursive(graph);
  const { complex, weights } = findComplex(types, recursive);
  const ordered = topoOrder(types, graph);

  const sections: string[] = [];
  sections.push(STATIC_HEADER);

  sections.push(
    "// ---------------------------------------------------------------------------\n" +
    "// Types\n" +
    "// ---------------------------------------------------------------------------\n",
  );
  for (const t of ordered) sections.push(emitType(t, knownTypes, recursive, complex));

  sections.push(
    "\n// ---------------------------------------------------------------------------\n" +
    "// Methods (request params + response result)\n" +
    "// ---------------------------------------------------------------------------\n",
  );
  for (const m of methods) sections.push(emitMethod(m, knownTypes, weights));

  sections.push(STATIC_FOOTER);

  const code = sections.join("\n");
  await writeFile(OUTPUT, code, "utf8");

  console.log(
    `Wrote ${types.length} types (${recursive.size} recursive, ${complex.size} complex) ` +
    `and ${methods.length} methods to ${path.relative(process.cwd(), OUTPUT)}`,
  );
  if (process.env.TG_DEBUG_COMPLEX) {
    // Re-compute "raw" weights (nothing annotated) so the debug output
    // shows the intrinsic size of each complex type, not 0.
    const raw = computeWeights(types, new Set());
    const sorted = [...complex].map(n => [n, raw.get(n) ?? 0] as const).sort((a, b) => b[1] - a[1]);
    console.error("Complex types (annotated):");
    for (const [n, w] of sorted) console.error(`  ${n}\t${w}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
