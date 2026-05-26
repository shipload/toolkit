import type {UInt32} from '@wharfkit/antelope'
import {BaseManager} from './base'
import type {ServerContract} from '../contracts'
import {PlotManager} from './plot'
import {getItem} from '../data/catalog'
import {calc_craft_duration} from '../capabilities/crafting'
import type {
    BuildableTarget,
    FinalizerEntityRef,
    SourceCargoStack,
    SourceEntityRef,
} from './construction-types'

const CONSTRUCTION_KINDS = new Set<string>(['plot'])

export class ConstructionManager extends BaseManager {
    private readonly plot = new PlotManager(this.context)

    getTarget(
        entity: ServerContract.Types.entity_row,
        cargo: ServerContract.Types.cargo_row[],
        activeTask?: ServerContract.Types.task
    ): BuildableTarget | null {
        const kind = entity.kind.toString()
        if (kind === 'plot') {
            return this.plot.buildableTarget(entity, cargo, activeTask)
        }
        return null
    }

    eligibleSources(
        target: BuildableTarget,
        entities: ServerContract.Types.entity_row[],
        cargo: ServerContract.Types.cargo_row[]
    ): SourceEntityRef[] {
        return partitionSources(target, entities, cargo).eligible
    }

    unreachableSources(
        target: BuildableTarget,
        entities: ServerContract.Types.entity_row[],
        cargo: ServerContract.Types.cargo_row[]
    ): SourceEntityRef[] {
        return partitionSources(target, entities, cargo).unreachable
    }

    partitionSources(
        target: BuildableTarget,
        entities: ServerContract.Types.entity_row[],
        cargo: ServerContract.Types.cargo_row[]
    ): {eligible: SourceEntityRef[]; unreachable: SourceEntityRef[]} {
        return partitionSources(target, entities, cargo)
    }

    eligibleFinalizers(
        target: BuildableTarget,
        entities: ServerContract.Types.entity_row[]
    ): FinalizerEntityRef[] {
        const out: FinalizerEntityRef[] = []
        for (const entity of entities) {
            if (!entity.owner.equals(target.ownerName)) continue
            if (entity.id.equals(target.entityId)) continue
            if (!coordsEqual(entity.coordinates, target.coordinates)) continue
            const speed = entity.crafter?.speed.toNumber()
            if (speed === undefined) continue
            out.push({
                entityId: entity.id,
                name: entity.id.toString(),
                capability: 'crafter',
                crafterSpeed: speed,
                estimatedDuration: this.estimateFinalizeDuration(target, speed),
            })
        }
        return out.sort((a, b) => a.estimatedDuration.value - b.estimatedDuration.value)
    }

    estimateFinalizeDuration(target: BuildableTarget, crafterSpeed: number): UInt32 {
        return calc_craft_duration(crafterSpeed, target.progress.massRequired)
    }

    static isConstructionKind(kind: string): boolean {
        return CONSTRUCTION_KINDS.has(kind)
    }
}

function coordsEqual(
    a: ServerContract.Types.coordinates,
    b: ServerContract.Types.coordinates
): boolean {
    return a.x.equals(b.x) && a.y.equals(b.y)
}

function matchRelevantCargo(
    entity: ServerContract.Types.entity_row,
    target: BuildableTarget,
    cargo: ServerContract.Types.cargo_row[]
): SourceCargoStack[] {
    const quantityByItemId = new Map<number, number>()
    for (const c of cargo) {
        if (!c.entity_id.equals(entity.id)) continue
        const id = c.item_id.toNumber()
        quantityByItemId.set(id, (quantityByItemId.get(id) ?? 0) + c.quantity.toNumber())
    }

    const out: SourceCargoStack[] = []
    for (const row of target.progress.rows) {
        if (row.missing === 0) continue
        const available = quantityByItemId.get(row.itemId) ?? 0
        if (available === 0) continue
        out.push({
            itemId: row.itemId,
            item: getItem(row.itemId),
            available,
            plotNeeds: row.missing,
        })
    }
    return out
}

function partitionSources(
    target: BuildableTarget,
    entities: ServerContract.Types.entity_row[],
    cargo: ServerContract.Types.cargo_row[]
): {eligible: SourceEntityRef[]; unreachable: SourceEntityRef[]} {
    const eligible: SourceEntityRef[] = []
    const unreachable: SourceEntityRef[] = []
    for (const entity of entities) {
        if (!entity.owner.equals(target.ownerName)) continue
        if (entity.id.equals(target.entityId)) continue
        if (!coordsEqual(entity.coordinates, target.coordinates)) continue
        const relevant = matchRelevantCargo(entity, target, cargo)
        if (relevant.length === 0) continue
        const loaderCount = entity.loaders?.quantity.toNumber() ?? 0
        const loaderTotalMass = entity.loaders?.mass.toNumber() ?? 0
        const ref: SourceEntityRef = {
            entityId: entity.id,
            name: entity.id.toString(),
            hasLoaders: loaderCount > 0,
            loaderCount,
            loaderTotalMass,
            relevantCargo: relevant,
        }
        if (ref.hasLoaders) eligible.push(ref)
        else unreachable.push(ref)
    }
    return {eligible, unreachable}
}
