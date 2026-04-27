import type { ResolvedItem, ResourceCategory } from "@shipload/sdk";
import { formatTier, getRecipe, getStatDefinitions, categoryColors } from "@shipload/sdk";
import type { CargoItem } from "../payload/codec.ts";
import { panel } from "../primitives/panel.ts";
import { iconHex } from "../primitives/icon-hex.ts";
import { text } from "../primitives/text.ts";
import { divider } from "../primitives/divider.ts";
import { statBar } from "../primitives/stat-bar.ts";
import { quantityBadge } from "../primitives/quantity-badge.ts";
import { tokens } from "../tokens/index.ts";
import { shortCode, formatMass, tierBorder } from "./_shared.ts";

export interface RenderComponentOpts {
  mode?: "values" | "ranges";
}

type StatRow = {
  label: string;
  abbreviation: string;
  value: number | null;
  color: string;
  inverted?: boolean;
};

export function renderComponent(
  item: CargoItem,
  resolved: ResolvedItem,
  opts?: RenderComponentOpts,
): string {
  const mode = opts?.mode ?? "values";
  const w = tokens.spacing.panelWidth;
  const pad = tokens.spacing.panelPadding;
  const innerW = w - pad * 2;

  let rows: StatRow[];
  if (mode === "values") {
    rows = (resolved.stats ?? []).map((s) => ({
      label: s.label,
      abbreviation: s.abbreviation,
      value: s.value,
      color: s.color,
      inverted: s.inverted,
    }));
  } else {
    const recipe = getRecipe(resolved.itemId);
    rows = (recipe?.statSlots ?? []).flatMap((slot) => {
      const src = slot.sources[0];
      if (!src) return [];
      const input = recipe!.inputs[src.inputIndex];
      if (!input || !("category" in input)) return [];
      const category = input.category as ResourceCategory;
      const def = getStatDefinitions(category)[src.statIndex];
      if (!def) return [];
      return [
        {
          label: def.label,
          abbreviation: def.abbreviation,
          value: null,
          color: categoryColors[category],
          inverted: def.inverted,
        },
      ];
    });
  }

  const headerH = 48;
  const metaRowH = 28;
  const statsH = rows.length * 26 + 8;
  const height = headerH + metaRowH + 14 + statsH + pad;

  const chrome = panel({ width: w, height, borderColor: tierBorder(resolved.tier) });

  const quantity = Number(BigInt(item.quantity.toString()));
  const badge = quantityBadge({ x: w - pad, y: pad, quantity });

  const icon = iconHex({
    x: pad,
    y: pad + 4,
    color: tokens.colors.accent.component,
    code: shortCode(resolved.itemId),
  });

  const name = text({
    x: pad + 34,
    y: pad + 22,
    value: resolved.name,
    size: tokens.typography.sizes.title,
    weight: 700,
    family: tokens.typography.display,
  });

  const subtitleText = text({
    x: pad,
    y: pad + headerH + 4,
    value: "Type",
    size: tokens.typography.sizes.body,
    color: tokens.colors.text.secondary,
  });
  const subtitleValue = text({
    x: w - pad,
    y: pad + headerH + 4,
    value: `COMPONENT · ${formatTier(resolved.tier)}`,
    size: tokens.typography.sizes.body,
    weight: 600,
    anchor: "end",
  });
  const massLabel = text({
    x: pad,
    y: pad + headerH + metaRowH - 8,
    value: "Mass",
    size: tokens.typography.sizes.body,
    color: tokens.colors.text.secondary,
  });
  const massValue = text({
    x: w - pad,
    y: pad + headerH + metaRowH - 8,
    value: formatMass(resolved.mass),
    size: tokens.typography.sizes.body,
    weight: 600,
    anchor: "end",
  });

  const sepY = pad + headerH + metaRowH + 6;
  const sep = divider({ x: pad, y: sepY, width: innerW });

  const statsSvg = rows
    .map((row, i) =>
      statBar({
        x: pad,
        y: sepY + 18 + i * 26,
        width: innerW,
        label: row.label,
        abbreviation: row.abbreviation,
        value: row.value,
        color: row.color,
        inverted: row.inverted,
      }),
    )
    .join("");

  const inner = `${chrome}${icon}${name}${badge}${subtitleText}${subtitleValue}${massLabel}${massValue}${sep}${statsSvg}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${height}" viewBox="0 0 ${w} ${height}">${inner}</svg>`;
}
