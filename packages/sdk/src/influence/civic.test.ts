import {describe, expect, test} from 'bun:test'
import {Name} from '@wharfkit/antelope'

import {
    MODULE_BUILDER,
    MODULE_CRAFTER,
    MODULE_LOADER,
    MODULE_STORAGE,
} from '../capabilities/modules'
import {
    ITEM_BUILDER_T1,
    ITEM_CONSTRUCTION_DOCK_T1_PACKED,
    ITEM_CRAFTER_T1,
    ITEM_DEPOT_T1_PACKED,
    ITEM_LOADER_T1,
    ITEM_STORAGE_T1,
    ITEM_WORKSHOP_T1_PACKED,
} from '../data/item-ids'
import {ENTITY_DEPOT, ENTITY_SHIP, ENTITY_WORKSHOP} from '../data/kind-registry'
import {decodeStats, encodeStats} from '../derivation/crafting'
import {CHARTER_REGISTRY, charterNode, type CharterNode} from './charters'
import {
    civicBuildingFor,
    civicHullItem,
    civicModuleItemFor,
    civicStatModuleType,
    emptyCivicModules,
    fitCivicModules,
    isCivicEntity,
    isCivicKind,
    previewCharterGrants,
    raiseCivicStat,
    type CivicStanding,
} from './civic'
import {
    CHARTER_BASELINE_STAT,
    CHARTER_RUNG_STEP,
    CIVIC_DEPOT,
    CIVIC_DOCK,
    CIVIC_GRANT_RUNG,
    CIVIC_SPEED_CAP,
    CIVIC_STAT_CRAFT_SPEED,
    CIVIC_STAT_STORAGE_CAPACITY,
    CIVIC_STAT_TRANSFER_SPEED,
    CIVIC_WORKSHOP,
} from './constants'
import {getStatCount} from './quality'

const NODE_WORKSHOP = 10001
const NODE_WORKSHOP_TUNEUPS = [10100201, 10100202, 10100203, 10100204]
const NODE_WORKSHOP_TUNEUP = NODE_WORKSHOP_TUNEUPS[0]
const NODE_DOCK = 30100001
const NODE_DOCK_TUNEUPS = [30100301, 30100302, 30100303, 30100304]
const NODE_DEPOT = 40100001
const NODE_DEPOT_BAYS = [40100101, 40100102, 40100103, 40100104]
const NODE_DEPOT_LOADERS = [40100401, 40100402, 40100403, 40100404]

function node(nodeId: number): CharterNode {
    const found = charterNode(nodeId)
    if (!found) throw new Error(`no charter node ${nodeId}`)
    return found
}

function stats(
    preview: {modules: {installed?: {item_id: unknown; stats: unknown}}[]},
    slot: number
) {
    const installed = preview.modules[slot].installed
    if (!installed) throw new Error(`slot ${slot} is empty`)
    const itemId = Number(installed.item_id)
    return {itemId, stats: decodeStats(BigInt(String(installed.stats)), getStatCount(itemId))}
}

function complete(standing: CivicStanding, nodeId: number): CivicStanding {
    const next = {...standing}
    for (const preview of previewCharterGrants(node(nodeId), standing)) {
        next[preview.building] = preview.modules
    }
    return next
}

