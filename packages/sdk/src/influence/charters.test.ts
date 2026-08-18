import {describe, expect, test} from 'bun:test'
import {CHARTER_NONE} from './constants'
import {
    charterEligible,
    charterIneligible,
    charterNode,
    charterSingletonMandate,
    charterSpawnNodeFor,
    effectiveMandate,
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

    test('a refit whose spawned target is gone reports refit-target-missing', () => {
        const built = [{nodeId: WORKSHOP, entityId: WORKSHOP_ENTITY}]
        expect(charterEligible(world(built, [WORKSHOP_ENTITY]), node(WORKSHOP_TUNEUP))).toBe(true)
        expect(charterIneligible(world(built, []), node(WORKSHOP_TUNEUP))).toBe(
            'refit-target-missing'
        )
    })

    test('a demolished target can empty an otherwise singleton eligible set', () => {
        const built = [
            {nodeId: WORKSHOP, entityId: WORKSHOP_ENTITY},
            {nodeId: NEXUS, entityId: 200n},
            {nodeId: DOCK, entityId: DOCK_ENTITY},
            {nodeId: DOCK_TUNEUP, entityId: 0n},
            {nodeId: DEPOT, entityId: DEPOT_ENTITY},
        ]
        expect(charterSingletonMandate(world(built, [WORKSHOP_ENTITY, DOCK_ENTITY]))).toBe(
            WORKSHOP_TUNEUP
        )
        expect(charterSingletonMandate(world(built, [DOCK_ENTITY]))).toBe(CHARTER_NONE)
    })

    test('an absent entity predicate trusts the charter record', () => {
        const built = world([{nodeId: WORKSHOP, entityId: WORKSHOP_ENTITY}])
        expect(charterEligible(built, node(WORKSHOP_TUNEUP))).toBe(true)
    })

    test('refit targets resolve through the node that spawns the item', () => {
        expect(charterSpawnNodeFor(node(WORKSHOP_TUNEUP).effect.targetItemId)?.nodeId).toBe(
            WORKSHOP
        )
        expect(charterSpawnNodeFor(node(DOCK_TUNEUP).effect.targetItemId)?.nodeId).toBe(DOCK)
        expect(charterSpawnNodeFor(0)).toBeUndefined()
    })
})

describe('effective mandate', () => {
    const forked = world([{nodeId: WORKSHOP, entityId: WORKSHOP_ENTITY}])

    test('a stored choice holds inside its own epoch', () => {
        expect(effectiveMandate({chosen: DOCK, chosenEpoch: 7}, forked, 7)).toBe(DOCK)
    })

    test('the same stored choice expires one epoch later', () => {
        expect(effectiveMandate({chosen: DOCK, chosenEpoch: 7}, forked, 8)).toBe(CHARTER_NONE)
    })

    test('an expired choice falls through to the singleton rule', () => {
        const unbuilt = world([])
        expect(effectiveMandate({chosen: NEXUS, chosenEpoch: 7}, unbuilt, 8)).toBe(WORKSHOP)
    })

    test('a cleared pair reads the singleton rule', () => {
        expect(effectiveMandate({chosen: CHARTER_NONE, chosenEpoch: 0}, world([]), 3)).toBe(
            WORKSHOP
        )
        expect(effectiveMandate({chosen: CHARTER_NONE, chosenEpoch: 0}, forked, 3)).toBe(
            CHARTER_NONE
        )
    })
})
