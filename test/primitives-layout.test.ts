import { expect, test } from "bun:test";
import { panel } from "../src/primitives/panel.ts";
import { text } from "../src/primitives/text.ts";
import { divider } from "../src/primitives/divider.ts";
import { wrapText } from "../src/primitives/wrap.ts";

test("panel renders a rect inset by 0.5px so the 1px stroke stays inside the viewBox", () => {
  const svg = panel({ width: 280, height: 120 });
  expect(svg).toContain("<rect");
  expect(svg).toContain('x="0.5"');
  expect(svg).toContain('y="0.5"');
  expect(svg).toContain('width="279"');
  expect(svg).toContain('height="119"');
  expect(svg).toContain('rx="10"');
});

test("panel accepts an optional tier border color", () => {
  const svg = panel({ width: 280, height: 120, borderColor: "#6cb9ff" });
  expect(svg).toContain('stroke="#6cb9ff"');
});

test("text emits a <text> element with escaped content", () => {
  const svg = text({ x: 10, y: 20, value: `Ship "T1"`, size: 14, weight: 600 });
  expect(svg).toContain("<text");
  expect(svg).toContain('x="10"');
  expect(svg).toContain('y="20"');
  expect(svg).toContain("Ship &quot;T1&quot;");
  expect(svg).toContain('font-size="14"');
  expect(svg).toContain('font-weight="600"');
});

test("divider is a horizontal line at y", () => {
  const svg = divider({ x: 14, y: 40, width: 252 });
  expect(svg).toContain("<line");
  expect(svg).toContain('x1="14"');
  expect(svg).toContain('x2="266"');
  expect(svg).toContain('y1="40"');
  expect(svg).toContain('y2="40"');
});

test("wrapText splits a string into lines that fit within a char budget", () => {
  const lines = wrapText({
    value: "generates 757 thrust for travel while draining 41 energy per distance travelled",
    charsPerLine: 40,
  });
  for (const line of lines) expect(line.length).toBeLessThanOrEqual(40);
  // No word is broken mid-word:
  expect(lines.join(" ")).toBe(
    "generates 757 thrust for travel while draining 41 energy per distance travelled",
  );
});

test("wrapText preserves a single unbreakable long token", () => {
  const lines = wrapText({ value: "supercalifragilisticexpialidocious", charsPerLine: 10 });
  expect(lines).toEqual(["supercalifragilisticexpialidocious"]);
});
