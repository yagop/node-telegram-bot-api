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

/** Opaque, JSON-serializable tag a caller attaches to an awaited reply. */
export type ReplyMarker = Record<string, unknown>;

/** The `ext` namespace this layer stores its table under. */
export const REPLY_NAMESPACE = "reply";

type ReplyState = { awaiting: Record<number, ReplyMarker> };

/** This key's reply table, created on first use inside the session envelope. */
function replyState(ctx: Context): ReplyState {
  return ctx.getSession().ext<ReplyState>(REPLY_NAMESPACE, () => ({ awaiting: {} }));
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
 * Reply tracking for plain **string** tags. Markers are objects, so a bare
 * `"EMAIL"` cannot be stored directly; this boxes it as `{ tag }` on write and
 * unboxes it on read. One `Tag` union types both ends, so the stored and matched
 * tags cannot drift apart.
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
  forget(messageId: number): void;
} {
  return {
    expect: (messageId, tag) => expectReply(ctx, messageId, { tag }),
    match: () => matchReply<{ tag: Tag }>(ctx)?.tag,
    forget: (messageId) => forgetReply(ctx, messageId),
  };
}
