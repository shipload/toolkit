import {Box, Text, type VChild} from '@opentui/core'
import type {ServerTypes} from '@shipload/sdk'
import {formatCargoUsage, formatCoordinatePair, formatEnergyAmount} from '../../lib/format'
import {projectedEnergyNow} from '../../lib/projection'
import type {EntitySnapshot} from '../../lib/snapshot'
import {renderField} from './field'
import {renderHeader} from './header'

export interface EntitySummaryOpts {
    entityType: string
    entityId: bigint | number
    snap: EntitySnapshot
    elapsed_s: number
}

export function renderEntitySummary(opts: EntitySummaryOpts): VChild {
    return Box(
        {flexDirection: 'column'},
        renderHeader({
            entityType: opts.entityType,
            entityId: opts.entityId,
            entityName: opts.snap.entity_name,
            owner: opts.snap.owner,
        }),
        renderStatsRow(opts.snap)
    )
}

function renderStatsRow(snap: EntitySnapshot): VChild {
    const cells: string[] = []
    if (snap.coordinates) {
        cells.push(
            `◷ ${formatCoordinatePair(snap.coordinates as unknown as ServerTypes.coordinates)}`
        )
    }
    const energyStr = energySummary(snap)
    if (energyStr) cells.push(energyStr)
    const cargoStr = cargoSummary(snap)
    if (cargoStr) cells.push(cargoStr)
    return Text({content: cells.join('    ')})
}

function energySummary(snap: EntitySnapshot): string | null {
    if (snap.energy === undefined) return null
    const stored = Number(snap.energy)
    if (!snap.generator) return renderField({icon: '⚡', value: formatEnergyAmount(stored)})
    const cap = formatEnergyAmount(Number(snap.generator.capacity))
    const shown = projectedEnergyNow(snap, new Date())
    return renderField({icon: '⚡', value: `${formatEnergyAmount(shown)}/${cap}`})
}

function cargoSummary(snap: EntitySnapshot): string | null {
    if (snap.cargomass === undefined) return null
    const cap = snap.capacity !== undefined ? Number(snap.capacity) : undefined
    return renderField({icon: '◧', value: formatCargoUsage(Number(snap.cargomass), cap)})
}
