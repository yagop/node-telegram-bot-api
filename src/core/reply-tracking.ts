/**
 * Reply tracking - "I am waiting for a reply to *this* message" - built as a
 * layer **on top of** the session, not baked into it.
 *
 * The state is a plain table (`message_id we sent -> marker`) kept in the
 * session envelope's `ext` under the `"reply"` namespace, so:
 *
 * - a bot that never tracks replies persists nothing extra;
 * - changing this table's shape never touches the session format;
 * - it is a persisted marker, never a live continuation, so it survives a
 *   restart and works under one-invocation-per-update serverless (there is
 *   deliberately no awaitable `waitForReply`: a Promise cannot cross an
 *   invocation).
 *
 * The same table also backs **callback queries** ({@link expectCallback} /
 * {@link matchCallback}), keyed on the message the inline keyboard is attached
 * to. Note a callback query already carries your own `callback_data`, so reach
 * for those only when 64 bytes of client-visible text are not enough: a bigger
 * marker, one the client must not see (callback_data is plain text in the app),
 * or a button that must fire once. And unlike a reply, a keyboard is often
 * pressed repeatedly, so matching a callback does *not* consume the marker
 * unless you ask.
 *
 * Everything here reads the session off the context (`ctx.getSession()`), so it
 * needs the session middleware registered and an update with a session key -
 * otherwise it throws, like `ctx.getSession()` itself.
 *
 * ```ts
 * bot.command("start", async (ctx) => {
 *   const sent = await ctx.reply("Your name?", { reply_markup: { force_reply: true } });
 *   expectReply(ctx, sent.message_id, { step: "name" });
 * });
 *
 * bot.on("message", async (ctx, next) => {
 *   const hit = matchReply<{ step: string }>(ctx);
 *   if (!hit) return next();
 *   // ...answer for hit.step
 * });
 * ```
 */

import type { Context } from "./context.js";

/** Opaque, JSON-serializable tag a caller attaches to an awaited reply or button press. */
export type ReplyMarker = Record<string, unknown>;

/** The `ext` namespace this layer stores its table under. */
export const REPLY_NAMESPACE = "reply";

type ReplyState = { awaiting: Record<number, ReplyMarker> };

/**
 * This key's reply table, created on first use inside the session envelope. The
 * stored slot is untrusted, so a slot whose `awaiting` is missing or not a plain
 * object is replaced by a fresh table rather than blowing up on the first write.
 */
function replyState(ctx: Context): ReplyState {
  return ctx.getSession().ext<ReplyState>(
    REPLY_NAMESPACE,
    () => ({ awaiting: {} }),
    (slot) => typeof slot.awaiting === "object" && slot.awaiting !== null && !Array.isArray(slot.awaiting),
  );
}

/**
 * Record that a reply to the message you just sent (`messageId`) is expected.
 *
 * `marker` is arbitrary JSON attached to that specific message; when the reply
 * arrives, {@link matchReply} hands it back so you know *which* prompt is being
 * answered - a chat can have several outstanding at once (name, then email, ...)
 * and the marker is how you tell their replies apart. With a single prompt in
 * flight it can be omitted (it defaults to `{}`) and its presence is enough.
 *
 * Pure session write - safe on serverless. Pair the sent message with
 * `reply_markup: { force_reply: true }` so the client quotes it and the reply
 * carries `reply_to_message.message_id`.
 */
export function expectReply(ctx: Context, messageId: number, marker: ReplyMarker = {}): void {
  replyState(ctx).awaiting[messageId] = marker;
}

/**
 * If the current update is a reply to a message a prior {@link expectReply}
 * registered (matched on `reply_to_message.message_id` within this session key),
 * consume and return that message's marker; otherwise `undefined` - so a handler
 * typically does `const hit = matchReply(ctx); if (!hit) return next();`.
 *
 * `M` is a type-only assertion for the marker you stored (like the `<T>` on
 * `ctx.getSession`): it types the return value and generates no runtime check.
 */
