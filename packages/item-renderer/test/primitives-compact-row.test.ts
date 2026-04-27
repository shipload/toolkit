import { test, expect } from "bun:test";
import { compactRow } from "../src/primitives/compact-row.ts";

test("compactRow emits left-anchored label and right-anchored value", () => {
  const svg = compactRow({
    x: 14,
    y: 80,
    width: 252,
    label: "Thrust",
    value: "700",
  });
  expect(svg).toContain("<text");
  expect(svg).toContain("Thrust");
  expect(svg).toContain("700");
  expect(svg).toContain('x="14"');
  expect(svg).toContain('x="266"');
  expect(svg).toContain('text-anchor="end"');
});

test("compactRow applies supplied label and value colors", () => {
  const svg = compactRow({
    x: 14,
    y: 80,
    width: 252,
    label: "Drain",
    value: "50",
    labelColor: "#aabbcc",
    valueColor: "#ddeeff",
  });
  expect(svg).toContain('fill="#aabbcc"');
  expect(svg).toContain('fill="#ddeeff"');
});

test("compactRow escapes HTML entities in label and value", () => {
  const svg = compactRow({
    x: 14,
    y: 80,
    width: 252,
    label: "A & B",
    value: "<5",
  });
  expect(svg).toContain("A &amp; B");
  expect(svg).toContain("&lt;5");
});
