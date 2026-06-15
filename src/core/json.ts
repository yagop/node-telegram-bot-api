/**
 * The universal serialization escape hatch (ADR-002).
 *
 * Structured Bot API fields are typed as branded `Json<T>` strings; the request
 * pipeline never serializes. `json()` is how a caller produces that branded
 * string for any field that has no bespoke builder (`reply_parameters`,
 * `link_preview_options`, ...). The dedicated builders (`InlineKeyboard`,
 * `EntityBuilder`, `MediaGroup`) are sugar layered on top of the same idea.
 */
import type { Json } from "../types/brand.js";

/** Serialize any value to a branded `Json<T>` string. */
export function json<T>(value: T): Json<T> {
  return JSON.stringify(value) as Json<T>;
}
