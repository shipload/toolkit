import { expect, test } from "bun:test";
import { attr, el, escapeXml } from "../src/primitives/svg.ts";

test("escapeXml escapes the five XML entity chars", () => {
  expect(escapeXml(`5 > 3 & 2 < 4 "hi" 'yo'`)).toBe(
    "5 &gt; 3 &amp; 2 &lt; 4 &quot;hi&quot; &apos;yo&apos;",
  );
});

test("attr emits name=value pairs with quoted values", () => {
  expect(attr({ width: 10, height: 20, fill: "#123456" })).toBe(
    ' width="10" height="20" fill="#123456"',
  );
});

test("attr drops undefined and null values", () => {
  expect(attr({ width: 10, height: undefined, stroke: null as unknown as string })).toBe(
    ' width="10"',
  );
});

test("attr escapes special chars in values", () => {
  expect(attr({ label: `ship "fast"` })).toBe(' label="ship &quot;fast&quot;"');
});

test("el builds self-closing and wrapping elements", () => {
  expect(el("rect", { width: 10, height: 10 })).toBe('<rect width="10" height="10"/>');
  expect(el("g", {}, "<rect/><rect/>")).toBe("<g><rect/><rect/></g>");
  expect(el("text", { x: 5 }, "hi")).toBe('<text x="5">hi</text>');
});
