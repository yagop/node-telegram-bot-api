/**
 * Reply and callback tracking - "I am waiting for an answer to *this* message" -
 * built as a layer **on top of** the session, not baked into it.
 *
 * The state is two plain tables (`message_id we sent -> marker`), one for
 * replies and one for button presses, kept in the session envelope's `ext` under
 * the `"reply"` namespace, so:
 *
 * - a bot that never tracks answers persists nothing extra;
 * - changing these tables' shape never touches the session format;
 * - a marker is persisted data, never a live continuation, so it survives a
 *   restart and works under one-invocation-per-update serverless (there is
 *   deliberately no awaitable `waitForReply`: a Promise cannot cross an
 *   invocation).
 *
 * Replies and presses are tracked **separately**, because they are consumed
 * differently and would otherwise steal each other's markers: a quoted reply to
 * a message that also carries an inline keyboard would consume the press marker
 * and kill the button. Register both if a message can be answered either way.
 *
 * A callback query already carries your own `callback_data`, so reach for
 * {@link expectCallback} only when 64 bytes of client-visible text are not
 * enough: a bigger marker, one the client must not see (callback_data is plain
 * text in the app), or a button that must fire at most once.
 *
 * Markers do not expire on their own - a prompt nobody answers stays pending, by
 * design, since "the user replies tomorrow" is normal. Pass `ttlSeconds` when
 * recording one to bound that; expired entries are dropped the next time this
 * layer touches the session, so a bot that sets a TTL cannot grow its envelope
 * without limit.
 *
 * Everything here reads the session off the context (`ctx.getSession()`), so it
 * needs the session middleware registered and an update with a session key -
 * otherwise it throws, like `ctx.getSession()` itself.
 *
 * ```ts
 * bot.command("start", async (ctx) => {
 *   const sent = await ctx.reply("Your name?", { reply_markup: { force_reply: true } });
 *   expectReply(ctx, sent.message_id, { step: "name" }, { ttlSeconds: 3600 });
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

/** The `ext` namespace this layer stores its tables under. */
export const REPLY_NAMESPACE = "reply";

/** How long a recorded expectation stays live. Omitted: until matched or forgotten. */
export type ExpectOptions = {
  /**
   * Drop this expectation after so many seconds. There is no default and no cap:
   * a prompt waiting for tomorrow's reply is legitimate, so nothing expires
   * unless you say so. Set it for prompts that go stale (a confirmation, a
   * one-time code) to keep an unanswered chat's envelope from growing forever.
   */
  ttlSeconds?: number;
};

/** One recorded expectation: the caller's marker, plus its deadline if it has one. */
type Entry = { marker: ReplyMarker; expiresAt?: number };

/** The two tables, keyed by the id of the message we sent. */
type ReplyState = {
  replies: Record<number, Entry>;
  presses: Record<number, Entry>;
};

