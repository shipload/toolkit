import {Box, Text, type VChild} from '@opentui/core'
import type {ServerTypes} from '@shipload/sdk'
import {formatCargoUsage, formatCoordinatePair, projectEnergy} from '../../lib/format'
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
        renderStatsRow(opts.snap, opts.elapsed_s)
    )
}

function renderStatsRow(snap: EntitySnapshot, elapsed_s: number): VChild {
    const cells: string[] = []
    if (snap.coordinates) {
        cells.push(
            `◷ ${formatCoordinatePair(snap.coordinates as unknown as ServerTypes.coordinates)}`
        )
    }
    const energyStr = energySummary(snap, elapsed_s)
    if (energyStr) cells.push(energyStr)
    const cargoStr = cargoSummary(snap)
    if (cargoStr) cells.push(cargoStr)
    return Text({content: cells.join('    ')})
}

function energySummary(snap: EntitySnapshot, elapsed_s: number): string | null {
    if (snap.energy === undefined) return null
    const stored = Number(snap.energy)
    if (!snap.generator) return renderField({icon: '⚡', value: String(stored)})
    const cap = Number(snap.generator.capacity)
    const recharge = Number(snap.generator.recharge)
    if (snap.is_idle || !recharge) {
        return renderField({icon: '⚡', value: `${stored}/${cap}`})
    }
    const projected = projectEnergy(stored, cap, recharge, 0, elapsed_s)
    return renderField({icon: '⚡', value: `${projected}/${cap}`})
}

function cargoSummary(snap: EntitySnapshot): string | null {
    if (snap.cargomass === undefined) return null
    const cap = snap.capacity !== undefined ? Number(snap.capacity) : undefined
    return renderField({icon: '◧', value: formatCargoUsage(Number(snap.cargomass), cap)})
}
