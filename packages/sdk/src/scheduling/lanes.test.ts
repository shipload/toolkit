import {UInt8, UInt16, UInt64} from '@wharfkit/antelope'
import {expect, test} from 'bun:test'
import {encodeStats} from '../derivation/crafting'
import {computeGathererDepth, computeGathererDrain} from '../nft/description'
import {computeGathererYield} from '../derivation/capabilities'
import {computeLoaderThrust, computeLoaderMass} from '../nft/description'
import {computeCrafterSpeed, computeCrafterDrain} from '../nft/description'
import {applySlotMultiplier} from '../entities/slot-multiplier'
import {getSlotAmp} from '../entities/slot-multiplier'
import {getEntityLayout} from '../data/recipes-runtime'
import {ITEM_GATHERER_T1, ITEM_LOADER_T1, ITEM_CRAFTER_T1} from '../data/item-ids'
import {
    workerLaneKey,
    resolveLaneGatherer,
    resolveLaneCrafter,
    resolveLaneLoader,
    selectGatherLane,
} from './lanes'
import {LANE_MOBILITY} from './schedule'
import type {ServerContract} from '../contracts'

type ModuleEntry = ServerContract.Types.module_entry
type Lane = ServerContract.Types.lane

// Real gatherer-bearing entity: extractor 10203 has [generator@0, gatherer@1].
const EXTRACTOR_GATHERER = 10203
const GATHERER_SLOT_IDX = 1
const GATHERER_LANE_KEY = GATHERER_SLOT_IDX + 1 // = 2

function makeModuleEntry(itemId: number, stats: bigint): ModuleEntry {
    return {
        type: UInt8.from(0),
        installed: {
            item_id: UInt16.from(itemId),
            stats: UInt64.from(stats),
        },
    } as unknown as ModuleEntry
}

function makeBusyLane(laneKey: number): Lane {
    return {
        lane_key: UInt8.from(laneKey),
        schedule: {
            started: {toDate: () => new Date()} as any,
            tasks: [{duration: UInt64.from(100)} as any],
        },
    } as unknown as Lane
}

// gatherer: stats = [str=300, tol=200, con=400], tier=1
const GATH_STR = 300
const GATH_TOL = 200
const GATH_CON = 400
const gathererStats1 = encodeStats([GATH_STR, GATH_TOL, GATH_CON])

// loader: stats = [ins=300, pla=500]
const LOADER_INS = 300
const LOADER_PLA = 500
const loaderStats = encodeStats([LOADER_INS, LOADER_PLA])

// crafter: stats = [rea=400, fin=300]
const CRAFTER_REA = 400
const CRAFTER_FIN = 300
const crafterStats = encodeStats([CRAFTER_REA, CRAFTER_FIN])

// --- resolveLaneGatherer ---

test('resolveLaneGatherer reads the layout slot amp and applies it to yield (parity formula)', () => {
    // Gatherer at the entity's real gatherer slot (index 1 => laneKey 2); amp comes from getEntityLayout(10203).
    const modules: ModuleEntry[] = [
        makeModuleEntry(ITEM_GATHERER_T1, gathererStats1), // slot 0 (generator slot, ignored)
        makeModuleEntry(ITEM_GATHERER_T1, gathererStats1), // slot 1 (gatherer slot)
    ]
    const result = resolveLaneGatherer(modules, EXTRACTOR_GATHERER, GATHERER_LANE_KEY)

    const layout = getEntityLayout(EXTRACTOR_GATHERER)?.slots ?? []
    const ampFromLayout = getSlotAmp(layout, GATHERER_SLOT_IDX)

    // The resolver routes through the real layout's amp, not a hardcoded 100.
    expect(result.outputPct).toBe(ampFromLayout)
    // Yield equals the contract formula clamp_to_uint16(compute_gatherer_yield(str, tier) * amp / 100).
    expect(result.yield).toBe(applySlotMultiplier(computeGathererYield(GATH_STR, 1), ampFromLayout))
    expect(result.drain).toBe(computeGathererDrain(GATH_CON))
    expect(result.depth).toBe(computeGathererDepth(GATH_TOL, 1))
    expect(result.slotIndex).toBe(GATHERER_SLOT_IDX)
})

test('resolveLaneGatherer amp-scaling parity holds for a non-100 amp', () => {
    // Parity for a non-100 amp: clamp_to_uint16(value * amp / 100).
    expect(applySlotMultiplier(computeGathererYield(GATH_STR, 1), 80)).toBe(
        Math.min(Math.floor((computeGathererYield(GATH_STR, 1) * 80) / 100), 65535)
    )
    expect(applySlotMultiplier(computeGathererYield(GATH_STR, 1), 120)).toBe(
        Math.floor((computeGathererYield(GATH_STR, 1) * 120) / 100)
    )
})

