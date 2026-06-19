import { test } from "node:test";
import assert from "node:assert/strict";

import { __test } from "../../scripts/generate-docs.js";
const { renderType, slug, byName } = __test;

const T = (o: Record<string, any>) => o;

test("mapped type renders its constraint, modifier, and template value", () => {
  const out = renderType(
    T({
      type: "mapped",
      parameter: "K",
      parameterType: T({ type: "reference", name: "keyof", target: -1 }),
      templateType: T({ type: "reference", name: "Foo" }),
    }),
    true,
    "",
  );
  assert.equal(out, "{ [K in keyof]: Foo }");
});

test("mapped type inlines +readonly and ? modifiers when present", () => {
  const out = renderType(
    T({
      type: "mapped",
      parameter: "P",
      parameterType: T({ type: "reference", name: "keyof", target: -1 }),
      templateType: T({ type: "intrinsic", name: "string" }),
      readonlyModifier: "+",
      optionalModifier: "+",
    }),
    true,
    "",
  );
  assert.equal(out, "{ +readonly [P in keyof]+?: string }");
});

test("template-literal renders head + substitutions + separators", () => {
  // TS source: `${\"on\"|\"off\"}-${T}` -> head="", tail=[[union, "-"], [ref, ""]]
  const out = renderType(
    T({
      type: "template-literal",
      head: "",
      tail: [
        [T({ type: "union", types: [T({ type: "literal", value: "on" }), T({ type: "literal", value: "off" })] }), "-"],
        [T({ type: "reference", name: "T" }), ""],
      ],
    }),
    true,
    "",
  );
  // The union is a *substitution*, so it renders as `${...}`, not inlined.
  assert.equal(out, "`${\"on\" | \"off\"}-${T}`");
});

test("conditional type renders check/extends/true/false with spaces", () => {
  const out = renderType(
    T({
      type: "conditional",
      checkType: T({ type: "reference", name: "T" }),
      extendsType: T({ type: "intrinsic", name: "string" }),
      trueType: T({ type: "intrinsic", name: "number" }),
      falseType: T({ type: "intrinsic", name: "never" }),
    }),
    true,
    "",
  );
  assert.equal(out, "T extends string ? number : never");
});

test("slug preserves underscores (GFM anchors keep them)", () => {
  assert.equal(slug("UPDATE_TYPES"), "update_types");
  assert.equal(slug("SendMessageParams"), "sendmessageparams");
  assert.equal(slug("My Type"), "my-type");
});

test("byName sorts by codepoint, not locale (deterministic across runtimes)", () => {
  const arr = [{ name: "Bot" }, { name: "api" }, { name: "Bot2" }, { name: "_x" }, { name: "Zoo" }];
  const names = byName(arr).map((x) => x.name);
  // codepoint order: uppercase (B,Z) before underscore/ascii-lowercase
  assert.deepEqual(names, ["Bot", "Bot2", "Zoo", "_x", "api"]);
});
