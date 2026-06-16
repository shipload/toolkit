import type {UInt64, UInt32} from '@wharfkit/antelope'
import {BaseManager} from './base'
import type {ServerContract} from '../contracts'
import {PlotManager} from './plot'
import {getItem} from '../data/catalog'
import {calc_craft_duration} from '../capabilities/crafting'
import {getLanes, getTasks} from '../scheduling/schedule'
import {HoldKind, TaskType} from '../types'
import type {
    BuildableTarget,
    FinalizerEntityRef,
    InboundTransfer,
    Reservation,
    ScheduledBuild,
    SourceCargoStack,
    SourceEntityRef,
} from './construction-types'

const CONSTRUCTION_KINDS = new Set<string>(['plot'])

export class ConstructionManager extends BaseManager {
    private readonly plot = new PlotManager(this.context)

    getTarget(
        entity: ServerContract.Types.entity_row,
        cargo: ServerContract.Types.cargo_row[],
        activeTask?: ServerContract.Types.task,
        scheduledBuild?: ScheduledBuild
    ): BuildableTarget | null {
        const kind = entity.kind.toString()
        if (kind === 'plot') {
            return this.plot.buildableTarget(entity, cargo, activeTask, scheduledBuild)
        }
        return null
    }

    eligibleSources(
        target: BuildableTarget,
        entities: ServerContract.Types.entity_info[],
        cargo: ServerContract.Types.cargo_row[]
    ): SourceEntityRef[] {
        return partitionSources(target, entities, cargo).eligible
    }

    unreachableSources(
        target: BuildableTarget,
        entities: ServerContract.Types.entity_info[],
        cargo: ServerContract.Types.cargo_row[]
    ): SourceEntityRef[] {
        return partitionSources(target, entities, cargo).unreachable
    }

    partitionSources(
        target: BuildableTarget,
        entities: ServerContract.Types.entity_info[],
        cargo: ServerContract.Types.cargo_row[]
    ): {eligible: SourceEntityRef[]; unreachable: SourceEntityRef[]} {
        return partitionSources(target, entities, cargo)
    }

