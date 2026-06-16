/**
 * Bot - the composition root (ADR-003, ADR-004, ADR-005).
 *
 * Holds the single `Api`, an ordered middleware list, and an optional error
 * boundary. `use`/`on`/`command`/`hears` all register filter middleware so they
 * interleave with one another and obey registration order. `handleUpdate` is the
 * one dispatch path - shared by `startPolling()` (which pumps any
 * `AsyncIterable<Update>`, defaulting to `longPoll`) and by `webhookCallback`.
 *
 * `startPolling` is the long-poll pump. Webhook mode has no `start` here: it is a
 * request handler (`webhookCallback` / `createWebhookServer`), since polling and
 * webhooks are mutually exclusive and webhook serving stays out of edge-neutral core.
 */

import type { Update, UpdateType } from "../types/index.js";
import { Api } from "./api.js";
import { compose, type Middleware } from "./compose.js";
import { Context } from "./context.js";
import { type LongPollOptions, longPoll } from "./longpoll.js";
import type { TransportOptions } from "./transport.js";

export interface BotOptions extends TransportOptions {}

/** A composed sub-chain used by the routing helpers. */
type Composed = (ctx: Context, next: () => Promise<void>) => Promise<void>;

export class Bot {
  readonly api: Api;

  private readonly middleware: Middleware<Context>[] = [];
  private errorHandler?: (err: unknown, ctx: Context) => unknown;
  private controller?: AbortController;
  private running = false;

  constructor(token: string, options?: BotOptions) {
    this.api = new Api(token, options);
  }

  /** Register one or more middleware to run on every update. */
  use(...mw: Middleware<Context>[]): this {
    this.middleware.push(...mw);
    return this;
  }

  /**
   * Run `handlers` only when the given payload key (e.g. `"message"`,
   * `"callback_query"`) is present on the update.
   */
  on(kind: UpdateType | UpdateType[], ...handlers: Middleware<Context>[]): this {
    const kinds = Array.isArray(kind) ? kind : [kind];
    const run = compose(handlers) satisfies Composed;
    return this.use((ctx, next) => {
      const matched = kinds.some((k) => k in ctx.update);
      return matched ? run(ctx, next) : next();
    });
  }

  /**
   * Match a message/channel-post text starting with `/name` (also `/name@bot`
   * and trailing args). Sets `ctx.match` to the trimmed args string ("" if none).
   */
  command(name: string | string[], ...handlers: Middleware<Context>[]): this {
    const names = (Array.isArray(name) ? name : [name]).map((n) => n.replace(/^\//, ""));
    const re = new RegExp(`^\\/(${names.map(escapeRegExp).join("|")})(@\\w+)?(?:\\s+(.*))?$`, "s");
    const run = compose(handlers) satisfies Composed;
    return this.use((ctx, next) => {
      const text = ctx.message?.text ?? ctx.channelPost?.text;
      if (text === undefined) return next();
      const m = re.exec(text);
      if (!m) return next();
      ctx.match = m[3] ?? "";
      return run(ctx, next);
    });
  }

  /**
   * Match message text: a string matches exactly (sets `ctx.match` to the text);
   * a RegExp matches when `text.match(re)` is non-null (sets `ctx.match` to the
   * `RegExpMatchArray`).
   */
  hears(trigger: string | RegExp | Array<string | RegExp>, ...handlers: Middleware<Context>[]): this {
    const triggers = Array.isArray(trigger) ? trigger : [trigger];
    const run = compose(handlers) satisfies Composed;
    return this.use((ctx, next) => {
      const text = ctx.message?.text;
      if (text === undefined) return next();
      for (const t of triggers) {
        if (typeof t === "string") {
          if (text === t) {
            ctx.match = text;
            return run(ctx, next);
          }
        } else {
          const m = text.match(t);
          if (m) {
            ctx.match = m;
            return run(ctx, next);
          }
        }
      }
      return next();
    });
  }

  /** Install the error boundary. Errors thrown by the chain are routed here. */
  catch(handler: (err: unknown, ctx: Context) => unknown): this {
    this.errorHandler = handler;
    return this;
  }

  /** Build a Context and run the composed chain; route errors to `catch`. */
  async handleUpdate(update: Update): Promise<void> {
    const ctx = new Context(update, this.api);
    try {
      await compose(this.middleware)(ctx, () => Promise.resolve());
    } catch (err) {
      if (this.errorHandler) await this.errorHandler(err, ctx);
      else throw err;
    }
  }

  /**
   * Pump an update source (default `longPoll`) through `handleUpdate` until
   * `stop()` aborts. Resolves when the source is exhausted or aborted. This is
   * long-poll mode; for webhooks use `webhookCallback`/`createWebhookServer`.
   */
  async startPolling(source?: AsyncIterable<Update>, options?: LongPollOptions): Promise<void> {
    const controller = new AbortController();
    this.controller = controller;
    this.running = true;
    const iterable = source ?? longPoll(this.api, options, controller.signal);
    try {
      for await (const update of iterable) {
        if (controller.signal.aborted) break;
        await this.handleUpdate(update);
      }
    } finally {
      this.running = false;
    }
  }

  /** Abort the running pump loop. */
  stop(): void {
    this.controller?.abort();
  }

  isRunning(): boolean {
    return this.running;
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
