import {formatMass, type ServerTypes} from '@shipload/sdk'
import {formatItem} from './format'
import {formatItemStats} from './item-stats'

export function renderDepotStorage(
    depotId: bigint,
    view: ServerTypes.depot_view | undefined
): string {
    const lines = [
        '  Public storage: any player can store cargo here and take back what they stored.',
        `    Store:  shiploadcli ship <id> depotstore ${depotId} <item-id>:<stack-id>:<qty>`,
        `    Take:   shiploadcli ship <id> depottake ${depotId} <item-id>:<stack-id>:<qty>`,
    ]
    if (!view) return lines.join('\n')

    const stored = Number(view.stored_mass)
    const reserved = Number(view.reserved_mass)
    const cap = Number(view.player_cap)
    const inbound = reserved > 0 ? `, ${formatMass(reserved)} on the way` : ''
    lines.push(
        '',
        `  Your storage: ${formatMass(stored)} / ${formatMass(cap)}${inbound}`
    )
    for (const row of view.rows) {
        const itemId = Number(row.item_id)
        const stackId = BigInt(row.stats.toString())
        const decoded = formatItemStats(itemId, stackId)
        const suffix = decoded ? `, ${decoded}` : ''
        lines.push(`    ${itemId}:${stackId}   ${row.quantity}× ${formatItem(itemId)}${suffix}`)
    }
    return lines.join('\n')
}