    eligibleFinalizers(
        target: BuildableTarget,
        entities: ServerContract.Types.entity_info[]
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

    inboundTransfersTo(
        plotId: UInt64,
        entities: ServerContract.Types.entity_info[],
        now: Date
    ): InboundTransfer[] {
        return this.inboundTransfersByTarget(entities, now).get(plotId.toString()) ?? []
    }

    inboundTransfersByTarget(
        entities: ServerContract.Types.entity_info[],
        now: Date
    ): Map<string, InboundTransfer[]> {
        const buckets = new Map<string, Map<string, InboundTransfer>>()
        const nowMs = now.getTime()
        for (const entity of entities) {
            const entityIdStr = entity.id.toString()
            const sourceName = entity.entity_name || entityIdStr
            for (const lane of getLanes(entity)) {
                const startedMs = lane.schedule.started.toDate().getTime()
                let cumulativeSec = 0
                for (const task of lane.schedule.tasks) {
                    cumulativeSec += task.duration.toNumber()
                    if (!isPushTask(task)) continue
                    if (!task.entitytarget) continue
                    const projectedEndMs = startedMs + cumulativeSec * 1000
                    if (projectedEndMs < nowMs) continue
                    const targetIdStr = task.entitytarget.entity_id.toString()
                    const etaSeconds = Math.max(0, Math.round((projectedEndMs - nowMs) / 1000))
                    let perTarget = buckets.get(targetIdStr)
                    if (!perTarget) {
                        perTarget = new Map()
                        buckets.set(targetIdStr, perTarget)
                    }
                    for (const c of task.cargo) {
                        const itemId = c.item_id.toNumber()
                        const quantity = c.quantity.toNumber()
                        if (quantity === 0) continue
                        const key = `${entityIdStr}#${itemId}`
                        const existing = perTarget.get(key)
                        if (existing) {
                            existing.quantity += quantity
                            existing.etaSeconds = Math.min(existing.etaSeconds, etaSeconds)
                        } else {
                            perTarget.set(key, {
                                sourceEntityId: entity.id,
                                sourceEntityType: entity.type,
                                sourceName,
                                itemId,
                                quantity,
                                etaSeconds,
                            })
                        }
                    }
                }
            }
        }
        const out = new Map<string, InboundTransfer[]>()
        for (const [targetId, perTarget] of buckets) {
            out.set(targetId, Array.from(perTarget.values()))
        }
        return out
    }

    private plotReservation(
        plot: ServerContract.Types.entity_info,
        builder: ServerContract.Types.entity_info | undefined,
        now: Date
    ): {
        builderId: UInt64
        startsAt: number
        completesAt: number
        hasStarted: boolean
    } | null {
        const hold = plot.holds.find((h) => h.kind.toNumber() === HoldKind.BUILD)
        if (!hold) return null
        const builderId = hold.counterpart.entity_id
        const completesAt = hold.until.toDate().getTime()
        const startsAt = this.builderBuildStart(builder, plot.id) ?? completesAt
        return {
            builderId,
            startsAt,
            completesAt,
            hasStarted: startsAt <= now.getTime(),
        }
    }

    private builderBuildStart(
        builder: ServerContract.Types.entity_info | undefined,
        plotId: UInt64
    ): number | undefined {
        if (!builder) return undefined
        for (const lane of getLanes(builder)) {
            const startedMs = lane.schedule.started.toDate().getTime()
            let startSec = 0
            for (const task of lane.schedule.tasks) {
                if (isBuildOfPlot(task, plotId)) return startedMs + startSec * 1000
                startSec += task.duration.toNumber()
            }
        }
        return undefined
    }

    private builderCancelability(
        builder: ServerContract.Types.entity_info | undefined,
        plotId: UInt64
    ): {cancelable: boolean; blockingTaskCount: number} {
        if (!builder) {
            return {cancelable: false, blockingTaskCount: 0}
        }
        for (const lane of getLanes(builder)) {
            const tasks = lane.schedule.tasks
            const buildIdx = tasks.findIndex((t) => isBuildOfPlot(t, plotId))
            if (buildIdx < 0) continue
            const trailing = tasks.length - 1 - buildIdx
            return {cancelable: trailing === 0, blockingTaskCount: trailing}
        }
        return {cancelable: false, blockingTaskCount: 0}
    }

    private buildFromReservation(
        res: {
            builderId: UInt64
            startsAt: number
            completesAt: number
            hasStarted: boolean
        },
        plotId: UInt64,
        builder: ServerContract.Types.entity_info | undefined
    ): ScheduledBuild {
        const {cancelable, blockingTaskCount} = this.builderCancelability(builder, plotId)
        return {
            shipId: res.builderId,
            shipName: builder?.entity_name || res.builderId.toString(),
            hasStarted: res.hasStarted,
            startsAt: res.startsAt,
            completesAt: res.completesAt,
            cancelable,
            blockingTaskCount,
        }
    }

    scheduledBuildFor(
        plot: ServerContract.Types.entity_info,
        entities: ServerContract.Types.entity_info[],
        now: Date
    ): ScheduledBuild | null {
        const hold = plot.holds.find((h) => h.kind.toNumber() === HoldKind.BUILD)
        if (!hold) return null
        const builder = entities.find((e) => e.id.equals(hold.counterpart.entity_id))
        const res = this.plotReservation(plot, builder, now)
        if (!res) return null
        return this.buildFromReservation(res, plot.id, builder)
    }

    scheduledBuildsByTarget(
        entities: ServerContract.Types.entity_info[],
        now: Date
    ): Map<string, ScheduledBuild> {
        const byId = new Map(entities.map((e) => [e.id.toString(), e]))
        const out = new Map<string, ScheduledBuild>()
        for (const entity of entities) {
            if (entity.type.toString() !== 'plot') continue
            const hold = entity.holds.find((h) => h.kind.toNumber() === HoldKind.BUILD)
            if (!hold) continue
            const builder = byId.get(hold.counterpart.entity_id.toString())
            const res = this.plotReservation(entity, builder, now)
            if (!res) continue
            out.set(entity.id.toString(), this.buildFromReservation(res, entity.id, builder))
        }
        return out
    }

    reservationsFrom(
        sourceEntityId: UInt64,
        entities: ServerContract.Types.entity_info[]
    ): Reservation[] {
        const source = entities.find((e) => e.id.equals(sourceEntityId))
        if (!source) return []
        return reservationsOf(source)
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

function moduleKey(module: ServerContract.Types.module_entry): string {
    const installed = module.installed
    if (!installed) return `${module.type.toNumber()}:empty`

    return `${module.type.toNumber()}:${installed.item_id.toNumber()}:${installed.stats.toString()}`
}

function sourceStackKey(cargo: ServerContract.Types.cargo_row): string {
    return `${cargo.item_id.toNumber()}#${cargo.stats.toString()}#${(cargo.modules ?? [])
        .map(moduleKey)
        .join(',')}`
}

function matchRelevantCargo(
    entity: ServerContract.Types.entity_info,
    target: BuildableTarget,
    cargo: ServerContract.Types.cargo_row[],
    reservedByItem: Map<number, number>
): SourceCargoStack[] {
    const needsByItemId = new Map(
        target.progress.rows.filter((row) => row.missing > 0).map((row) => [row.itemId, row])
    )
    const remainingReserved = new Map(reservedByItem)
    const out: SourceCargoStack[] = []
    for (const c of cargo) {
        if (!c.entity_id.equals(entity.id)) continue
        const itemId = c.item_id.toNumber()
        const need = needsByItemId.get(itemId)
        if (!need) continue
        const gross = c.quantity.toNumber()
        if (gross === 0) continue
        const reservedRemaining = remainingReserved.get(itemId) ?? 0
        const reserved = Math.min(gross, reservedRemaining)
        const available = gross - reserved
        if (reserved > 0) {
            remainingReserved.set(itemId, reservedRemaining - reserved)
        }
        if (available === 0) continue
        out.push({
            key: sourceStackKey(c),
            rowId: c.id,
            itemId,
            item: getItem(itemId),
            stats: c.stats,
            modules: c.modules ?? [],
            available,
            plotNeeds: need.missing,
            reserved,
        })
    }
    return out
}

function partitionSources(
    target: BuildableTarget,
    entities: ServerContract.Types.entity_info[],
    cargo: ServerContract.Types.cargo_row[]
): {eligible: SourceEntityRef[]; unreachable: SourceEntityRef[]} {
    const eligible: SourceEntityRef[] = []
    const unreachable: SourceEntityRef[] = []
    for (const entity of entities) {
        if (!entity.owner.equals(target.ownerName)) continue
        if (entity.id.equals(target.entityId)) continue
        if (!coordsEqual(entity.coordinates, target.coordinates)) continue
        const reserved = reservedByItemFor(entity)
        const relevant = matchRelevantCargo(entity, target, cargo, reserved)
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

function isPushTask(task: ServerContract.Types.task): boolean {
    return task.type.toNumber() === TaskType.UNLOAD
}

function isBuildOfPlot(task: ServerContract.Types.task, plotId: UInt64): boolean {
    return (
        task.type.toNumber() === TaskType.BUILDPLOT &&
        task.entitytarget !== undefined &&
        task.entitytarget.entity_id.equals(plotId)
    )
}

function reservationsOf(source: ServerContract.Types.entity_info): Reservation[] {
    const out = new Map<string, Reservation>()
    for (const task of getTasks(source)) {
        if (!isPushTask(task)) continue
        if (!task.entitytarget) continue
        const targetType = task.entitytarget.entity_type
        const targetId = task.entitytarget.entity_id
        for (const c of task.cargo) {
            const itemId = c.item_id.toNumber()
            const quantity = c.quantity.toNumber()
            if (quantity === 0) continue
            const key = `${targetId.toString()}#${itemId}`
            const existing = out.get(key)
            if (existing) {
                existing.quantity += quantity
            } else {
                out.set(key, {
                    targetEntityId: targetId,
                    targetEntityType: targetType,
                    itemId,
                    quantity,
                })
            }
        }
    }
    return Array.from(out.values())
}

function reservedByItemFor(source: ServerContract.Types.entity_info): Map<number, number> {
    const out = new Map<number, number>()
    for (const r of reservationsOf(source)) {
        out.set(r.itemId, (out.get(r.itemId) ?? 0) + r.quantity)
    }
    return out
}
