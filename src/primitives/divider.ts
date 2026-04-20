import { el } from './svg.ts'
import { tokens } from '../tokens/index.ts'

export interface DividerProps {
  x: number
  y: number
  width: number
  color?: string
}

export function divider(props: DividerProps): string {
  return el('line', {
    x1: props.x,
    x2: props.x + props.width,
    y1: props.y,
    y2: props.y,
    stroke: props.color ?? tokens.colors.surface.panelBorder,
    'stroke-width': 1,
  })
}