describe('civic building tables', () => {
    test('each building maps to its restored hull item', () => {
        expect(civicHullItem(CIVIC_WORKSHOP)).toBe(ITEM_WORKSHOP_T1_PACKED)
        expect(civicHullItem(CIVIC_DOCK)).toBe(ITEM_CONSTRUCTION_DOCK_T1_PACKED)
        expect(civicHullItem(CIVIC_DEPOT)).toBe(ITEM_DEPOT_T1_PACKED)
        expect(civicHullItem(0)).toBe(0)
    })

    test('each civic stat is carried by one player T1 module type', () => {
        expect(civicStatModuleType(CIVIC_STAT_CRAFT_SPEED)).toBe(MODULE_CRAFTER)
        expect(civicStatModuleType(CIVIC_STAT_STORAGE_CAPACITY)).toBe(MODULE_STORAGE)
        expect(civicStatModuleType(CIVIC_STAT_TRANSFER_SPEED)).toBe(MODULE_LOADER)
        expect(civicModuleItemFor(MODULE_CRAFTER)).toBe(ITEM_CRAFTER_T1)
        expect(civicModuleItemFor(MODULE_BUILDER)).toBe(ITEM_BUILDER_T1)
        expect(civicModuleItemFor(MODULE_LOADER)).toBe(ITEM_LOADER_T1)
        expect(civicModuleItemFor(MODULE_STORAGE)).toBe(ITEM_STORAGE_T1)
    })

    test('civic kinds are the four buildings and nothing else', () => {
        expect(isCivicKind(ENTITY_WORKSHOP)).toBe(true)
        expect(isCivicKind('depot')).toBe(true)
        expect(isCivicKind(ENTITY_SHIP)).toBe(false)
        expect(civicBuildingFor(ENTITY_DEPOT)).toBe(CIVIC_DEPOT)
    })

    test('civic-ness is the owner, not the kind', () => {
        const civic = Name.from('eon.shipload')
        expect(isCivicEntity({owner: 'eon.shipload'}, civic)).toBe(true)
        expect(isCivicEntity({owner: Name.from('alice')}, civic)).toBe(false)
    })

    test('every rung in the registry lands on a stat its building defines', () => {
        for (const entry of CHARTER_REGISTRY) {
            for (const grant of entry.grants) {
                if (grant.kind !== CIVIC_GRANT_RUNG) continue
                expect(civicStatModuleType(grant.stat)).not.toBe(0)
                const layout = emptyCivicModules(grant.building).map((m) => Number(m.type))
                expect(layout).toContain(civicStatModuleType(grant.stat))
            }
        }
    })
})

describe('the fourteen nodes reproduce the chain-fitted buildings', () => {
    test('the Workshop node spawns five crafters at the baseline stat', () => {
        const [workshop] = previewCharterGrants(node(NODE_WORKSHOP))
        expect(workshop.building).toBe(CIVIC_WORKSHOP)
        expect(workshop.spawned).toBe(true)
        expect(workshop.itemId).toBe(ITEM_WORKSHOP_T1_PACKED)
        expect(workshop.modules.length).toBe(5)
        for (let slot = 0; slot < 5; slot++) {
            expect(stats(workshop, slot)).toEqual({
                itemId: ITEM_CRAFTER_T1,
                stats: [CHARTER_BASELINE_STAT, CHARTER_BASELINE_STAT],
            })
        }
    })

    test('each Workshop tune-up raises every crafter by one rung step, reaching 400', () => {
        let standing = complete({}, NODE_WORKSHOP)
        let raised = CHARTER_BASELINE_STAT
        for (const tuneup of NODE_WORKSHOP_TUNEUPS) {
            const [workshop] = previewCharterGrants(node(tuneup), standing)
            expect(workshop.spawned).toBe(false)
            raised += CHARTER_RUNG_STEP
            for (let slot = 0; slot < 5; slot++) {
                expect(stats(workshop, slot).stats).toEqual([raised, raised])
            }
            standing = complete(standing, tuneup)
        }
        expect(raised).toBe(400)
    })

    test('the Dock node fits one builder and its four tune-ups reach 400', () => {
        let standing = complete(complete({}, NODE_WORKSHOP), NODE_DOCK)
        expect(stats({modules: standing[CIVIC_DOCK]!}, 0)).toEqual({
            itemId: ITEM_BUILDER_T1,
            stats: [CHARTER_BASELINE_STAT, CHARTER_BASELINE_STAT],
        })
        let raised = CHARTER_BASELINE_STAT
        for (const tuneup of NODE_DOCK_TUNEUPS) {
            const [dock] = previewCharterGrants(node(tuneup), standing)
            raised += CHARTER_RUNG_STEP
            expect(stats(dock, 0).stats).toEqual([raised, raised])
            standing = complete(standing, tuneup)
        }
        expect(raised).toBe(400)
    })

    test('the Depot node fits a baseline loader and leaves the bays empty', () => {
        const standing = complete(complete({}, NODE_WORKSHOP), NODE_DEPOT)
        const depot = {modules: standing[CIVIC_DEPOT]!}
        expect(stats(depot, 0)).toEqual({
            itemId: ITEM_LOADER_T1,
            stats: [CHARTER_BASELINE_STAT, CHARTER_BASELINE_STAT],
        })
        for (let slot = 1; slot <= 4; slot++) expect(depot.modules[slot].installed).toBeUndefined()
    })

    test('the four bays fill the storage slots in order at the baseline stat', () => {
        let standing = complete(complete({}, NODE_WORKSHOP), NODE_DEPOT)
        for (let i = 0; i < NODE_DEPOT_BAYS.length; i++) {
            standing = complete(standing, NODE_DEPOT_BAYS[i])
            const depot = {modules: standing[CIVIC_DEPOT]!}
            for (let slot = 1; slot <= 4; slot++) {
                if (slot <= i + 1) {
                    expect(stats(depot, slot)).toEqual({
                        itemId: ITEM_STORAGE_T1,
                        stats: [
                            CHARTER_BASELINE_STAT,
                            CHARTER_BASELINE_STAT,
                            CHARTER_BASELINE_STAT,
                            CHARTER_BASELINE_STAT,
                        ],
                    })
                } else {
                    expect(depot.modules[slot].installed).toBeUndefined()
                }
            }
        }
    })

    test('the four loader rungs step the slot-0 loader by one rung each, reaching 400', () => {
        let standing = complete(complete({}, NODE_WORKSHOP), NODE_DEPOT)
        for (let i = 0; i < NODE_DEPOT_LOADERS.length; i++) {
            standing = complete(standing, NODE_DEPOT_LOADERS[i])
            const depot = {modules: standing[CIVIC_DEPOT]!}
            const stat = CHARTER_BASELINE_STAT + CHARTER_RUNG_STEP * (i + 1)
            expect(stats(depot, 0)).toEqual({itemId: ITEM_LOADER_T1, stats: [stat, stat]})
            for (let slot = 1; slot <= 4; slot++)
                expect(depot.modules[slot].installed).toBeUndefined()
        }
    })
})

