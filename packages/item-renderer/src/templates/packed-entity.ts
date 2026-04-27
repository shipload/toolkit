import type {ResolvedItem, ResolvedModuleSlot} from '@shipload/sdk'
import {describeModuleForSlot, renderDescription} from '@shipload/sdk'
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

export function renderPackedEntity(item: CargoItem, resolved: ResolvedItem): string {
    const quantity = Number(BigInt(item.quantity.toString()))
    const slots = (resolved.moduleSlots ?? []).map(slotToPanelSlot)
    return renderShipPanel({
        name: `${resolved.name} (Packed)`,
        tier: resolved.tier,
        quantity,
        attributes: resolved.attributes ?? [],
        slots,
    })
}
