/**
 * Opt-in session middleware: a persistent, keyed bag of state per chat (or per
 * whatever `getSessionKey` returns), read before the handler and written back
 * after.
 *
 * Shape of the layer:
 *
 * - `SessionStore` is a **string** key/value contract (`read` / `write` /
 *   `delete`, plus optional `init` / `close`). Serialization happens exactly
 *   once, here in the middleware's codec - never inside a store - so an
 *   in-memory store is a faithful simulation of a durable one: a `Date` in the
 *   bag comes back a string everywhere, not only on Redis.
 * - The persisted value is a **versioned envelope**: `{ v, data, ext, createdAt,
 *   updatedAt }`. `data` is the caller's bag; `ext` is a namespace map that
 *   layers built on sessions (see `reply-tracking.ts`) claim a slot in, so a
 *   feature can be added or changed without touching the session format; the two
 *   ISO-8601 timestamps are first-seen / last-active, readable on the handle.
 * - Handlers reach the session through `ctx.getSession<T>()`, which reads the
 *   handle the middleware installs in `ctx.state` under
 *   {@link SESSION_STATE_KEY}. The middleware also carries `.get(ctx)` - the
 *   same handle, typed once at construction - for code that prefers not to
 *   re-assert `<T>` per call site.
 * - Updates for the same key are **serialized in-process** by a per-key lock, so
 *   concurrent webhook invocations cannot interleave read-modify-write. Across
 *   processes the last writer wins.
 * - The flush is **skipped when nothing changed** (byte-compare of the encoded
 *   envelope), so an untouched chat costs one read and no write.
 *
 * Nothing is kept in process memory between updates - only what the store
 * persists - so the same code behaves identically under long-polling and under
 * one-invocation-per-update serverless.
 *
 * The stores themselves live next door, each where its runtime is allowed:
 * `MemorySessionStorage` (`./memory-session-storage.ts`, core/edge-safe),
 * `FileSessionStorage` (`src/node`), and the Bun-native SQLite / SQL / Redis
 * stores (`src/bun`).
 */

import type { Middleware } from "./compose.js";
import type { Context } from "./context.js";

/** Per-write hints. A store ignores what it cannot honor. */
export type SessionWriteOptions = {
  /** Expire the key this many seconds after the write, if the backend supports TTL. */
  ttlSeconds?: number;
};

/**
 * Minimal key/value contract a session backend must satisfy. Deliberately
 * **string-valued and non-generic**: the middleware owns encoding, so a store
 * never parses, never holds a live object, and can be swapped without changing
 * what round-trips.
 */
export type SessionStore = {
  /** The stored string for `key`, or `undefined` when there is none. */
  read(key: string): string | undefined | Promise<string | undefined>;
  /** Persist `value` verbatim under `key`. */
  write(key: string, value: string, options?: SessionWriteOptions): void | Promise<void>;
  delete(key: string): void | Promise<void>;
  /**
   * Re-set `key`'s expiry without rewriting its value. Only stores with a TTL
   * need it: the middleware skips the write when nothing changed, so without a
   * `touch` an active chat whose data happens not to change would still expire.
   * Stores with no TTL omit it (there is nothing to refresh).
   */
  touch?(key: string, ttlSeconds: number): void | Promise<void>;
  /**
   * Optional one-time setup (create a directory / table, open a connection).
   * Idempotent; `Bot` runs it once at startup via the middleware's `init()`, so
   * a bad path or an unreachable backend fails at boot, not on update #1.
   */
  init?(): void | Promise<void>;
  /** Optional teardown (close a pool / connection); run by `bot.close()`. */
  close?(): void | Promise<void>;
};

/** How a value is turned into the string a store persists. Default: JSON. */
export type SessionCodec = {
  encode(envelope: unknown): string;
  decode(raw: string): unknown;
};

const jsonCodec: SessionCodec = {
  encode: (envelope) => JSON.stringify(envelope),
  decode: (raw) => JSON.parse(raw) as unknown,
};

/** Current envelope version, stamped on every write so a future format can migrate. */
export const SESSION_VERSION = 1;

/**
 * What actually gets persisted per key: the caller's `data` bag plus `ext`, the
 * namespace map that session-backed layers (reply tracking, and anything else
 * built the same way) store their own state under. One store round-trip covers
 * all of them.
 */
export type SessionEnvelope<T> = {
  /** Format version ({@link SESSION_VERSION}). */
  v: number;
  /** The caller's bag. */
  data: T;
  /** Per-layer state, keyed by namespace. Absent until a layer writes. */
  ext?: Record<string, unknown>;
  /**
   * ISO-8601 UTC timestamp of the first write for this key ("first seen"),
   * carried unchanged through every later write.
   */
  createdAt: string;
  /**
   * ISO-8601 UTC timestamp of the most recent write ("last active"). Bumped
   * only when the flush actually persists something, so an untouched chat does
   * not churn the row.
   */
  updatedAt: string;
};

/**
 * `ctx.state` slot the middleware stashes the handle under; read by
 * `ctx.getSession()`. With more than one session middleware registered, the
 * last one to run for an update owns the slot.
 */
