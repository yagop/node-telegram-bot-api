/**
 * Param serialization (ADR-002 Option-D).
 *
 * `*Params` structured fields are plain typed objects/arrays; this is the single
 * `JSON.stringify` + `attach://` walk that turns them into the wire-ready record
 * `encodeForm` consumes. It runs ONCE per request (called from `Api.request`,
 * before the transport retry loop), so `attach://` indices are minted once.
 *
 * Per top-level field:
 *   - a top-level `InputFile` passes through (the encoder attaches it under the
 *     field name, e.g. `photo`), so the walk only resolves files at depth >= 1;
 *   - a structured value (object/array) is walked: every nested `InputFile` is
 *     hoisted to `attach://media_<i>` + collected as a matching part, then the
 *     result is JSON-stringified (a `FormPart` if it carried files, else a string);
 *   - a scalar (string/number/boolean) passes through (the encoder String-coerces).
 *
 * The `attach://` counter is one-per-call, so two file-capable fields in the same
 * request (e.g. `sendPoll`'s `media` + `explanation_media`) get `media_0`/`media_1`
 * rather than colliding.
 */

import { ATTACH_PREFIX, formPart, type InputFile, isInputFile } from "./files.js";

/** Guard against a cyclic/pathological structure (real Bot API shapes are shallow). */
const MAX_DEPTH = 64;

export function serializeParams(params: Record<string, unknown>): Record<string, unknown> {
  const slots = { next: 0 };
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;
    if (isInputFile(value)) {
      out[key] = value; // top-level file: the encoder attaches it under the field name
    } else if (typeof value === "object") {
      const files: Array<[string, InputFile]> = [];
      const json = JSON.stringify(resolve(value, slots, files, 0));
      out[key] = files.length ? formPart(json, files) : json;
    } else {
      out[key] = value; // scalar
    }
  }
  return out;
}

/** Replace every nested `InputFile` with its `attach://` ref (collecting the part). */
function resolve(
  node: unknown,
  slots: { next: number },
  files: Array<[string, InputFile]>,
  depth: number,
): unknown {
  if (depth > MAX_DEPTH) throw new TypeError("serializeParams: structure too deep (cyclic?)");
  if (isInputFile(node)) {
    const ref = node.build(slots.next++);
    files.push([ref.slice(ATTACH_PREFIX.length), node]);
    return ref;
  }
  if (Array.isArray(node)) return node.map((child) => resolve(child, slots, files, depth + 1));
  if (node !== null && typeof node === "object") {
    return Object.fromEntries(
      Object.entries(node).map(([k, v]) => [k, resolve(v, slots, files, depth + 1)]),
    );
  }
  return node;
}
