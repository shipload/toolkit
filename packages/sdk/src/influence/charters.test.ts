import {describe, expect, test} from 'bun:test'
import {
    CHARTER_NONE,
    CIVIC_DEPOT,
    CIVIC_DOCK,
    CIVIC_STAT_CRAFT_SPEED,
    CIVIC_STAT_TRANSFER_SPEED,
    CIVIC_WORKSHOP,
} from './constants'
import {
    charterEligible,
    charterIneligible,
    charterNode,
    charterBuildingEntity,
    charterGateNodeFor,
    charterRungValue,
    charterSingletonMandate,
    charterModuleCount,
    eligibleCharters,
    type BuiltCharter,
    type CharterWorld,
    type WorldBuilding,
} from './charters'

const WORKSHOP = 10001
const NEXUS = 20001
const DOCK = 30100001
const WORKSHOP_TUNEUP = 10100201
const DOCK_TUNEUP = 30100301
const DEPOT = 40100001

const WORKSHOP_ENTITY = 100n
const DOCK_ENTITY = 300n

function world(built: BuiltCharter[]): CharterWorld {
    return {built}
}

function node(nodeId: number) {
    const found = charterNode(nodeId)
    if (!found) throw new Error(`registry is missing node ${nodeId}`)
    return found
}

function eligibleIds(w: CharterWorld): number[] {
    return eligibleCharters(w).map((n) => n.nodeId)
}

describe('charter eligibility mirror', () => {
    test('an unbuilt world offers only the root', () => {
        expect(eligibleIds(world([]))).toEqual([WORKSHOP])
    })

    test('the root is the mandate by the singleton rule with no ballot', () => {
        expect(charterSingletonMandate(world([]))).toBe(WORKSHOP)
    })

    test('completing the root opens the fork and closes the singleton path', () => {
        const built = world([{nodeId: WORKSHOP, repeats: 0}])
        expect(eligibleIds(built)).toEqual([WORKSHOP_TUNEUP, NEXUS, DOCK, DEPOT])
        expect(charterSingletonMandate(built)).toBe(CHARTER_NONE)
    })

    test('a completed charter reports already-taken', () => {
        const built = world([{nodeId: WORKSHOP, repeats: 0}])
        expect(charterIneligible(built, node(WORKSHOP))).toBe('already-taken')
    })

    test('an unmet prereq reports prereq-missing', () => {
        expect(charterIneligible(world([]), node(NEXUS))).toBe('prereq-missing')
        expect(charterIneligible(world([]), node(DOCK_TUNEUP))).toBe('prereq-missing')
    })

    test('a rung is eligible as soon as its prereq is complete', () => {
        const built = world([{nodeId: WORKSHOP, repeats: 0}])
        expect(charterEligible(built, node(WORKSHOP_TUNEUP))).toBe(true)
    })

    test('a level gate is the node that creates its building', () => {
        expect(charterGateNodeFor(CIVIC_WORKSHOP)?.nodeId).toBe(WORKSHOP)
        expect(charterGateNodeFor(CIVIC_DOCK)?.nodeId).toBe(DOCK)
        expect(charterGateNodeFor(CIVIC_DEPOT)?.nodeId).toBe(DEPOT)
        expect(charterGateNodeFor(99)).toBeUndefined()
    })

    test('a building resolves to the entity recorded for its kind', () => {
        const buildings: WorldBuilding[] = [
            {entityId: WORKSHOP_ENTITY, building: CIVIC_WORKSHOP},
            {entityId: DOCK_ENTITY, building: CIVIC_DOCK},
        ]
        expect(charterBuildingEntity(buildings, CIVIC_WORKSHOP)).toBe(WORKSHOP_ENTITY)
        expect(charterBuildingEntity(buildings, CIVIC_DEPOT)).toBe(0n)
        expect(charterBuildingEntity([], CIVIC_DEPOT)).toBe(0n)
    })

    test('rung values sum over the completed nodes only', () => {
        const gateOnly = world([{nodeId: WORKSHOP, repeats: 0}])
        expect(charterRungValue(gateOnly, CIVIC_WORKSHOP, CIVIC_STAT_CRAFT_SPEED)).toBe(200)

        const tuned = world([
            {nodeId: WORKSHOP, repeats: 0},
            {nodeId: WORKSHOP_TUNEUP, repeats: 0},
        ])
        expect(charterRungValue(tuned, CIVIC_WORKSHOP, CIVIC_STAT_CRAFT_SPEED)).toBe(250)
        expect(charterRungValue(tuned, CIVIC_DEPOT, CIVIC_STAT_TRANSFER_SPEED)).toBe(0)
    })

    test('modules sum over the completed nodes only', () => {
        expect(charterModuleCount(world([]), CIVIC_WORKSHOP)).toBe(0)
        expect(charterModuleCount(world([{nodeId: WORKSHOP, repeats: 0}]), CIVIC_WORKSHOP)).toBe(5)
    })
})
