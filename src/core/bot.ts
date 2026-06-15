/**
 * Bot — the composition root.
 *
 * Owns the {@link Api} client and an ordered middleware stack. `use`/`on`/
 * `command`/`hears` register middleware; `handleUpdate` builds a {@link Context}
 * and runs the composed chain; `start`/`stop` drive an update source (long-poll
 * by default) through an `AbortController`.
 */

import type { Update, UpdateKind } from "../types/v2.js";
import { compose, type Middleware } from "./compose.js";
import { Context } from "./context.js";
import { Api, type TransportOptions } from "./client.js";
import { longPoll, type PollOptions } from "./sources.js";

export type Handler = (ctx: Context) => unknown | Promise<unknown>;

export interface BotOptions extends TransportOptions {
  onError?: (err: unknown, ctx: Context) => void | Promise<void>;
}

export class Bot {
  readonly api: Api;

  private readonly middleware: Middleware<Context>[] = [];
  private readonly onError?: (err: unknown, ctx: Context) => void | Promise<void>;
  private controller?: AbortController;

  constructor(token: string, options: BotOptions = {}) {
    this.api = new Api(token, options);
    this.onError = options.onError;
  }

  /** Register a middleware that runs for every update. */
  use(mw: Middleware<Context>): this {
    this.middleware.push(mw);
    return this;
  }

  /** Run `handler` only for updates whose `kind` matches. */
  on(kind: UpdateKind | UpdateKind[], handler: Handler): this {
    const kinds = Array.isArray(kind) ? kind : [kind];
    return this.use(async (ctx, next) => {
      if (kinds.includes(ctx.kind)) {
        await handler(ctx);
      } else {
        await next();
      }
    });
  }

  /** Run `handler` for `/name` commands. */
  command(name: string, handler: Handler): this {
    return this.use(async (ctx, next) => {
      if (ctx.command === name) {
        await handler(ctx);
      } else {
        await next();
      }
    });
  }

  /** Run `handler` when the message text matches `trigger`. */
  hears(trigger: string | RegExp, handler: Handler): this {
    return this.use(async (ctx, next) => {
      const text = ctx.message?.text;
      const matched =
        text !== undefined &&
        (typeof trigger === "string" ? text === trigger : trigger.test(text));
      if (matched) {
        await handler(ctx);
      } else {
        await next();
      }
    });
  }

  /** Dispatch a single update through the composed middleware chain. */
  async handleUpdate(update: Update): Promise<void> {
    const ctx = new Context(update, this.api);
    try {
      await compose(this.middleware)(ctx);
    } catch (err) {
      if (this.onError) {
        await this.onError(err, ctx);
      } else {
        throw err;
      }
    }
  }

  /** Consume an update source (long-poll by default) until {@link stop}. */
  async start(source?: AsyncIterable<Update>, pollOptions?: PollOptions): Promise<void> {
    this.controller = new AbortController();
    const updates = source ?? longPoll(this.api, pollOptions, this.controller.signal);
    for await (const update of updates) {
      await this.handleUpdate(update);
    }
  }

  /** Abort the running source. */
  stop(): void {
    this.controller?.abort();
  }
}
