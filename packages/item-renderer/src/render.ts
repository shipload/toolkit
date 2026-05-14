import {resolveItem, type ResolvedItem} from '@shipload/sdk'
import type {CargoItem} from './payload/codec.ts'
import {decodeNftPayload} from './payload/codec.ts'
import {renderByType} from './templates/index.ts'
import {UnknownItemError} from './errors.ts'

export interface RenderOptions {
    width?: number
    theme?: 'dark' | 'light'
    location?: {x: number; y: number}
}

export function renderItem(item: CargoItem, resolved: ResolvedItem, opts?: RenderOptions): string {
    return renderByType(item, resolved, {location: opts?.location})
}

export async function renderFromPayload(
    payload: string,
    opts?: RenderOptions
): Promise<{svg: string; item: ResolvedItem}> {
    const decoded = decodeNftPayload(payload)
    const cargo = decoded.item
    let resolved: ResolvedItem
    try {
        resolved = resolveItem(cargo.item_id, cargo.stats, cargo.modules)
    } catch {
        throw new UnknownItemError(Number(BigInt(cargo.item_id.toString())))
    }
    const location = decoded.location
        ? {x: Number(decoded.location.x), y: Number(decoded.location.y)}
        : opts?.location
    const svg = renderItem(cargo, resolved, {...opts, location})
    return {svg, item: resolved}
}
