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
    charterWorkerCount,
    eligibleCharters,
    type BuiltCharter,
    type CharterWorld,
} from './charters'

const WORKSHOP = 1
const NEXUS = 2
const DOCK = 3
const WORKSHOP_TUNEUP = 4
const DOCK_TUNEUP = 5
const DEPOT = 6

const WORKSHOP_ENTITY = 100n
const DOCK_ENTITY = 300n
const DEPOT_ENTITY = 600n

function world(built: BuiltCharter[], present?: bigint[]): CharterWorld {
    if (!present) return {built}
    return {built, entityExists: (id) => present.includes(id)}
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
        const built = world([{nodeId: WORKSHOP, entityId: WORKSHOP_ENTITY}])
        expect(eligibleIds(built)).toEqual([NEXUS, DOCK, WORKSHOP_TUNEUP, DEPOT])
        expect(charterSingletonMandate(built)).toBe(CHARTER_NONE)
    })

    test('a completed charter reports already-taken', () => {
        const built = world([{nodeId: WORKSHOP, entityId: WORKSHOP_ENTITY}])
        expect(charterIneligible(built, node(WORKSHOP))).toBe('already-taken')
    })

    test('an unmet prereq reports prereq-missing', () => {
        expect(charterIneligible(world([]), node(NEXUS))).toBe('prereq-missing')
        expect(charterIneligible(world([]), node(DOCK_TUNEUP))).toBe('prereq-missing')
    })

    test('a rung is eligible as soon as its prereq is complete', () => {
        const built = [{nodeId: WORKSHOP, entityId: WORKSHOP_ENTITY}]
        expect(charterEligible(world(built, [WORKSHOP_ENTITY]), node(WORKSHOP_TUNEUP))).toBe(true)
    })

    test('an absent entity predicate trusts the charter record', () => {
        const built = world([{nodeId: WORKSHOP, entityId: WORKSHOP_ENTITY}])
        expect(charterEligible(built, node(WORKSHOP_TUNEUP))).toBe(true)
    })

    test('a level gate is the node that creates its building', () => {
        expect(charterGateNodeFor(CIVIC_WORKSHOP)?.nodeId).toBe(WORKSHOP)
        expect(charterGateNodeFor(CIVIC_DOCK)?.nodeId).toBe(DOCK)
        expect(charterGateNodeFor(CIVIC_DEPOT)?.nodeId).toBe(DEPOT)
        expect(charterGateNodeFor(99)).toBeUndefined()
    })

    test('a building resolves to the entity its gate recorded', () => {
        const built = [
            {nodeId: WORKSHOP, entityId: WORKSHOP_ENTITY},
            {nodeId: DOCK, entityId: DOCK_ENTITY},
        ]
        expect(charterBuildingEntity(world(built), CIVIC_WORKSHOP)).toBe(WORKSHOP_ENTITY)
        expect(charterBuildingEntity(world(built, [DOCK_ENTITY]), CIVIC_WORKSHOP)).toBe(0n)
        expect(charterBuildingEntity(world([]), CIVIC_DEPOT)).toBe(0n)
    })

    test('rung values sum over the completed nodes only', () => {
        const gateOnly = world([{nodeId: WORKSHOP, entityId: WORKSHOP_ENTITY}])
        expect(charterRungValue(gateOnly, CIVIC_WORKSHOP, CIVIC_STAT_CRAFT_SPEED)).toBe(213)

        const tuned = world([
            {nodeId: WORKSHOP, entityId: WORKSHOP_ENTITY},
            {nodeId: WORKSHOP_TUNEUP, entityId: 0n},
        ])
        expect(charterRungValue(tuned, CIVIC_WORKSHOP, CIVIC_STAT_CRAFT_SPEED)).toBe(400)
        expect(charterRungValue(tuned, CIVIC_DEPOT, CIVIC_STAT_TRANSFER_SPEED)).toBe(0)
    })

    test('workers sum over the completed nodes only', () => {
        expect(charterWorkerCount(world([]), CIVIC_WORKSHOP)).toBe(0)
        expect(
            charterWorkerCount(
                world([{nodeId: WORKSHOP, entityId: WORKSHOP_ENTITY}]),
                CIVIC_WORKSHOP
            )
        ).toBe(5)
    })
})
