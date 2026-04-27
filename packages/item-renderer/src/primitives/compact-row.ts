import { text } from "./text.ts";
import { tokens } from "../tokens/index.ts";

export interface CompactRowProps {
  x: number;
  y: number;
  width: number;
  label: string;
  value: string;
  labelColor?: string;
  valueColor?: string;
}

export function compactRow(p: CompactRowProps): string {
  const labelColor = p.labelColor ?? tokens.colors.text.secondary;
  const valueColor = p.valueColor ?? tokens.colors.text.primary;
  return (
    text({
      x: p.x,
      y: p.y,
      value: p.label,
      size: 11,
      weight: 500,
      family: tokens.typography.sans,
      color: labelColor,
    }) +
    text({
      x: p.x + p.width,
      y: p.y,
      value: p.value,
      size: 11,
      weight: 700,
      family: tokens.typography.sans,
      color: valueColor,
      anchor: "end",
    })
  );
}