export const SESSION_STATE_KEY = "session";

/**
 * The typed handle `session.get(ctx)` returns. `data` is the persistent bag
 * (mutate in place, or reassign - it flushes after the handler); `ext` is how a
 * layer claims its own namespace; `delete()` drops the whole key on flush.
 */
export type SessionHandle<T> = {
  /** The persistent, per-key bag. */
  data: T;
  /**
   * When this session was first persisted ("first seen"). For a session that
   * has never been written, this update's timestamp.
   */
  readonly createdAt: Date;
  /**
   * When this session was last persisted ("last active") - as loaded, i.e. the
   * *previous* write, not this update's pending one.
   */
  readonly updatedAt: Date;
  /**
   * State slot for a layer built on top of sessions, created from `initial` on
   * first use. Persisted inside the same envelope under `namespace`, so the
   * layer costs no extra round-trip and no change to the session format. Use a
   * distinct, stable `namespace` per layer (`"reply"`, `"scene"`, ...).
   *
   * The stored slot is untrusted (a foreign writer, a hand edit, an older
   * layout), so pass `isValid` to have a slot that fails the check replaced by a
   * fresh `initial()` instead of reaching the layer half-formed.
   */
  ext<E extends object>(namespace: string, initial: () => E, isValid?: (slot: Record<string, unknown>) => boolean): E;
  /**
   * Drop this key from the store when the handler finishes (an explicit
   * eviction: end-of-conversation, a `/forget` command, GDPR erasure). Later
   * mutations in the same update are discarded.
   */
  delete(): void;
};

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
  /** Encoding used for the envelope. Default: JSON. */
  codec?: SessionCodec;
  /** Expire idle sessions after this many seconds, on stores that support TTL. */
  ttlSeconds?: number;
  /**
   * Clock for `createdAt` / `updatedAt`, in epoch milliseconds. Defaults to
   * `Date.now`; inject one to make timestamps deterministic in tests.
   */
  now?: () => number;
};

/**
 * The value `session()` returns: the middleware itself, plus the typed accessor
 * and the lifecycle hooks `Bot` picks up from `use()`.
 */
export type SessionMiddleware<T> = Middleware<Context> & {
  /**
   * The session handle for this update. Throws if the middleware has not run
   * for it (not registered, or the update had no derivable key) - use
   * {@link SessionMiddleware.find} when a keyless update is expected.
   */
  get(ctx: Context): SessionHandle<T>;
  /** The handle, or `undefined` when this update has no session. */
  find(ctx: Context): SessionHandle<T> | undefined;
  /** Run the store's setup once (memoized, retried after a failure). */
  init(): Promise<void>;
  /** Release the store's resources. */
  close(): Promise<void>;
};

