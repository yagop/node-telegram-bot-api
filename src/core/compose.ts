/**
 * Typed koa-compose — chains middleware into a single composed function.
 *
 * Each middleware receives the shared context and a `next` it may await to
 * pass control downstream. Calling `next()` more than once in the same
 * middleware is a programmer error and throws (the classic koa guard).
 */

export type NextFunction = () => Promise<void>;

export type Middleware<C> = (ctx: C, next: NextFunction) => Promise<void> | void;

/**
 * Compose an array of middleware into one `(ctx, next?) => Promise<void>`.
 * The optional outer `next` runs after the last middleware in the chain.
 */
export function compose<C>(
  middleware: readonly Middleware<C>[],
): (ctx: C, next?: NextFunction) => Promise<void> {
  return function composed(ctx: C, next?: NextFunction): Promise<void> {
    let lastIndex = -1;

    function dispatch(i: number): Promise<void> {
      if (i <= lastIndex) {
        return Promise.reject(new Error("next() called multiple times"));
      }
      lastIndex = i;

      const fn = i === middleware.length ? next : middleware[i];
      if (!fn) {
        return Promise.resolve();
      }

      try {
        return Promise.resolve(fn(ctx, () => dispatch(i + 1)));
      } catch (err) {
        return Promise.reject(err);
      }
    }

    return dispatch(0);
  };
}
