import assert from "node:assert/strict";
import { test } from "node:test";

import { __test } from "../../scripts/generate-docs.js";

const { renderType, slug, byName, emitClass } = __test;

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
    ""
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
    ""
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
        [
          T({
            type: "union",
            types: [T({ type: "literal", value: "on" }), T({ type: "literal", value: "off" })],
          }),
          "-",
        ],
        [T({ type: "reference", name: "T" }), ""],
      ],
    }),
    true,
    ""
  );
  // The union is a *substitution*, so it renders as `${...}`, not inlined.
  assert.equal(out, '`${"on" | "off"}-${T}`');
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
    ""
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

test("emitClass lists every signature of an overloaded method, not just the first", () => {
  // Context.reply is overloaded (object form + positional form); the method
  // table must show both or the positional form every README example uses
  // vanishes from the reference.
  const stringType = T({ type: "intrinsic", name: "string" });
  const signatures = [
    {
      parameters: [T({ name: "params", type: T({ type: "reference", name: "ReplyParams" }) })],
      type: T({ type: "reference", name: "Promise" }),
      comment: T({ summary: [] }),
    },
    {
      parameters: [
        T({ name: "text", type: stringType }),
        T({
          name: "other",
          flags: T({ isOptional: true }),
          type: T({ type: "intrinsic", name: "object" }),
        }),
      ],
      type: T({ type: "reference", name: "Promise" }),
      // The positional overload carries @deprecated as a TypeDoc block tag.
      comment: T({ summary: [], blockTags: [T({ tag: "@deprecated" })] }),
    },
  ];
  const out = emitClass(
    T({
      name: "Ctx",
      kind: 128, // ReflectionKind.Class
      children: [T({ name: "reply", kind: 2048 /* ReflectionKind.Method */, signatures })],
    })
  );
  const row = out.split("\n").find((line) => line.startsWith("| `reply` |"));
  assert.ok(row, "reply row rendered");
  // The type renders as a link when the name resolves to a documented declaration.
  assert.match(row, /`params`: (?:\[ReplyParams\]\(#replyparams\)|ReplyParams)/);
  assert.match(row, /`text`: string, `other\?`: object/);
  assert.match(row, /; /); // the two signatures are joined
  // Only the deprecated overload is marked; the object form stays clean.
  assert.match(row, /; \*\*@deprecated\*\* `text`:/);
  assert.doesNotMatch(row, /\*\*@deprecated\*\* `params`/);
});
