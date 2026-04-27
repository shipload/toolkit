import type { ResolvedItem } from "@shipload/sdk";
import { describeModuleForItem, formatTier, renderDescription } from "@shipload/sdk";
import type { CargoItem } from "../payload/codec.ts";
import { panel } from "../primitives/panel.ts";
import { iconHex } from "../primitives/icon-hex.ts";
import { text } from "../primitives/text.ts";
import { divider } from "../primitives/divider.ts";
import { compactRow } from "../primitives/compact-row.ts";
import { quantityBadge } from "../primitives/quantity-badge.ts";
import { spanParagraph } from "../primitives/span-paragraph.ts";
import { tokens } from "../tokens/index.ts";
import { shortCode, formatMass, tierBorder } from "./_shared.ts";

function capabilityColor(name: string): string {
  const key = name.toLowerCase().replace(/\s+/g, "") as keyof typeof tokens.colors.capability;
  return tokens.colors.capability[key] ?? tokens.colors.accent.component;
}

export interface RenderModuleOpts {
  mode?: "values" | "ranges";
}

export function renderModule(
  item: CargoItem,
  resolved: ResolvedItem,
  opts?: RenderModuleOpts,
): string {
  const mode = opts?.mode ?? "values";
  const w = tokens.spacing.panelWidth;
  const pad = tokens.spacing.panelPadding;
  const innerW = w - pad * 2;

  const group = resolved.attributes?.[0];
  const attrs = group?.attributes ?? [];
  const desc = mode === "values" ? describeModuleForItem(resolved) : undefined;

  const capabilityName = group?.capability ?? resolved.name.replace(/\s+T\d+$/i, "");

  const headerH = 48;
  const metaRowH = 28;
  const sepY = pad + headerH + metaRowH + 6;

  let bodyHeight = 0;
  if (mode === "ranges") {
    bodyHeight = 20 + 8;
  } else if (desc && group) {
    const plain = renderDescription(desc)
      .map((s) => s.text)
      .join("");
    const lines = plain.split(/\s+/).reduce(
      (acc, word) => {
        const last = acc[acc.length - 1] ?? "";
        if (last.length === 0) return [...acc.slice(0, -1), word];
        if (last.length + 1 + word.length <= 36) return [...acc.slice(0, -1), `${last} ${word}`];
        return [...acc, word];
      },
      [""],
    );
    const lineCount = lines.filter((l) => l.length > 0).length;
    bodyHeight = 20 + lineCount * 14 + 8;
  } else if (group && attrs.length > 0) {
    const capHeaderH = 22;
    const attrsH = attrs.length * 18;
    bodyHeight = capHeaderH + attrsH + 8;
  }

  const height = headerH + metaRowH + 14 + bodyHeight + pad;

  const chrome = panel({ width: w, height, borderColor: tierBorder(resolved.tier) });

  const quantity = Number(BigInt(item.quantity.toString()));
  const badge = quantityBadge({ x: w - pad, y: pad, quantity });

  const iconColor = group ? capabilityColor(group.capability) : capabilityColor(capabilityName);
  const icon = iconHex({
    x: pad,
    y: pad + 4,
    color: iconColor,
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

  const subtitleLabel = text({
    x: pad,
    y: pad + headerH + 4,
    value: "Type",
    size: tokens.typography.sizes.body,
    color: tokens.colors.text.secondary,
  });
  const subtitleValue = text({
    x: w - pad,
    y: pad + headerH + 4,
    value: `MODULE · ${formatTier(resolved.tier)}`,
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

  const sep = divider({ x: pad, y: sepY, width: innerW });

  let capSection = "";
  if (mode === "ranges") {
    const accentColor = capabilityColor(capabilityName);
    capSection = text({
      x: pad,
      y: sepY + 16,
      value: capabilityName.toUpperCase(),
      size: tokens.typography.sizes.subtitle,
      weight: 700,
      family: tokens.typography.sans,
      color: accentColor,
      letterSpacing: 1,
    });
  } else if (desc && group) {
    const accentColor = capabilityColor(group.capability);
    const capHeader = text({
      x: pad,
      y: sepY + 16,
      value: group.capability.toUpperCase(),
      size: tokens.typography.sizes.subtitle,
      weight: 700,
      family: tokens.typography.sans,
      color: accentColor,
      letterSpacing: 1,
    });
    const spans = renderDescription(desc);
    const { svg: paraSvg } = spanParagraph({
      x: pad,
      y: sepY + 36,
      spans,
      charsPerLine: 36,
      lineHeight: 14,
    });
    capSection = capHeader + paraSvg;
  } else if (group && attrs.length > 0) {
    const capY = sepY + 22;
    const capHeader = text({
      x: pad,
      y: capY,
      value: group.capability.toUpperCase(),
      size: 10,
      weight: 700,
      family: tokens.typography.sans,
      color: capabilityColor(group.capability),
      letterSpacing: 0.8,
    });

    const attrRows = attrs
      .map((attr, i) => {
        const displayValue = String(attr.value);
        return compactRow({
          x: pad,
          y: capY + 14 + i * 18,
          width: innerW,
          label: attr.label,
          value: displayValue,
        });
      })
      .join("");

    capSection = capHeader + attrRows;
  }

  const inner = `${chrome}${icon}${name}${badge}${subtitleLabel}${subtitleValue}${massLabel}${massValue}${sep}${capSection}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${height}" viewBox="0 0 ${w} ${height}">${inner}</svg>`;
}
