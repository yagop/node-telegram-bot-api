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
 * TTL bounds a marker's age, not the table's size. For a hard per-chat cap pass
 * {@link ReplyTrackingOptions} to `createSession({ store, replyTracking })`:
 * `maxEntriesPerChat` / `maxBytesPerChat` evict the least-recently-used markers once a budget
 * is exceeded (recency, not age, so an active old keyboard outlives an idle newer
 * one), `defaultTtlSeconds` gives every expectation a TTL, and `slidingTtl`
 * re-arms it on use. All opt-in; with no `replyTracking` the tables are unbounded.
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
   * Drop this expectation after so many seconds. Overrides
   * {@link ReplyTrackingOptions.defaultTtlSeconds} for this one call. There is no
   * cap: a prompt waiting for tomorrow's reply is legitimate, so nothing expires
   * unless you (or a default) say so. Set it for prompts that go stale (a
   * confirmation, a one-time code) to keep an unanswered chat's envelope from
   * growing forever.
   */
  ttlSeconds?: number;
};

/**
 * Per-chat bounds for the reply/press tables, passed to `createSession()` and
 * read off the session by this layer. All optional; with none set the tables are
 * unbounded (the historic behavior) and grow until entries are matched, forgotten,
 * or expire.
 *
 * TTL caps a marker's *age* but not the table's *size*: a chat that fires many
 * short-lived keyboards can still balloon between prunes. `maxEntriesPerChat` /
 * `maxBytesPerChat` bound the size, evicting the least-recently-used markers once a
 * budget is exceeded - "least-recently-used", not "oldest", because an active old
 * keyboard must outlive an idle newer one. Recency (`lastUsedAt`) is stamped on
 * both record and match, so a matched-but-kept press marker (a live inline
 * keyboard) counts as fresh.
 */
export type ReplyTrackingOptions = {
  /**
   * Cap on the total number of live markers across both tables for one key. When
   * a record pushes past it, the least-recently-used markers are evicted down to
   * the cap.
   */
  maxEntriesPerChat?: number;
  /**
   * Cap on the serialized (UTF-8) byte size of this key's reply namespace. After
   * a record, least-recently-used markers are evicted until the namespace fits.
   */
  maxBytesPerChat?: number;
  /** TTL (seconds) applied to any expectation recorded without its own `ttlSeconds`. */
  defaultTtlSeconds?: number;
  /**
   * Refresh a marker's TTL from "now" each time it is used (recorded or matched),
   * so an actively-used expectation does not expire mid-conversation. Only markers
   * that carry a TTL are affected.
   */
  slidingTtl?: boolean;
  /**
   * Clock in epoch milliseconds, for the TTL and recency stamps. Defaults to
   * `Date.now`; inject one to make eviction deterministic in tests.
   */
  now?: () => number;
};

/**
 * One recorded expectation: the caller's marker, its deadline if it has one,
 * `lastUsedAt` for LRU ordering (stamped only when a size budget is configured),
 * and `ttlMs` (the window to re-arm on use) only when `slidingTtl` is on.
 */
type Entry = { marker: ReplyMarker; expiresAt?: number; lastUsedAt?: number; ttlMs?: number };

/** The two tables, keyed by the id of the message we sent. */
type ReplyState = {
  replies: Record<number, Entry>;
  presses: Record<number, Entry>;
};

