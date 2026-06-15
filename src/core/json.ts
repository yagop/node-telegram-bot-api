/**
 * Branded JSON strings — the heart of ADR-002.
 *
 * Structured Bot API fields (`reply_markup`, entities, …) are documented as
 * "A JSON-serialized object", i.e. strings on the wire. v2 types them as a
 * BRANDED string so the value is wire-ready and the library never serializes:
 *
 *   - `Json<T>` is a plain string at runtime (zero overhead) but carries a
 *     phantom brand, so an arbitrary `string` is NOT assignable to it — only a
 *     value produced by a builder's `.build()` or by `json(value)`.
 */

declare const JSON_BRAND: unique symbol;

/** A JSON-serialized `T` (a branded string). Produce with `json(value)` or a builder. */
export type Json<T> = string & { readonly [JSON_BRAND]: T };

/** Serialize any structured value into a wire-ready `Json<T>` string. */
export function json<T>(value: T): Json<T> {
  return JSON.stringify(value) as unknown as Json<T>;
}
