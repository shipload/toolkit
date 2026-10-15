import type {ResolvedItem, ResolvedModuleSlot} from '@shipload/sdk'
import {baseName, getModuleFigures} from '@shipload/sdk'
import type {CargoItem} from '../payload/codec.ts'
import {renderShipPanel, type ShipPanelSlot} from './ship-panel.ts'
import {figureRowsFor} from './_shared.ts'

type PackedModule = CargoItem['modules'][number]

function slotToPanelSlot(slot: ResolvedModuleSlot, module?: PackedModule): ShipPanelSlot {
    if (!slot.installed || !slot.name || !module?.installed) {
        return {installed: false}
    }
    const figures = getModuleFigures(
        Number(module.installed.item_id.value.toString()),
        module.installed.stats
    )
    return {
        name: slot.name,
        installed: true,
        capability: slot.capability,
        rows: figureRowsFor(figures),
    }
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
    const slots = (resolved.moduleSlots ?? []).map((slot, i) =>
        slotToPanelSlot(slot, item.modules[i])
    )
    return renderShipPanel({
        name: baseName(resolved),
        tier: resolved.tier,
        quantity,
        location: opts?.location,
        attributes: resolved.attributes ?? [],
        slots,
    })
}
