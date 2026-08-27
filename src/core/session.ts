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
 * Storage is injectable via `SessionStore`. The in-memory default is edge-safe
 * (zero `node:*`) but process-local and non-durable; a file / Redis / DynamoDB
 * store implements the same interface and (for the fs-backed ones) lives in
 * `./node` or userland so core stays Node-free.
 */

import type { Middleware } from "./compose.js";
import type { Context } from "./context.js";

/**
 * Minimal async key/value contract a session backend must satisfy. `read`
 * resolves to `undefined` for a missing key; every method may be sync or async
 * so an in-memory `Map` and a networked store share one interface.
 */
export type SessionStore<T> = {
  read(key: string): T | undefined | Promise<T | undefined>;
  write(key: string, value: T): void | Promise<void>;
  delete(key: string): void | Promise<void>;
};

/** Process-local default store. Not durable, not shared across instances. */
export class MemorySessionStore<T> implements SessionStore<T> {
  private readonly map = new Map<string, T>();
  read(key: string): T | undefined {
    return this.map.get(key);
  }
  write(key: string, value: T): void {
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
   * Record that a reply to the message you just sent (`messageId`) is expected,
   * tagging it with `marker`. Pure session write - safe on serverless. Pair the
   * sent message with `reply_markup: { force_reply: true }` so the client quotes
   * it and the reply carries `reply_to_message.message_id`.
   */
  expectReply(messageId: number, marker?: ReplyMarker): void;
  /**
   * If the current update is a reply to a message a prior `expectReply`
   * registered, consume and return its marker; otherwise `undefined`. Matches on
   * `reply_to_message.message_id` within the current key's session.
   */
  matchReply<M extends ReplyMarker = ReplyMarker>(): M | undefined;
};

/** `ctx.state` slot the middleware stashes the handle under; read by `ctx.getSession`. */
export const SESSION_STATE_KEY = "session";

export type SessionOptions<T> = {
  /** Backend for the envelope. Defaults to a process-local `MemorySessionStore`. */
  store?: SessionStore<SessionEnvelope<T>>;
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
export function session<T = Record<string, unknown>>(
  options: SessionOptions<T> = {},
): Middleware<Context> {
  const store = options.store ?? new MemorySessionStore<SessionEnvelope<T>>();
  const getSessionKey = options.getSessionKey ?? defaultKey;
  const initial = options.initial ?? (() => ({}) as T);

  return async (ctx, next) => {
    const key = getSessionKey(ctx);
    if (key === undefined) {
      return next();
    }

    const loaded = await store.read(key);
    const envelope: SessionEnvelope<T> = loaded ?? { data: initial(ctx), awaiting: {} };

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
