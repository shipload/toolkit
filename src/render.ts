import { resolveItem, type ResolvedItem } from '@shipload/sdk'
import type { CargoItem } from './payload/codec.ts'
import { decodePayload } from './payload/codec.ts'
import { renderByType } from './templates/index.ts'
import { UnknownItemError } from './errors.ts'

export interface RenderOptions {
  width?: number
  theme?: 'dark' | 'light'
}

export function renderItem(
  item: CargoItem,
  resolved: ResolvedItem,
  _opts?: RenderOptions,
): string {
  return renderByType(item, resolved)
}

export async function renderFromPayload(
  payload: string,
  opts?: RenderOptions,
): Promise<{ svg: string; item: ResolvedItem }> {
  const cargoItem = decodePayload(payload)
  let resolved: ResolvedItem
  try {
    resolved = resolveItem(cargoItem.item_id, cargoItem.stats, cargoItem.modules)
  } catch {
    throw new UnknownItemError(Number(BigInt(cargoItem.item_id.toString())))
  }
  const svg = renderItem(cargoItem, resolved, opts)
  return { svg, item: resolved }
}