test('resolveLaneGatherer throws on out-of-range laneKey', () => {
    const modules: ModuleEntry[] = [makeModuleEntry(ITEM_GATHERER_T1, gathererStats1)]
    expect(() => resolveLaneGatherer(modules, ITEM_GATHERER_T1, 5)).toThrow(
        'gatherer lane has no module'
    )
})

test('resolveLaneGatherer throws on laneKey=0 (slot=255 off-by-one boundary)', () => {
    const modules: ModuleEntry[] = [makeModuleEntry(ITEM_GATHERER_T1, gathererStats1)]
    expect(() => resolveLaneGatherer(modules, ITEM_GATHERER_T1, 0)).toThrow(
        'gatherer lane has no module'
    )
})

// --- resolveLaneCrafter ---

test('resolveLaneCrafter returns correct stats for slot 0 (laneKey=1)', () => {
    const modules: ModuleEntry[] = [makeModuleEntry(ITEM_CRAFTER_T1, crafterStats)]
    const result = resolveLaneCrafter(modules, ITEM_CRAFTER_T1, 1)
    const layout = getEntityLayout(ITEM_CRAFTER_T1)?.slots ?? []
    const amp = getSlotAmp(layout, 0)
    expect(result.slotIndex).toBe(0)
    expect(result.speed).toBe(applySlotMultiplier(computeCrafterSpeed(CRAFTER_REA, 1), amp))
    expect(result.drain).toBe(computeCrafterDrain(CRAFTER_FIN))
    expect(result.outputPct).toBe(amp)
})

test('resolveLaneCrafter throws on out-of-range laneKey', () => {
    const modules: ModuleEntry[] = [makeModuleEntry(ITEM_CRAFTER_T1, crafterStats)]
    expect(() => resolveLaneCrafter(modules, ITEM_CRAFTER_T1, 5)).toThrow(
        'crafter lane has no module'
    )
})

test('resolveLaneCrafter throws on laneKey=0 (slot=255 off-by-one boundary)', () => {
    const modules: ModuleEntry[] = [makeModuleEntry(ITEM_CRAFTER_T1, crafterStats)]
    expect(() => resolveLaneCrafter(modules, ITEM_CRAFTER_T1, 0)).toThrow(
        'crafter lane has no module'
    )
})

// --- resolveLaneLoader ---

test('resolveLaneLoader returns correct stats for slot 0 (laneKey=1)', () => {
    const modules: ModuleEntry[] = [makeModuleEntry(ITEM_LOADER_T1, loaderStats)]
    const result = resolveLaneLoader(modules, ITEM_LOADER_T1, 1)
    const layout = getEntityLayout(ITEM_LOADER_T1)?.slots ?? []
    const amp = getSlotAmp(layout, 0)
    expect(result.valid).toBe(true)
    expect(result.slotIndex).toBe(0)
    expect(result.thrust).toBe(applySlotMultiplier(computeLoaderThrust(LOADER_PLA, 1), amp))
    expect(result.mass).toBe(computeLoaderMass(LOADER_INS))
    expect(result.outputPct).toBe(amp)
})

test('resolveLaneLoader soft-returns invalid for LANE_MOBILITY (key 0), never throws', () => {
    const modules: ModuleEntry[] = [makeModuleEntry(ITEM_LOADER_T1, loaderStats)]
    const result = resolveLaneLoader(modules, ITEM_LOADER_T1, LANE_MOBILITY)
    expect(result.valid).toBe(false)
    expect(result.thrust).toBe(0)
    expect(result.mass).toBe(0)
})

test('resolveLaneLoader soft-returns invalid for a missing/out-of-range module, never throws', () => {
    const modules: ModuleEntry[] = [makeModuleEntry(ITEM_LOADER_T1, loaderStats)]
    const result = resolveLaneLoader(modules, ITEM_LOADER_T1, 5)
    expect(result.valid).toBe(false)
    expect(result.thrust).toBe(0)
    expect(result.mass).toBe(0)
})

// --- depth-aware workerLaneKey ---

