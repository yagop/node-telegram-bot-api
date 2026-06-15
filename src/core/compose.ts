/**
 * Typed koa-compose (ADR-003).
 *
 * Folds an ordered list of middleware into a single function. Each middleware
 * receives the shared context and a `next` it may `await` to run everything
 * downstream; control returns to it once the tail resolves, enabling timing,
 * error boundaries, sessions, and auth to wrap one another. Calling `next()`
 * more than once in a single middleware is a programming error and rejects.
 */

/** Continuation passed to a middleware; awaiting it runs the rest of the chain. */
export type NextFn = () => Promise<void>;

/** A middleware over context `C`. Return value is ignored. */
export type Middleware<C> = (ctx: C, next: NextFn) => unknown | Promise<unknown>;

/**
 * Compose `middleware` into one function with standard koa-compose semantics.
 * The composed function resolves when the whole chain (including the optional
 * trailing `next`) has settled.
 */
export function compose<C>(
  middleware: ReadonlyArray<Middleware<C>>,
): (ctx: C, next?: NextFn) => Promise<void> {
  return function composed(ctx: C, next?: NextFn): Promise<void> {
    // `index` is the last middleware that was invoked; guards double `next()`.
    let lastIndex = -1;

    function dispatch(i: number): Promise<void> {
      if (i <= lastIndex) {
        return Promise.reject(new Error("next() called multiple times"));
      }
      lastIndex = i;

      const fn: Middleware<C> | undefined = i === middleware.length ? next : middleware[i];
      if (!fn) return Promise.resolve();

      try {
        return Promise.resolve(fn(ctx, () => dispatch(i + 1))).then(() => undefined);
      } catch (err) {
        return Promise.reject(err);
      }
    }

    return dispatch(0);
  };
}