/** Default key: one session per chat. Updates with no chat (poll answers, ...) skip. */
function defaultKey(ctx: Context): string | undefined {
  return ctx.chatId === undefined ? undefined : `chat:${ctx.chatId}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Serializes work per key within this process. Long-polling already dispatches
 * updates one at a time, but webhook invocations do not: without this, two
 * updates for one chat interleave read-modify-write and the later flush drops
 * the earlier one's mutations. Across processes there is no lock: two instances
 * handling updates for one chat are last-writer-wins.
 */
function createKeyLock(): <R>(key: string, fn: () => Promise<R>) => Promise<R> {
  const tails = new Map<string, Promise<void>>();
  return async function runExclusive<R>(key: string, fn: () => Promise<R>): Promise<R> {
    const prev = tails.get(key) ?? Promise.resolve();
    let release!: () => void;
    const mine = new Promise<void>((resolve) => {
      release = resolve;
    });
    // `prev` never rejects: `mine` always resolves in the `finally` below.
    const tail = prev.then(() => mine);
    tails.set(key, tail);
    await prev;
    try {
      return await fn();
    } finally {
      release();
      // Nothing queued behind us (the map still holds our tail) -> drop the entry
      // so the map does not grow with every key ever seen. Runs synchronously
      // with `release()`, so no waiter can slip in between.
      if (tails.get(key) === tail) tails.delete(key);
    }
  };
}

/**
 * Build the session middleware. The result is callable (`bot.use(session)`) and
 * carries `.get(ctx)` - typed once here, so handlers need no per-call generic
 * and no cast:
 *
 * ```ts
 * const session = createSession<Session>({ store: new MemorySessionStorage() });
 * bot.use(session);
 * bot.command("start", (ctx) => { session.get(ctx).data.count += 1; });
 * ```
 *
 * Updates with no derivable key run downstream untouched (`get()` throws,
 * `find()` returns `undefined`), so guard access when your bot sees keyless
 * updates, or narrow with `on(...)` first.
 *
 * The envelope is flushed after the handler even if it throws, so a marker
 * written before an error still persists - and only when it actually changed.
 */
export function createSession<T = Record<string, unknown>>(options: SessionOptions<T>): SessionMiddleware<T> {
  const store = options.store;
  const getSessionKey = options.getSessionKey ?? defaultKey;
  const initial = options.initial ?? (() => ({}) as T);
  const codec = options.codec ?? jsonCodec;
  const ttlSeconds = options.ttlSeconds;
  const now = options.now ?? Date.now;
  const handles = new WeakMap<Context, SessionHandle<T>>();
  const runExclusive = createKeyLock();

  let setup: Promise<void> | undefined;
  const init = (): Promise<void> => {
    if (setup === undefined) {
      setup = Promise.resolve(store.init?.()).then(
        () => {},
        (err: unknown) => {
          setup = undefined; // a transient failure must not be cached forever
          throw err;
        },
      );
    }
    return setup;
  };

  const middleware = async (ctx: Context, next: () => Promise<void>): Promise<void> => {
    const key = getSessionKey(ctx);
    if (key === undefined) {
      return next();
    }
    // Normally already resolved (Bot runs init() at startup); this covers a
    // middleware driven directly, e.g. in tests.
    await init();

    await runExclusive(key, async () => {
      const stored = await store.read(key);
      const envelope = decodeEnvelope(stored, ctx);
      const before = codec.encode(envelope);
      let dropped = false;

      const handle: SessionHandle<T> = {
        data: envelope.data,
        createdAt: new Date(envelope.createdAt),
        updatedAt: new Date(envelope.updatedAt),
        ext<E extends object>(
          namespace: string,
          makeInitial: () => E,
          isValid?: (slot: Record<string, unknown>) => boolean,
        ): E {
          const ext = (envelope.ext ??= {});
          const current = ext[namespace];
          if (!isPlainObject(current) || (isValid !== undefined && !isValid(current))) {
            const fresh = makeInitial();
            ext[namespace] = fresh;
            return fresh;
          }
          return current as E;
        },
        delete() {
          dropped = true;
        },
      };
      handles.set(ctx, handle);
      // Also published on `ctx.state`, which is what `ctx.getSession()` reads -
      // the middleware instance is not in scope inside a handler.
      ctx.state[SESSION_STATE_KEY] = handle;

      try {
        await next();
      } finally {
        await flush(key, handle, envelope, before, stored !== undefined, dropped);
      }
    });
  };

  /** Decode a stored value into a well-formed envelope, or start a fresh one. */
  function decodeEnvelope(raw: string | undefined, ctx: Context): SessionEnvelope<T> {
    // A parse failure is loud: corrupt bytes mean a broken backend or a foreign
    // writer, and silently resetting would look like data loss. A *parsed* value
    // that is not a well-formed envelope (schema change, hand edit) starts fresh.
    const stored = raw === undefined ? undefined : codec.decode(raw);
    const timestamp = new Date(now()).toISOString();
    if (!isPlainObject(stored)) {
      return { v: SESSION_VERSION, data: initial(ctx), createdAt: timestamp, updatedAt: timestamp };
    }
    // A record written before timestamps existed (or by a foreign writer) has
    // none: treat now as its first sighting rather than inventing a past.
    return {
      v: SESSION_VERSION,
      data: (stored.data ?? initial(ctx)) as T,
      ...(isPlainObject(stored.ext) ? { ext: stored.ext } : {}),
      createdAt: typeof stored.createdAt === "string" ? stored.createdAt : timestamp,
      updatedAt: typeof stored.updatedAt === "string" ? stored.updatedAt : timestamp,
    };
  }

  /** Write back the envelope - only if it changed, and only if not dropped. */
  async function flush(
    key: string,
    handle: SessionHandle<T>,
    envelope: SessionEnvelope<T>,
    before: string,
    existed: boolean,
    dropped: boolean,
  ): Promise<void> {
    if (dropped) {
      if (existed) await store.delete(key);
      return;
    }
    // `handle.data` may have been reassigned to a fresh object; re-read it.
    envelope.data = handle.data;
    // Compare with `updatedAt` still at its loaded value, so "did anything
    // change?" is about the content - stamping the clock first would make every
    // update look dirty and defeat the skip.
    if (codec.encode(envelope) === before) {
      // Untouched (or a brand-new, still-empty session). Nothing to persist -
      // but an existing row's TTL must not lapse just because this update
      // changed nothing, so refresh it in place.
      if (existed && ttlSeconds !== undefined) await store.touch?.(key, ttlSeconds);
      return;
    }

    envelope.updatedAt = new Date(now()).toISOString();
    await store.write(key, codec.encode(envelope), { ttlSeconds });
  }

  return Object.assign(middleware, {
    get(ctx: Context): SessionHandle<T> {
      const handle = handles.get(ctx);
      if (handle === undefined) {
        throw new Error("session.get: the session middleware did not run for this update (no key, or not registered)");
      }
      return handle;
    },
    find(ctx: Context): SessionHandle<T> | undefined {
      return handles.get(ctx);
    },
    init,
    async close(): Promise<void> {
      // Close first, then drop the memo. After the store is closed setup is no
      // longer "done", so a later init() must run it again (a re-`run(bot)` in
      // one process would otherwise keep using a closed pool / database handle);
      // clearing it up front would instead let an update still in flight re-run
      // setup behind the teardown's back.
      await store.close?.();
      setup = undefined;
    },
  });
}

/** Alias for {@link createSession} - `bot.use(session({ store }))` reads naturally. */
export const session = createSession;
