/**
 * Opt-in session middleware + the reply-tracking helpers (phase 1).
 *
 * Attaches a persistent, keyed `ctx.session` bag on top of the per-update
 * `ctx.state`, plus two Lambda-safe helpers - `ctx.expectReply` /
 * `ctx.matchReply` - that record and match "waiting for a reply to a specific
 * message" as plain session data (a marker), never a live Promise. Because the
 * whole thing is read-through / write-back around one store, it behaves the
 * same under long-polling and under one-invocation-per-update serverless: no
 * continuation survives across updates, only the persisted marker does.
 *
 * Storage is injectable via `SessionStore` and required - no implicit default,
 * so the durability choice is always explicit. `MemorySessionStorage` (here) is
 * edge-safe (zero `node:*`) but process-local and non-durable; a file / Redis /
 * DynamoDB store implements the same interface and (for the fs-backed ones)
 * lives in `./node` or userland so core stays Node-free.
 */

import type { Middleware } from "./compose.js";
import type { Context } from "./context.js";

/**
 * Minimal async key/value contract a session backend must satisfy - a
 * value-agnostic KV store, deliberately not generic. `read` resolves to
 * `undefined` for a missing key and to `unknown` otherwise (bytes off a durable
 * backend are untrusted until the middleware interprets them); every method may
 * be sync or async so an in-memory `Map` and a networked store share one shape.
 */
export type SessionStore = {
  read<V>(key: string): V | undefined | Promise<V | undefined>;
  write(key: string, value: unknown): void | Promise<void>;
  delete(key: string): void | Promise<void>;
  /**
   * Optional one-time setup (create a directory / table, open a connection).
   * Idempotent and safe to call repeatedly - stores memoize it. `session()`
   * kicks it off when the middleware is built and awaits it before the first
   * read, so setup overlaps startup; `await store.init()` yourself before
   * `bot.use` to fail fast at boot on a bad path / unreachable backend instead
   * of on the first update. Stores needing no async setup omit it.
   */
  init?(): Promise<void>;
};

/**
 * Process-local, in-memory store. Zero-dependency and edge-safe, but not durable
 * and not shared across instances - state is lost on restart and never leaves the
 * process, so it is for long-polling / single-process bots, never serverless. Pass
 * it explicitly (`session({ store: new MemorySessionStorage() })`) so the choice of
 * a non-durable backend is deliberate; for durability use `FileSessionStorage`
 * (`./node`) or a networked store.
 */
export class MemorySessionStorage implements SessionStore {
  private readonly map = new Map<string, unknown>();
  read<V>(key: string): V | undefined {
    return this.map.get(key) as V | undefined;
  }
  write(key: string, value: unknown): void {
    this.map.set(key, value);
  }
  delete(key: string): void {
    this.map.delete(key);
  }
}

/** Opaque, JSON-serializable tag a caller attaches to an awaited reply. */
export type ReplyMarker = Record<string, unknown>;

/**
 * What actually gets persisted per key: the caller's `data` bag plus the
 * reply-await table (`message_id we sent -> marker`). Kept as one envelope so a
 * single store round-trip covers both; callers never see `awaiting` - they use
 * `expectReply` / `matchReply`.
 */
export type SessionEnvelope<T> = { data: T; awaiting: Record<number, ReplyMarker> };

/**
 * The typed handle `ctx.getSession<T>()` returns once `session()` has run. `data`
 * is the persistent bag (mutate in place, or reassign - it flushes after the
 * handler); the two reply helpers are scoped here rather than on `ctx`, so the
 * `Context` shape is untouched and needs no cast.
 */
export type SessionHandle<T> = {
  /** The persistent, per-key bag. */
  data: T;
  /**
   * Record that a reply to the message you just sent (`messageId`) is expected.
   *
   * `marker` is arbitrary JSON you attach to that specific message; when the
   * reply arrives, {@link matchReply} hands it back so you know *which* prompt
   * is being answered. That is the point of it: a chat can have several prompts
   * outstanding at once (name, then email, ...), each its own sent message, and
   * the marker is how you tell their replies apart - e.g. `{ step: "email" }`.
   * If you only ever have one prompt in flight, `marker` can be omitted (it
   * defaults to `{}`) and its presence is enough.
   *
   * Pure session write - safe on serverless. Pair the sent message with
   * `reply_markup: { force_reply: true }` so the client quotes it and the reply
   * carries `reply_to_message.message_id`.
   */
  expectReply(messageId: number, marker?: ReplyMarker): void;
  /**
   * If the current update is a reply to a message a prior {@link expectReply}
   * registered (matched on `reply_to_message.message_id` within this key's
   * session), consume and return that message's `marker`; otherwise `undefined`.
   * Returns `undefined` for a non-reply, or a reply to an unregistered message -
   * so a handler typically does `const hit = matchReply(); if (!hit) return next();`.
   *
   * `M` is a type-only assertion for the marker you stored (like the `<T>` on
   * `getSession`): it types the return value, generates no runtime check, and
   * takes no argument - the message id is read from the current update.
   */
  matchReply<M extends ReplyMarker = ReplyMarker>(): M | undefined;
};

