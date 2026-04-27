import type { TextSpan } from "@shipload/sdk";
import { panel } from "../primitives/panel.ts";
import { iconHex } from "../primitives/icon-hex.ts";
import { text } from "../primitives/text.ts";
import { divider } from "../primitives/divider.ts";
import { moduleSlot } from "../primitives/module-slot.ts";
import { quantityBadge } from "../primitives/quantity-badge.ts";
import { wrapText } from "../primitives/wrap.ts";
import { tokens } from "../tokens/index.ts";

export interface ShipPanelSlot {
  name?: string;
  installed: boolean;
  description?: string | TextSpan[];
}

export interface ShipPanelProps {
  name: string;
  tier: number;
  quantity?: number;
  attributes: { capability: string; attributes: { label: string; value: number }[] }[];
  slots: ShipPanelSlot[];
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

function tierBorder(tier: number): string {
  return tokens.colors.tier[tier] ?? tokens.colors.surface.panelBorder;
}

const MODULE_LABEL_PREFIX = (capability: string) => `${capability}: `;

function rowHeightFor(slot: ShipPanelSlot): number {
  if (!slot.installed) return 24;
  const desc = slot.description;
  const plain =
    typeof desc === "string" ? desc : Array.isArray(desc) ? desc.map((s) => s.text).join("") : "";
  if (plain.length === 0) return 24;
  const combined = MODULE_LABEL_PREFIX(slot.name ?? "Module") + plain;
  const lineCount = Math.max(1, wrapText({ value: combined, charsPerLine: 36 }).length);
  return 10 + lineCount * 14;
}

export function renderShipPanel(props: ShipPanelProps): string {
  const w = tokens.spacing.panelWidth;
  const pad = tokens.spacing.panelPadding;
  const innerW = w - pad * 2;
  const quantity = props.quantity ?? 0;

  const hullGroup = props.attributes?.find((g) => g.capability.toLowerCase() === "hull");
  const hullRows = hullGroup?.attributes ?? [];

  const headerH = 48;
  const hullHeaderH = 20;
  const hullRowH = 22;
  const sectionGap = 12;
  const rowHeights = props.slots.map(rowHeightFor);
  const modulesHeight = rowHeights.reduce((a, b) => a + b, 0);
  const height =
    headerH + hullHeaderH + hullRows.length * hullRowH + sectionGap + modulesHeight + pad;

  const chrome = panel({ width: w, height, borderColor: tierBorder(props.tier) });

  const icon = iconHex({
    x: pad,
    y: pad + 4,
    color: tokens.colors.text.accent,
    code: "SH",
  });

  const name = text({
    x: pad + 34,
    y: pad + 22,
    value: props.name,
    size: tokens.typography.sizes.title,
    weight: 700,
    family: tokens.typography.display,
  });

  const badge = quantityBadge({ x: w - pad, y: pad, quantity });

  const hullHeader = text({
    x: pad,
    y: pad + headerH,
    value: "HULL",
    size: tokens.typography.sizes.subtitle,
    weight: 700,
    color: tokens.colors.text.secondary,
    letterSpacing: 1,
  });

  let y = pad + headerH + 6;
  let hullSvg = "";
  for (const row of hullRows) {
    hullSvg +=
      text({
        x: pad,
        y: y + 12,
        value: row.label,
        size: tokens.typography.sizes.body,
        color: tokens.colors.text.secondary,
      }) +
      text({
        x: w - pad,
        y: y + 12,
        value: formatNumber(row.value),
        size: tokens.typography.sizes.body,
        weight: 700,
        anchor: "end",
      }) +
      divider({
        x: pad,
        y: y + hullRowH - 4,
        width: innerW,
        color: tokens.colors.surface.panelBorderBright,
      });
    y += hullRowH;
  }

  y += sectionGap;
  let modulesSvg = "";
  for (let i = 0; i < props.slots.length; i++) {
    const slot = props.slots[i]!;
    modulesSvg += moduleSlot({
      x: pad,
      y,
      width: innerW,
      installed: slot.installed,
      capability: slot.name,
      description: slot.description,
      accentColor: tokens.colors.brand.teal,
    });
    y += rowHeights[i]!;
  }

  const inner = `${chrome}${icon}${name}${badge}${hullHeader}${hullSvg}${modulesSvg}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${height}" viewBox="0 0 ${w} ${height}">${inner}</svg>`;
}
