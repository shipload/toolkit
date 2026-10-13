import type {UInt32Type, UInt64Type} from '@wharfkit/antelope'
import {ServerContract} from '../contracts'
import type {ComputedCapabilities} from '../derivation/capabilities'
import {routeBarriers, type RouteMoverInput} from '../travel/route-simulator'
import {calc_queue_cargomass} from '../travel/travel'
import type {AnchoredScheduleData} from '../scheduling/schedule'
import type {GatherLane} from '../planner'

const U8_MAX = 255
const U16_MAX = 65_535
const U32_MAX = 4_294_967_295

function clampField(value: number, max: number): number {
    return Math.min(max, Math.max(0, Math.floor(Number(value) || 0)))
}

export interface GathererLaneSource {
    gathererLanes?: ComputedCapabilities['gathererLanes']
    gatherer?: ComputedCapabilities['gatherer']
}

export function hydrateEntityLanes(caps: GathererLaneSource): GatherLane[] {
    const lanes = caps.gathererLanes?.length
        ? caps.gathererLanes
        : caps.gatherer
          ? [
                {
                    slotIndex: 0,
                    yield: caps.gatherer.yield,
                    drain: caps.gatherer.drain,
                    depth: caps.gatherer.depth,
                    outputPct: 100,
                },
            ]
          : []
    return lanes.map((lane) =>
        ServerContract.Types.gatherer_lane.from({
            slot_index: clampField(lane.slotIndex, U8_MAX),
            yield: clampField(lane.yield, U16_MAX),
            drain: clampField(lane.drain, U32_MAX),
            depth: clampField(lane.depth, U16_MAX),
            output_pct: clampField(lane.outputPct, U16_MAX),
        })
    )
}

export interface RouteMoverRow extends AnchoredScheduleData {
    id: UInt64Type
    energy?: UInt32Type | number
    cargomass?: UInt32Type | number
}

export type RouteMoverCaps = Pick<
    ComputedCapabilities,
    'hullmass' | 'engines' | 'generator' | 'hauler' | 'loaderLanes'
>

export interface RouteMoverOpts {
    entityType?: string
    hasMovement?: boolean
    nowMs?: number
    priorMobilityEnd?: number
    narrowBarrierEnd?: number
    allLanesEnd?: number
}

export function entityToRouteMover(
    row: RouteMoverRow,
    caps: RouteMoverCaps,
    opts: RouteMoverOpts = {}
): RouteMoverInput {
    const loaderMass = (caps.loaderLanes ?? []).reduce((sum, lane) => sum + Number(lane.mass), 0)
    const queued = row.lanes !== undefined || row.holds !== undefined
    const barriers = queued ? routeBarriers(row, opts.nowMs ?? Date.now()) : undefined
    const cargomass = row.lanes
        ? calc_queue_cargomass({...row, cargomass: Number(row.cargomass ?? 0)})
        : Number(row.cargomass ?? 0)
    const mass = cargomass + Number(caps.hullmass ?? 0) + loaderMass
    return {
        ref: {entityType: opts.entityType ?? 'ship', entityId: row.id},
        hasMovement:
            opts.hasMovement ?? (caps.engines !== undefined && caps.generator !== undefined),
        engines: caps.engines,
        generator: caps.generator,
        hauler: caps.hauler
            ? {capacity: caps.hauler.capacity, efficiency: caps.hauler.efficiency}
            : undefined,
        mass,
        energy: Number(row.energy ?? 0),
        priorMobilityEnd: opts.priorMobilityEnd ?? 0,
        narrowBarrierEnd: opts.narrowBarrierEnd ?? 0,
        allLanesEnd: opts.allLanesEnd,
        cargoEffects: barriers?.cargoEffects,
        incomingMass: barriers?.incomingMass,
    }
}