function isTable(value: unknown): boolean {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** State + resolved config + a single "now" for one layer touch. */
type Touched = { state: ReplyState; config: ReplyTrackingOptions | undefined; now: number };

/**
 * This key's tables, created on first use inside the session envelope, with
 * expired entries pruned, plus the resolved config and a single `now`. The stored
 * slot is untrusted (a foreign writer, a hand edit, an older layout), so one
 * missing either table is replaced by a fresh pair rather than blowing up on the
 * first write.
 */
function touch(ctx: Context): Touched {
  const handle = ctx.getSession();
  const config = handle.replyTracking;
  const now = (config?.now ?? Date.now)();
  const state = handle.ext<ReplyState>(
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
  return { state, config, now };
}

function record(
  table: Record<number, Entry>,
  messageId: number,
  marker: ReplyMarker,
  options: ExpectOptions | undefined,
  config: ReplyTrackingOptions | undefined,
  now: number,
): void {
  const ttlSeconds = options?.ttlSeconds ?? config?.defaultTtlSeconds;
  const entry: Entry = { marker };
  if (ttlSeconds !== undefined) {
    entry.expiresAt = now + ttlSeconds * 1000;
    if (config?.slidingTtl === true) entry.ttlMs = ttlSeconds * 1000;
  }
  // Recency is only worth its bytes when a size budget (the only reader of
  // `lastUsedAt`) is set; sliding TTL rides on `ttlMs` / `expiresAt` instead.
  if (hasBudget(config)) entry.lastUsedAt = now;
  table[messageId] = entry;
}

/** Whether an LRU size budget is configured - the only thing that reads `lastUsedAt`. */
function hasBudget(config: ReplyTrackingOptions | undefined): boolean {
  return config !== undefined && (config.maxEntriesPerChat !== undefined || config.maxBytesPerChat !== undefined);
}

/** Mark a kept marker as just used: slide its TTL if it has one, and bump recency for the LRU. */
function used(entry: Entry, config: ReplyTrackingOptions | undefined, now: number): void {
  if (config === undefined) return;
  if (entry.ttlMs !== undefined) entry.expiresAt = now + entry.ttlMs;
  if (hasBudget(config)) entry.lastUsedAt = now;
}

function byteLength(state: ReplyState): number {
  return new TextEncoder().encode(JSON.stringify(state)).length;
}

/** One marker with the table and id it lives under, for eviction. */
type Ref = { table: Record<number, Entry>; id: number; entry: Entry };

/**
 * Every marker across both tables, least-recently-used first. A missing recency
 * stamp (legacy / foreign) sorts as oldest; ties break on message id, so eviction
 * is deterministic without a fine-grained clock.
 */
function lruOrder(state: ReplyState): Ref[] {
  const refs: Ref[] = [];
  for (const table of [state.replies, state.presses]) {
    for (const [id, entry] of Object.entries(table)) refs.push({ table, id: Number(id), entry });
  }
  return refs.sort((a, b) => (a.entry.lastUsedAt ?? 0) - (b.entry.lastUsedAt ?? 0) || a.id - b.id);
}

/**
 * Evict the least-recently-used markers across both tables until the configured
 * `maxEntriesPerChat` and `maxBytesPerChat` budgets are met. A no-op when neither is set.
 */
function evict(state: ReplyState, config: ReplyTrackingOptions | undefined): void {
  const { maxEntriesPerChat, maxBytesPerChat } = config ?? {};
  if (maxEntriesPerChat === undefined && maxBytesPerChat === undefined) return;

  const victims = lruOrder(state);
  let i = 0;
  const dropNext = (): void => {
    const ref = victims[i++];
    if (ref !== undefined) delete ref.table[ref.id];
  };

  // `i < victims.length` also guards a negative/NaN `maxEntriesPerChat` from underflowing
  // past the last victim (which would deref `undefined`); it just evicts down to empty.
  while (maxEntriesPerChat !== undefined && i < victims.length && victims.length - i > maxEntriesPerChat) dropNext();
  while (maxBytesPerChat !== undefined && i < victims.length && byteLength(state) > maxBytesPerChat) dropNext();
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
  const { state, config, now } = touch(ctx);
  record(state.replies, messageId, marker, options, config, now);
  evict(state, config);
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
  const table = touch(ctx).state.replies;
  const entry = table[repliedTo];
  if (entry === undefined) return undefined;
  delete table[repliedTo];
  return entry.marker as M;
}

/** Forget a pending reply expectation (a prompt that timed out, or was cancelled). */
export function forgetReply(ctx: Context, messageId: number): void {
  delete touch(ctx).state.replies[messageId];
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
  const { state, config, now } = touch(ctx);
  record(state.presses, messageId, marker, options, config, now);
  evict(state, config);
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
  const { state, config, now } = touch(ctx);
  const table = state.presses;
  const entry = table[pressed];
  if (entry === undefined) return undefined;
  // A live keyboard is kept, so count this press as a use (recency + sliding TTL);
  // a `once` press is consumed and needs neither.
  if (options?.once === true) delete table[pressed];
  else used(entry, config, now);
  return entry.marker as M;
}

/** Forget a pending press expectation (a keyboard that is no longer live). */
export function forgetCallback(ctx: Context, messageId: number): void {
  delete touch(ctx).state.presses[messageId];
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
