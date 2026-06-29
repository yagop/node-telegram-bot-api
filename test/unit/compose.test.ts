import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { compose, type Middleware } from "../../src/core/compose.js";

interface Ctx {
  log: string[];
}

describe("compose", () => {
  test("runs middleware in order with before/after markers", async () => {
    const ctx: Ctx = { log: [] };
    const a: Middleware<Ctx> = async (c, next) => {
      c.log.push("a:before");
      await next();
      c.log.push("a:after");
    };
    const b: Middleware<Ctx> = async (c, next) => {
      c.log.push("b:before");
      await next();
      c.log.push("b:after");
    };
    await compose([a, b])(ctx);
    assert.deepStrictEqual(ctx.log, ["a:before", "b:before", "b:after", "a:after"]);
  });

  test("short-circuits when a middleware does not call next()", async () => {
    const ctx: Ctx = { log: [] };
    const a: Middleware<Ctx> = (c) => {
      c.log.push("a");
      // intentionally does not call next()
    };
    const b: Middleware<Ctx> = (c) => {
      c.log.push("b");
    };
    await compose([a, b])(ctx);
    assert.deepStrictEqual(ctx.log, ["a"]);
  });

  test("calling next() twice rejects", async () => {
    const ctx: Ctx = { log: [] };
    const bad: Middleware<Ctx> = async (_c, next) => {
      await next();
      await next();
    };
    await assert.rejects(compose([bad])(ctx), /next\(\) called multiple times/);
  });

  test("trailing next is invoked after the chain", async () => {
    const ctx: Ctx = { log: [] };
    const a: Middleware<Ctx> = async (c, next) => {
      c.log.push("a");
      await next();
    };
    await compose([a])(ctx, async () => {
      ctx.log.push("tail");
    });
    assert.deepStrictEqual(ctx.log, ["a", "tail"]);
  });
});
