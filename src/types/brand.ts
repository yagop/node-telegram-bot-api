/**
 * The zero-cost JSON brand.
 *
 * Telegram's wire wants structured fields (`reply_markup`, entities,
 * `reply_parameters`, ...) as JSON-serialized strings. v2 takes that literally:
 *
 * - `JsonString<T>` is a `string` at runtime, branded at compile time with the
 *   shape it was serialized from. `json()` and the file-free builders
 *   (`InlineKeyboard`, `EntityBuilder`) produce it.
 * - `Json<T>` is what a structured *field* accepts: a `JsonString<T>` OR a
 *   `FilePart<T>` (a builder that also carries uploads as `attach://` parts).
 *   Folding the file arm into `Json<T>` means *every* structured field is just
 *   `Json<T>` - there is no separate "this field can carry files" type, so the
 *   generator needs no allow-list.
 *
 * Either way a field rejects a bare `string` or a plain object (you must go
 * through `json()` or a builder), and the request pipeline never serializes -
 * values arrive wire-ready. See ADR-002 in redesign/ARCHITECTURE.md.
 */
import type { FilePart } from "../core/files.js";

/** A structured value already serialized to a JSON string, branded with its shape. */
export type JsonString<T> = string & { readonly __json: T };

/** What a structured field accepts: a `JsonString<T>` or a file-carrying `FilePart<T>`. */
export type Json<T> = JsonString<T> | FilePart<T>;

/** The logical payload `T` carried by a `Json<T>` field - lets a media builder return
 *  the exact `FilePart<T>` a field wants without respelling its (expanded) union. */
export type CarriedBy<J> = J extends Json<infer T> ? T : never;
