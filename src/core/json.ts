/**
 * The universal serialization escape hatch (ADR-002).
 *
 * Structured Bot API fields accept a branded `Json<T>`; the request pipeline never
 * serializes. `json()` produces the string arm - a `JsonString<T>` - for any field
 * with no bespoke builder (`reply_parameters`, `link_preview_options`, ...). A
 * `JsonString<T>` is assignable to any `Json<T>` field. The dedicated builders
 * (`InlineKeyboard`, `EntityBuilder`, `MediaGroup`) are sugar over the same idea.
 */
import type { JsonString } from "../types/brand.js";

/** Serialize any value to a branded `JsonString<T>`. */
export function json<T>(value: T): JsonString<T> {
  return JSON.stringify(value) as JsonString<T>;
}
