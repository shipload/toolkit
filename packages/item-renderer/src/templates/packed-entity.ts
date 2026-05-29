import type {ResolvedItem, ResolvedModuleSlot} from '@shipload/sdk'
import {baseName, describeModuleForSlot, renderDescription} from '@shipload/sdk'
import type {CargoItem} from '../payload/codec.ts'
import {renderShipPanel, type ShipPanelSlot} from './ship-panel.ts'

function capabilityFromName(name: string): string {
    return name.replace(/\s+T\d+\s*$/i, '').trim()
}

function slotToPanelSlot(slot: ResolvedModuleSlot): ShipPanelSlot {
    if (!slot.installed || !slot.attributes || !slot.name) {
        return {installed: false}
    }
    const capability = capabilityFromName(slot.name)
    const desc = describeModuleForSlot(slot)
    if (desc) {
        return {
            name: slot.name,
            installed: true,
            capability,
            description: renderDescription(desc),
        }
    }
    const shorthand = slot.attributes.map((a) => `${a.value} ${a.label.toLowerCase()}`).join(' · ')
    return {name: slot.name, installed: true, capability, description: shorthand}
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
        name: baseName(resolved),
        tier: resolved.tier,
        quantity,
        location: opts?.location,
        attributes: resolved.attributes ?? [],
        slots,
    })
}