/** `ctx.state` slot the middleware stashes the handle under; read by `ctx.getSession`. */
export const SESSION_STATE_KEY = "session";

export type SessionOptions<T> = {
  /**
   * Backend for the envelope. Required - there is no implicit store, so the
   * durability choice is always explicit (a silent memory default would look
   * like data loss on serverless). Use `new MemorySessionStorage()` for a
   * single process, `FileSessionStorage` / a networked store for durability.
   */
  store: SessionStore;
  /** Derives the storage key from the update. Default: per-chat (`chat:<id>`). */
  getSessionKey?: (ctx: Context) => string | undefined;
  /** Initial `data` bag for a key with no session yet. Default: `{}`. */
  initial?: (ctx: Context) => T;
};

/** Default key: one session per chat. Updates with no chat (poll answers, ...) skip. */
function defaultKey(ctx: Context): string | undefined {
  return ctx.chatId === undefined ? undefined : `chat:${ctx.chatId}`;
}

/**
 * Middleware that loads the session before `next()` and flushes the (possibly
 * mutated) envelope after - even if a downstream handler throws, so a marker
 * written before an error still persists. Updates with no derivable key run
 * downstream untouched (no `ctx.session`), so guard access when your bot sees
 * keyless updates, or narrow with `on(...)` first.
 */
export function session<T = Record<string, unknown>>(options: SessionOptions<T>): Middleware<Context> {
  const store = options.store;
  const getSessionKey = options.getSessionKey ?? defaultKey;
  const initial = options.initial ?? (() => ({}) as T);

  // Kick off store setup now (at `bot.use` time) so it overlaps startup; ignore
  // the result here (surfaced per-request below) and swallow the rejection so an
  // idle bot doesn't log an unhandled rejection. The store memoizes success, so
  // the per-request `init` below is cheap - and, per its reset-on-failure, still
  // retries after a transient error rather than re-throwing this one promise.
  store.init?.()?.catch(() => {});

  return async (ctx, next) => {
    const key = getSessionKey(ctx);
    if (key === undefined) {
      return next();
    }

    await store.init?.(); // ensure setup completed (rejects here on failure)

    // Normalize the loaded value field-by-field: a store may return `undefined`
    // (missing key), or - after a schema change / hand-edit / foreign write - a
    // value that isn't a well-formed envelope. Optional chaining yields
    // `undefined` for a missing/`data`-less/`awaiting`-less or non-object value,
    // so a malformed record starts fresh instead of throwing on `.awaiting[...]`.
    const loaded = await store.read<Partial<SessionEnvelope<T>>>(key);
    const envelope: SessionEnvelope<T> = {
      data: loaded?.data ?? initial(ctx),
      awaiting: loaded?.awaiting ?? {},
    };

    const handle: SessionHandle<T> = {
      data: envelope.data,
      expectReply(messageId, marker = {}) {
        envelope.awaiting[messageId] = marker;
      },
      matchReply<M extends ReplyMarker = ReplyMarker>(): M | undefined {
        const repliedTo = ctx.message?.reply_to_message?.message_id;
        if (repliedTo === undefined) return undefined;
        const marker = envelope.awaiting[repliedTo];
        if (marker === undefined) return undefined;
        delete envelope.awaiting[repliedTo];
        return marker as M;
      },
    };
    ctx.state[SESSION_STATE_KEY] = handle;

    try {
      await next();
    } finally {
      // `handle.data` may have been reassigned to a fresh object; re-read it.
      envelope.data = handle.data;
      await store.write(key, envelope);
    }
  };
}

/**
 * Typed reply gate for plain **string** tags. `expectReply` / `matchReply` type
 * their marker as an object (`ReplyMarker`), so a bare string like
 * `"EMAIL_REPLY"` cannot be passed directly; this wraps them for a string union
 * `Tag`, boxing it as `{ tag }` on write and unboxing on read. One `Tag` types
 * both ends, so the stored and matched tags cannot drift apart.
 *
 * @example
 * taggedReplies<"NAME" | "EMAIL">(ctx).expect(sent.message_id, "EMAIL");
 * const tag = taggedReplies<"NAME" | "EMAIL">(ctx).match(); // "NAME" | "EMAIL" | undefined
 */
export function taggedReplies<Tag extends string>(ctx: Context): {
  expect(messageId: number, tag: Tag): void;
  match(): Tag | undefined;
} {
  const handle = ctx.getSession();
  return {
    expect: (messageId, tag) => handle.expectReply(messageId, { tag }),
    match: () => handle.matchReply<{ tag: Tag }>()?.tag,
  };
}
