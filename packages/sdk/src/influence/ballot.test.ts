import {describe, expect, test} from 'bun:test'
import {
    charterEligible,
    charterEligibleChained,
    CHARTER_REGISTRY,
    type CharterWorld,
} from './charters'
import {projectBallot} from './ballot'

const NEXUS = 20100001
const DOCK = 30100001
const WORKSHOP_TUNEUP = 10100201
const DOCK_TUNEUP = 30100301
const DEPOT = 40100001

const world: CharterWorld = {built: [{nodeId: 10001, entityId: 100n}], entityExists: () => true}

describe('charterEligibleChained', () => {
    test('with nothing seated it equals charterEligible', () => {
        for (const node of CHARTER_REGISTRY) {
            expect(charterEligibleChained(world, node, [])).toBe(charterEligible(world, node))
        }
    })

    test('a seated prerequisite opens a dependent, a seated node closes itself', () => {
        const tuneup = CHARTER_REGISTRY.find((n) => n.nodeId === DOCK_TUNEUP)!
        expect(charterEligibleChained(world, tuneup, [])).toBe(false)
        expect(charterEligibleChained(world, tuneup, [DOCK])).toBe(true)
        const dock = CHARTER_REGISTRY.find((n) => n.nodeId === DOCK)!
        expect(charterEligibleChained(world, dock, [DOCK])).toBe(false)
    })
})

describe('projectBallot', () => {
    const voters = [
        {account: 'carol', weight: 9_000n, picks: [DOCK, DOCK_TUNEUP]},
        {account: 'dave', weight: 5_000n, picks: [NEXUS, DOCK_TUNEUP]},
        {account: 'erin', weight: 0n, picks: [NEXUS]},
    ]

    test('one seat: the heavier pick wins and the frontier carries round weights', () => {
        const result = projectBallot({world, seats: 1, voters})
        expect(result.seats).toEqual([{nodeId: DOCK, weight: 9_000n}])
        const nexus = result.options.find((o) => o.nodeId === NEXUS)!
        expect(nexus.seat).toBe(0)
        expect(nexus.weight).toBe(5_000n)
        const tuneup = result.options.find((o) => o.nodeId === DOCK_TUNEUP)!
        expect(tuneup.seat).toBe(0)
        expect(tuneup.weight).toBe(9_000n)
        expect(result.options.find((o) => o.nodeId === 10001)).toBeUndefined()
    })

    test('two seats: the dock tune-up chains behind the dock', () => {
        const result = projectBallot({world, seats: 2, voters})
        expect(result.seats.map((s) => s.nodeId)).toEqual([DOCK, DOCK_TUNEUP])
        expect(result.seats[1].weight).toBe(9_000n)
    })

    test('a tie goes to the lower option id', () => {
        const tied = [
            {account: 'a', weight: 100n, picks: [DOCK]},
            {account: 'b', weight: 100n, picks: [NEXUS]},
        ]
        expect(projectBallot({world, seats: 1, voters: tied}).seats[0].nodeId).toBe(NEXUS)
    })

    test('a zero round ends early and an empty queue stays empty, even with one node left', () => {
        expect(projectBallot({world, seats: 4, voters}).seats.length).toBe(3)
        expect(projectBallot({world, seats: 1, voters: []}).seats).toEqual([])
        const almostDone: CharterWorld = {
            built: CHARTER_REGISTRY.filter((n) => n.nodeId !== 40100404).map((n) => ({
                nodeId: n.nodeId,
                entityId: 1n,
            })),
            entityExists: () => true,
        }
        expect(projectBallot({world: almostDone, seats: 1, voters: []}).seats).toEqual([])
        expect(
            projectBallot({
                world: almostDone,
                seats: 1,
                voters: [{account: 'a', weight: 5n, picks: [40100404]}],
            }).seats
        ).toEqual([{nodeId: 40100404, weight: 5n}])
    })

    test('the caller picks are ranked on the options', () => {
        const result = projectBallot({world, seats: 1, voters, picks: [NEXUS, DOCK]})
        expect(result.options.find((o) => o.nodeId === NEXUS)!.rank).toBe(1)
        expect(result.options.find((o) => o.nodeId === DOCK)!.rank).toBe(2)
        expect(result.options.find((o) => o.nodeId === WORKSHOP_TUNEUP)!.rank).toBe(0)
    })

    test('a pick slot is consumed by the first eligible option regardless of the voter weight behind it', () => {
        const scenario = [
            {account: 'grace', weight: 50n, picks: [NEXUS, DEPOT]},
            {account: 'frank', weight: 45n, picks: [DEPOT]},
            {account: 'erin', weight: 0n, picks: [NEXUS, DEPOT]},
        ]
        expect(projectBallot({world, seats: 1, voters: scenario}).seats).toEqual([
            {nodeId: NEXUS, weight: 50n},
        ])
    })
})
