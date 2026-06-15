/**
 * The zero-cost JSON brand.
 *
 * Telegram's wire wants structured fields (`reply_markup`, entities,
 * `reply_parameters`, ...) as JSON-serialized strings. v2 takes that literally:
 * those fields are typed as `Json<T>` - a `string` at runtime, branded at
 * compile time with the shape it was serialized from. A field typed
 * `Json<InlineKeyboardSpec>` therefore only accepts something a builder or the
 * generic `json()` helper produced; a bare `string` or a plain object is a type
 * error. The request pipeline never serializes - values arrive wire-ready.
 *
 * See ADR-002 in redesign/ARCHITECTURE.md.
 */
export type Json<T> = string & { readonly __json: T };