function isTable(value: unknown): boolean {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * This key's tables, created on first use inside the session envelope, with
 * expired entries pruned. The stored slot is untrusted (a foreign writer, a hand
 * edit, an older layout), so one missing either table is replaced by a fresh
 * pair rather than blowing up on the first write.
 */
function replyState(ctx: Context, now = Date.now()): ReplyState {
  const state = ctx.getSession().ext<ReplyState>(
    REPLY_NAMESPACE,
    () => ({ replies: {}, presses: {} }),
    (slot) => isTable(slot.replies) && isTable(slot.presses),
  );
  // Pruned here rather than on a timer: this is the only moment the layer is
  // guaranteed to be looking at the session, and the flush that follows persists
  // the smaller table.
  for (const table of [state.replies, state.presses]) {
    for (const [id, entry] of Object.entries(table)) {
      if (entry?.expiresAt !== undefined && entry.expiresAt <= now) delete table[Number(id)];
    }
  }
  return state;
}

function record(table: Record<number, Entry>, messageId: number, marker: ReplyMarker, options?: ExpectOptions): void {
  table[messageId] =
    options?.ttlSeconds === undefined ? { marker } : { marker, expiresAt: Date.now() + options.ttlSeconds * 1000 };
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
 *
 * Note the default session key is per **chat**, so in a group the marker belongs
 * to the group, and any member's reply matches it. Put the asker's id in the
 * marker and check it, or key sessions per user, when that matters.
 */
export function expectReply(ctx: Context, messageId: number, marker: ReplyMarker = {}, options?: ExpectOptions): void {
  record(replyState(ctx).replies, messageId, marker, options);
}

/**
 * If the current update is a reply to a message a prior {@link expectReply}
 * registered (matched on `reply_to_message.message_id` within this session key),
 * consume and return that message's marker; otherwise `undefined` - so a handler
 * typically does `const hit = matchReply(ctx); if (!hit) return next();`.
 *
 * Only reply expectations are considered: a quoted reply never consumes a marker
 * left by {@link expectCallback}.
 *
 * `M` is a type-only assertion for the marker you stored (like the `<T>` on
 * `ctx.getSession`): it types the return value and generates no runtime check.
 */
export function matchReply<M extends ReplyMarker = ReplyMarker>(ctx: Context): M | undefined {
  const repliedTo = ctx.message?.reply_to_message?.message_id;
  if (repliedTo === undefined) return undefined;
  const table = replyState(ctx).replies;
  const entry = table[repliedTo];
  if (entry === undefined) return undefined;
  delete table[repliedTo];
  return entry.marker as M;
}

/** Forget a pending reply expectation (a prompt that timed out, or was cancelled). */
export function forgetReply(ctx: Context, messageId: number): void {
  delete replyState(ctx).replies[messageId];
}

/**
 * Record that a **button press** on the message you just sent (`messageId`) is
 * expected - the callback-query peer of {@link expectReply}, in its own table.
 *
 * Prefer plain `callback_data` when it suffices: Telegram round-trips those 64
 * bytes for you, with no session and no store, and that is the idiomatic way to
 * route a button. This is for what `callback_data` cannot carry - a marker too
 * big for 64 bytes, one the client must not be able to read (callback_data is
 * plain text in the app), or a button that must work at most once.
 *
 * The per-chat caveat on {@link expectReply} applies here too, and more sharply:
 * an inline keyboard in a group is pressable by every member, so a destructive
 * button should carry the requester's id in its marker and check it.
 */
export function expectCallback(
  ctx: Context,
  messageId: number,
  marker: ReplyMarker = {},
  options?: ExpectOptions,
): void {
  record(replyState(ctx).presses, messageId, marker, options);
}

/**
 * If the current update is a callback query on a message a prior
 * {@link expectCallback} registered (matched on `callback_query.message.message_id`
 * within this session key), return that message's marker; otherwise `undefined`.
 *
 * Unlike {@link matchReply} this does **not** consume the marker by default: an
 * inline keyboard usually stays live for several presses (paging, a toggle), and
 * consuming would break every press after the first. Pass `{ once: true }` when a
 * button must fire at most once, so a second tap on *that message* finds nothing.
 * It says nothing about other messages: two confirmations sent by two commands
 * hold two markers, and each can still be pressed once - {@link forgetCallback}
 * the older one if only the newest may act.
 *
 * "At most once", not "exactly once": the marker is consumed before your handler
 * does its work, and the session flush persists that even if the handler throws.
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
  const table = replyState(ctx).presses;
  const entry = table[pressed];
  if (entry === undefined) return undefined;
  if (options?.once === true) delete table[pressed];
  return entry.marker as M;
}

/** Forget a pending press expectation (a keyboard that is no longer live). */
export function forgetCallback(ctx: Context, messageId: number): void {
  delete replyState(ctx).presses[messageId];
}

/**
 * Reply and callback tracking for plain **string** tags. Markers are objects, so
 * a bare `"EMAIL"` cannot be stored directly; this boxes it as `{ tag }` on write
 * and unboxes it on read. One `Tag` union types both ends, so the stored and
 * matched tags cannot drift apart.
 *
 * `expectPress` / `matchPress` / `forgetPress` are the callback-query peers,
 * keeping the non-consuming default of {@link matchCallback}.
 *
 * @example
 * taggedReplies<"NAME" | "EMAIL">(ctx).expect(sent.message_id, "EMAIL");
 * const tag = taggedReplies<"NAME" | "EMAIL">(ctx).match(); // "NAME" | "EMAIL" | undefined
 */
export function taggedReplies<Tag extends string>(
  ctx: Context,
): {
  expect(messageId: number, tag: Tag, options?: ExpectOptions): void;
  match(): Tag | undefined;
  forget(messageId: number): void;
  expectPress(messageId: number, tag: Tag, options?: ExpectOptions): void;
  matchPress(options?: { once?: boolean }): Tag | undefined;
  forgetPress(messageId: number): void;
} {
  return {
    expect: (messageId, tag, options) => expectReply(ctx, messageId, { tag }, options),
    match: () => matchReply<{ tag: Tag }>(ctx)?.tag,
    forget: (messageId) => forgetReply(ctx, messageId),
    expectPress: (messageId, tag, options) => expectCallback(ctx, messageId, { tag }, options),
    matchPress: (options) => matchCallback<{ tag: Tag }>(ctx, options)?.tag,
    forgetPress: (messageId) => forgetCallback(ctx, messageId),
  };
}