test('workerLaneKey with stratum picks first-free reaching gatherer', () => {
    const shallowStats = encodeStats([100, 200, 100]) // tol=200 => depth=1500 for tier1
    const deepStats = encodeStats([100, 900, 100]) // tol=900 => depth=5000 for tier1
    const modules: ModuleEntry[] = [
        makeModuleEntry(ITEM_GATHERER_T1, shallowStats),
        makeModuleEntry(ITEM_GATHERER_T1, deepStats),
    ]
    const laneKey = workerLaneKey(modules, 'gatherer', [], 2000)
    expect(laneKey).toBe(2) // slot 1 => laneKey 2
})

test('workerLaneKey with stratum: first free reaching is preferred over busy reaching', () => {
    const deepStats = encodeStats([100, 900, 100]) // tol=900 => depth=5000 for tier1
    const modules: ModuleEntry[] = [
        makeModuleEntry(ITEM_GATHERER_T1, deepStats),
        makeModuleEntry(ITEM_GATHERER_T1, deepStats),
    ]
    const lanes: Lane[] = [makeBusyLane(1)] // slot 0 is busy
    const laneKey = workerLaneKey(modules, 'gatherer', lanes, 2000)
    expect(laneKey).toBe(2) // slot 1 (laneKey=2) is free and reaching
})

test('workerLaneKey with stratum: returns lowest reaching (busy) when all reaching are busy', () => {
    const deepStats = encodeStats([100, 900, 100]) // tol=900 => depth=5000 for tier1
    const modules: ModuleEntry[] = [
        makeModuleEntry(ITEM_GATHERER_T1, deepStats),
        makeModuleEntry(ITEM_GATHERER_T1, deepStats),
    ]
    const lanes: Lane[] = [makeBusyLane(1), makeBusyLane(2)]
    const laneKey = workerLaneKey(modules, 'gatherer', lanes, 2000)
    expect(laneKey).toBe(1) // lowest reaching is slot 0 => laneKey 1
})

test('workerLaneKey with stratum throws "no gatherer reaches this stratum" when none reach', () => {
    const shallowStats = encodeStats([100, 10, 100]) // tol=10 => depth=550 for tier1
    const modules: ModuleEntry[] = [makeModuleEntry(ITEM_GATHERER_T1, shallowStats)]
    expect(() => workerLaneKey(modules, 'gatherer', [], 5000)).toThrow(
        'no gatherer reaches this stratum'
    )
})

test('workerLaneKey without stratum still works (non-gatherer path)', () => {
    const modules: ModuleEntry[] = [makeModuleEntry(ITEM_CRAFTER_T1, crafterStats)]
    const laneKey = workerLaneKey(modules, 'crafter', [])
    expect(laneKey).toBe(1)
})

// --- selectGatherLane: both real error paths ---

test('selectGatherLane auto-pick returns the depth-aware lane', () => {
    const shallowStats = encodeStats([100, 200, 100]) // depth=1500 for tier1
    const deepStats = encodeStats([100, 900, 100]) // depth=5000 for tier1
    const modules: ModuleEntry[] = [
        makeModuleEntry(ITEM_GATHERER_T1, shallowStats),
        makeModuleEntry(ITEM_GATHERER_T1, deepStats),
    ]
    expect(selectGatherLane(modules, ITEM_GATHERER_T1, [], 2000)).toBe(2)
})

test('selectGatherLane auto-pick throws "no gatherer reaches this stratum" when none reach', () => {
    const shallowStats = encodeStats([100, 10, 100]) // depth=550 for tier1
    const modules: ModuleEntry[] = [makeModuleEntry(ITEM_GATHERER_T1, shallowStats)]
    expect(() => selectGatherLane(modules, ITEM_GATHERER_T1, [], 5000)).toThrow(
        'no gatherer reaches this stratum'
    )
})

test('selectGatherLane explicit slot returns its laneKey when stratum is within depth', () => {
    const deepStats = encodeStats([100, 900, 100]) // depth=5000 for tier1
    const modules: ModuleEntry[] = [makeModuleEntry(ITEM_GATHERER_T1, deepStats)]
    expect(selectGatherLane(modules, ITEM_GATHERER_T1, [], 2000, 0)).toBe(1) // slot 0 => laneKey 1
})

test('selectGatherLane explicit slot too shallow throws "stratum exceeds gatherer depth"', () => {
    const shallowStats = encodeStats([100, 10, 100]) // depth=550 for tier1
    const modules: ModuleEntry[] = [makeModuleEntry(ITEM_GATHERER_T1, shallowStats)]
    expect(() => selectGatherLane(modules, ITEM_GATHERER_T1, [], 5000, 0)).toThrow(
        'stratum exceeds gatherer depth'
    )
})