export function matchReply<M extends ReplyMarker = ReplyMarker>(ctx: Context): M | undefined {
  const repliedTo = ctx.message?.reply_to_message?.message_id;
  if (repliedTo === undefined) return undefined;
  const state = replyState(ctx);
  const marker = state.awaiting[repliedTo];
  if (marker === undefined) return undefined;
  delete state.awaiting[repliedTo];
  return marker as M;
}

/** Forget a pending expectation (a prompt that timed out, or was cancelled). */
export function forgetReply(ctx: Context, messageId: number): void {
  delete replyState(ctx).awaiting[messageId];
}

/**
 * Record that a **button press** on the message you just sent (`messageId`) is
 * expected - the callback-query peer of {@link expectReply}, sharing one table,
 * so a message cannot be awaiting a reply and a press under different markers.
 *
 * Prefer plain `callback_data` when it suffices: Telegram round-trips those 64
 * bytes for you, with no session and no store, and that is the idiomatic way to
 * route a button. This is for what `callback_data` cannot carry - a marker too
 * big for 64 bytes, one the client must not be able to read (callback_data is
 * plain text in the app), or a button that must work only once.
 */
export function expectCallback(ctx: Context, messageId: number, marker: ReplyMarker = {}): void {
  replyState(ctx).awaiting[messageId] = marker;
}

/**
 * If the current update is a callback query on a message a prior
 * {@link expectCallback} registered (matched on `callback_query.message.message_id`
 * within this session key), return that message's marker; otherwise `undefined`.
 *
 * Unlike {@link matchReply} this does **not** consume the marker by default: an
 * inline keyboard usually stays live for several presses (paging, a toggle), and
 * consuming would break every press after the first. Pass `{ once: true }` for a
 * one-shot button - a confirm/cancel pair, say - so a double tap or a press on a
 * stale message cannot fire it twice; {@link forgetReply} drops it explicitly.
 */
export function matchCallback<M extends ReplyMarker = ReplyMarker>(
  ctx: Context,
  options?: { once?: boolean },
): M | undefined {
  // `message` is absent when the keyboard is on an inline-mode message or one
  // too old for Telegram to send along (only `inline_message_id` arrives), so
  // there is nothing to key on - route those by `callback_data` instead.
  const pressed = ctx.callbackQuery?.message?.message_id;
  if (pressed === undefined) return undefined;
  const state = replyState(ctx);
  const marker = state.awaiting[pressed];
  if (marker === undefined) return undefined;
  if (options?.once === true) delete state.awaiting[pressed];
  return marker as M;
}

/**
 * Reply and callback tracking for plain **string** tags. Markers are objects, so
 * a bare `"EMAIL"` cannot be stored directly; this boxes it as `{ tag }` on write
 * and unboxes it on read. One `Tag` union types both ends, so the stored and
 * matched tags cannot drift apart.
 *
 * `expectPress` / `matchPress` are the callback-query peers of `expect` /
 * `match`, keeping the non-consuming default of {@link matchCallback}.
 *
 * @example
 * taggedReplies<"NAME" | "EMAIL">(ctx).expect(sent.message_id, "EMAIL");
 * const tag = taggedReplies<"NAME" | "EMAIL">(ctx).match(); // "NAME" | "EMAIL" | undefined
 */
export function taggedReplies<Tag extends string>(
  ctx: Context,
): {
  expect(messageId: number, tag: Tag): void;
  match(): Tag | undefined;
  expectPress(messageId: number, tag: Tag): void;
  matchPress(options?: { once?: boolean }): Tag | undefined;
  forget(messageId: number): void;
} {
  return {
    expect: (messageId, tag) => expectReply(ctx, messageId, { tag }),
    match: () => matchReply<{ tag: Tag }>(ctx)?.tag,
    expectPress: (messageId, tag) => expectCallback(ctx, messageId, { tag }),
    matchPress: (options) => matchCallback<{ tag: Tag }>(ctx, options)?.tag,
    forget: (messageId) => forgetReply(ctx, messageId),
  };
}
