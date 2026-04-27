import { test, expect } from "bun:test";
import { renderShipPanel } from "../src/templates/ship-panel.ts";

test("renderShipPanel with empty slots renders empty module rows", () => {
  const svg = renderShipPanel({
    name: "Ship T1 (Packed)",
    tier: 1,
    attributes: [
      {
        capability: "Hull",
        attributes: [
          { label: "Mass", value: 100 },
          { label: "Capacity", value: 5000 },
        ],
      },
    ],
    slots: [{ installed: false }, { installed: false }, { installed: false }],
  });
  expect(svg).toContain("Ship T1 (Packed)");
  expect(svg).toContain("HULL");
  expect(svg).toContain("Mass");
  expect(svg).toContain("Capacity");
  expect((svg.match(/Empty module/g) ?? []).length).toBe(3);
});

test("renderShipPanel with installed slots + string descriptions", () => {
  const svg = renderShipPanel({
    name: "Ship T1 (Packed)",
    tier: 1,
    attributes: [
      {
        capability: "Hull",
        attributes: [{ label: "Mass", value: 100 }],
      },
    ],
    slots: [
      { name: "Engine", installed: true, description: "generates 500 thrust for travel" },
      { name: "Generator", installed: true, description: "holds 1000 energy" },
    ],
  });
  expect(svg).toContain("Engine:");
  expect(svg).toContain("generates 500 thrust");
  expect(svg).toContain("Generator:");
  expect(svg).toContain("holds 1000 energy");
});

test("renderShipPanel with TextSpan[] descriptions preserves highlights", () => {
  const svg = renderShipPanel({
    name: "Ship T1 (Packed)",
    tier: 1,
    attributes: [
      {
        capability: "Hull",
        attributes: [{ label: "Mass", value: 100 }],
      },
    ],
    slots: [
      {
        name: "Engine",
        installed: true,
        description: [
          { text: "generates " },
          { text: "700", highlight: true },
          { text: " thrust for travel" },
        ],
      },
    ],
  });
  expect(svg).toContain(">700<");
  expect(svg).toContain("generates");
});

test("renderShipPanel mixed slots (installed + empty)", () => {
  const svg = renderShipPanel({
    name: "Ship T1 (Packed)",
    tier: 1,
    attributes: [
      {
        capability: "Hull",
        attributes: [{ label: "Mass", value: 100 }],
      },
    ],
    slots: [
      { name: "Engine", installed: true, description: "generates 500 thrust" },
      { installed: false },
      { installed: false },
    ],
  });
  expect(svg).toContain("Engine:");
  expect((svg.match(/Empty module/g) ?? []).length).toBe(2);
});
