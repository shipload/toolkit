import type {ResolvedItem, ResolvedModuleSlot} from '@shipload/sdk'
import {describeModuleForSlot, displayNameWithTier, renderDescription} from '@shipload/sdk'
import type {CargoItem} from '../payload/codec.ts'
import {renderShipPanel, type ShipPanelSlot} from './ship-panel.ts'

function slotToPanelSlot(slot: ResolvedModuleSlot): ShipPanelSlot {
    if (!slot.installed || !slot.attributes || !slot.name) {
        return {installed: false}
    }
    const desc = describeModuleForSlot(slot)
    if (desc) {
        return {name: slot.name, installed: true, description: renderDescription(desc)}
    }
    const shorthand = slot.attributes.map((a) => `${a.value} ${a.label.toLowerCase()}`).join(' · ')
    return {name: slot.name, installed: true, description: shorthand}
}

export interface RenderPackedEntityOpts {
    mode?: 'values' | 'ranges'
    location?: {x: number; y: number}
}

export function renderPackedEntity(
    item: CargoItem,
    resolved: ResolvedItem,
    opts?: RenderPackedEntityOpts
): string {
    const quantity = Number(BigInt(item.quantity.toString()))
    const slots = (resolved.moduleSlots ?? []).map(slotToPanelSlot)
    return renderShipPanel({
        name: `${displayNameWithTier(resolved)} (Packed)`,
        tier: resolved.tier,
        quantity,
        location: opts?.location,
        attributes: resolved.attributes ?? [],
        slots,
    })
}
