import { el } from "./svg.ts";
import { tokens } from "../tokens/index.ts";

export interface PanelProps {
  width: number;
  height: number;
  borderColor?: string;
}

export function panel(props: PanelProps): string {
  const { width, height, borderColor } = props;
  const r = tokens.spacing.cornerRadius;
  return el("rect", {
    x: 0.5,
    y: 0.5,
    width: width - 1,
    height: height - 1,
    rx: r,
    ry: r,
    fill: tokens.colors.surface.panel,
    stroke: borderColor ?? tokens.colors.surface.panelBorder,
    "stroke-width": 1,
  });
}