describe('grant mechanics', () => {
    test('a module grant joins at a sibling stat', () => {
        const base = fitCivicModules(emptyCivicModules(CIVIC_DEPOT), 1)
        const raised = raiseCivicStat(base, {
            kind: CIVIC_GRANT_RUNG,
            building: CIVIC_DEPOT,
            stat: CIVIC_STAT_TRANSFER_SPEED,
            value: 50,
        })
        const withBay = fitCivicModules(raised, 1)
        expect(stats({modules: withBay}, 1).stats).toEqual([0, 0, 0, 0])
        const withSecondBay = fitCivicModules(
            raiseCivicStat(withBay, {
                kind: CIVIC_GRANT_RUNG,
                building: CIVIC_DEPOT,
                stat: CIVIC_STAT_STORAGE_CAPACITY,
                value: 7,
            }),
            1
        )
        expect(stats({modules: withSecondBay}, 2).stats).toEqual([7, 7, 7, 7])
    })

    test('a rung caps at the civic speed cap', () => {
        const fitted = fitCivicModules(emptyCivicModules(CIVIC_WORKSHOP), 5)
        const raised = raiseCivicStat(fitted, {
            kind: CIVIC_GRANT_RUNG,
            building: CIVIC_WORKSHOP,
            stat: CIVIC_STAT_CRAFT_SPEED,
            value: 5000,
        })
        expect(stats({modules: raised}, 0).stats).toEqual([CIVIC_SPEED_CAP, CIVIC_SPEED_CAP])
    })

    test('a module grant past the layout is refused', () => {
        const full = fitCivicModules(emptyCivicModules(CIVIC_DOCK), 1)
        expect(() => fitCivicModules(full, 1)).toThrow('no open slot')
    })

    test('a rung with no carrier is refused', () => {
        expect(() =>
            raiseCivicStat(emptyCivicModules(CIVIC_DEPOT), {
                kind: CIVIC_GRANT_RUNG,
                building: CIVIC_DEPOT,
                stat: CIVIC_STAT_TRANSFER_SPEED,
                value: 1,
            })
        ).toThrow('no module carrying')
    })

    test('a grant on a building that is not standing is refused', () => {
        expect(() => previewCharterGrants(node(NODE_WORKSHOP_TUNEUP))).toThrow('not standing')
    })

    test('inputs are never mutated', () => {
        const before = emptyCivicModules(CIVIC_WORKSHOP)
        const snapshot = before.map((m) => String(m.installed?.stats ?? 'empty'))
        fitCivicModules(before, 5)
        expect(before.map((m) => String(m.installed?.stats ?? 'empty'))).toEqual(snapshot)
        expect(encodeStats([1, 2])).not.toBe(0n)
    })
})
