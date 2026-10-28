import {describe, expect, test} from 'bun:test'
import {encodeStats} from '../derivation/crafting'
import {
    canSetGoal,
    deriveGoal,
    deriveGoals,
    measureGoal,
    sequenceGoal,
    type GoalHoldings,
    type GoalMeasure,
} from './index'

type Row = [label: string, itemIds: number[], measure: GoalMeasure]

const row = (
    actions: number,
    gathers: number,
    bookings: number,
    pickups: number,
    placements: number,
    nouns: number,
    hunts: number
) => ({actions, gathers, bookings, pickups, placements, nouns, hunts})

const T1_SPECIALISTS = [10211, 10212, 10213, 10214, 10215, 10218]
const T2_ENTRIES = [11212, 11215, 11217, 11219, 11221, 11223]
const T2_STRAIGHT_OR_MUTATION = [
    11213, 11214, 11216, 11218, 11220, 11222, 11224, 11225, 11226, 11227, 11228, 11229,
]

const TABLE: Row[] = [
    ['Roustabout', [10210], row(12, 3, 4, 4, 1, 7, 3)],
    ['T1 specialist', T1_SPECIALISTS, row(8, 2, 3, 3, 0, 6, 2)],
    ['T2 tier entry', T2_ENTRIES, row(11, 3, 4, 4, 0, 8, 3)],
    ['T2 straight or mutation', T2_STRAIGHT_OR_MUTATION, row(8, 2, 3, 3, 0, 6, 2)],
    ['Engine T1', [10100], row(6, 1, 2, 2, 1, 3, 1)],
    ['Power Core T1', [10101], row(6, 1, 2, 2, 1, 3, 1)],
    ['Shuttle Bay T1', [10103], row(6, 1, 2, 2, 1, 3, 1)],
    ['Cargo Hold T1', [10105], row(6, 1, 2, 2, 1, 3, 1)],
    ['Battery Bank T1', [10108], row(6, 1, 2, 2, 1, 3, 1)],
    ['Limpet Bay T1', [10102], row(9, 2, 3, 3, 1, 5, 2)],
    ['Fabricator T1', [10104], row(9, 2, 3, 3, 1, 5, 2)],
    ['Assembly Arm T1', [10110], row(9, 2, 3, 3, 1, 5, 2)],
    ['Tractor Beam T1', [10106], row(9, 2, 3, 3, 1, 5, 2)],
    ['Engine T2', [11100], row(6, 1, 2, 2, 1, 3, 1)],
    ['Power Core T2', [11101], row(11, 2, 4, 4, 1, 3, 1)],
    ['Shuttle Bay T2', [11103], row(6, 1, 2, 2, 1, 3, 1)],
    ['Cargo Hold T2', [11105], row(6, 1, 2, 2, 1, 3, 1)],
    ['Battery Bank T2', [11108], row(6, 1, 2, 2, 1, 3, 1)],
    ['Limpet Bay T2', [11102], row(9, 2, 3, 3, 1, 5, 2)],
    ['Fabricator T2', [11104], row(9, 2, 3, 3, 1, 5, 2)],
    ['Assembly Arm T2', [11110], row(9, 2, 3, 3, 1, 5, 2)],
    ['Tractor Beam T2', [11106], row(9, 2, 3, 3, 1, 5, 2)],
    ['Container T1', [10200], row(9, 2, 3, 3, 1, 5, 2)],
    ['Container T2', [11200], row(8, 2, 3, 3, 0, 5, 2)],
    ['Station Hub', [11207], row(9, 2, 3, 3, 1, 5, 2)],
    ['Warehouse', [11202], row(8, 2, 3, 2, 1, 5, 2)],
    ['Mining Rig', [11203], row(8, 2, 3, 2, 1, 5, 2)],
    ['Factory', [11204], row(8, 2, 3, 2, 1, 5, 2)],
    ['Assembly Yard', [11209], row(8, 2, 3, 2, 1, 5, 2)],
]

describe('measureGoal', () => {
    for (const [label, itemIds, expected] of TABLE) {
        test(label, () => {
            for (const itemId of itemIds)
                expect({itemId, ...measureGoal(itemId)}).toEqual({itemId, ...expected})
        })
    }
})

const STARTER: GoalHoldings = {
    stock: [],
    entities: [{id: 'a', itemId: 10210, installed: [10101, 10100, 10102]}],
}

describe('deriveGoal', () => {
    test('an item without a live recipe cannot be set', () => {
        expect(canSetGoal(10107)).toBe(false)
        const plan = deriveGoal({itemId: 10107, quantity: 1}, STARTER)
        expect(plan.available).toBe(false)
        expect(plan.steps).toEqual([])
    })

    test('held parts are credited with their location and drop the gathers under them', () => {
        const plan = deriveGoal(
            {itemId: 10100, quantity: 1},
            {
                stock: [
                    {itemId: 10009, quantity: 400, place: 'depot', location: {x: 3, y: 4}},
                    {itemId: 10009, quantity: 200, place: 'hold', entityId: 'a'},
                ],
                entities: STARTER.entities,
            }
        )
        const part = plan.nodes.find((n) => n.itemId === 10009)!
        expect(part.shortfall).toBe(0)
        expect(part.credited).toEqual([
            {place: 'hold', quantity: 200, entityId: 'a', location: undefined},
            {place: 'depot', quantity: 400, entityId: undefined, location: {x: 3, y: 4}},
        ])
        expect(plan.steps.map((s) => s.id)).toEqual(['book:10100', 'pickup:10100'])
        expect(plan.ready.map((s) => s.id)).toEqual(['book:10100'])
    })

    test('a module goal with no ship finishes in hand and has no install step', () => {
        const done = deriveGoal(
            {itemId: 10100, quantity: 1},
            {stock: [{itemId: 10100, quantity: 1, place: 'hold'}], entities: []}
        )
        expect(done.finished).toBe(true)
        expect(done.steps).toEqual([])
    })

    test('a packed hull in a hold finishes a ship goal', () => {
        const plan = deriveGoal(
            {itemId: 10210, quantity: 1},
            {stock: [{itemId: 10210, quantity: 1, place: 'hold', entityId: 'x'}], entities: []}
        )
        expect(plan.finished).toBe(true)
        expect(plan.steps).toEqual([])
    })

    test('finished output at a Workshop and running jobs are credited behind a pick-up', () => {
        const plan = deriveGoal(
            {itemId: 10100, quantity: 1},
            {
                stock: [
                    {itemId: 10009, quantity: 300, place: 'workshop'},
                    {itemId: 10009, quantity: 300, place: 'job'},
                ],
                entities: [],
            }
        )
        const collect = plan.steps.filter((s) => s.kind === 'pickup' && s.itemId === 10009)
        expect(collect.map((s) => [s.id, s.quantity, s.waiting])).toEqual([
            ['collect-workshop:10009', 300, false],
            ['collect-job:10009', 300, true],
        ])
        const book = plan.steps.find((s) => s.id === 'book:10100')!
        expect(book.dependsOn).toEqual(['collect-workshop:10009', 'collect-job:10009'])
        expect(plan.ready.map((s) => s.id)).toEqual(['collect-workshop:10009'])
    })

    test('a higher goal claims stock before a lower one', () => {
        const holdings: GoalHoldings = {
            stock: [{itemId: 10009, quantity: 600, place: 'hold'}],
            entities: [],
        }
        const [first, second] = deriveGoals(
            [
                {itemId: 10100, quantity: 1},
                {itemId: 10100, quantity: 1},
            ],
            holdings
        )
        expect(first.nodes.find((n) => n.itemId === 10009)!.shortfall).toBe(0)
        expect(second.nodes.find((n) => n.itemId === 10009)!.shortfall).toBe(600)
    })

    test('stock below a stat target shows as held but is not credited', () => {
        const low = encodeStats([0, 0, 100])
        const high = encodeStats([0, 0, 900])
        const plan = deriveGoal(
            {itemId: 10100, quantity: 1, statTargets: {gas: 500}},
            {
                stock: [
                    {itemId: 301, quantity: 4000, place: 'hold', stats: low},
                    {itemId: 301, quantity: 1000, place: 'hold', stats: high},
                ],
                entities: [],
            }
        )
        const gas = plan.nodes.find((n) => n.itemId === 301)!
        expect(gas.belowTarget).toBe(4000)
        expect(gas.shortfall).toBe(5000)
        expect(plan.hunts).toEqual([
            {
                category: 'gas',
                target: 500,
                stats: [expect.objectContaining({resourceItemId: 301, statIndex: 2})],
            },
        ])
    })

    test('an installed Power Core feeds a craft only when another ship carries a generator', () => {
        const goal = {itemId: 11101, quantity: 1}
        const alone = deriveGoal(goal, STARTER)
        expect(alone.steps.some((s) => s.id === 'book:10101')).toBe(true)
        const paired = deriveGoal(goal, {
            stock: [],
            entities: [...STARTER.entities, {id: 'b', itemId: 10210, installed: [10101]}],
        })
        expect(paired.steps.some((s) => s.id === 'book:10101')).toBe(false)
        expect(paired.nodes.find((n) => n.itemId === 10101)!.credited[0].place).toBe('installed')
    })

    test('a named ship climbs the ladder from its own hull', () => {
        const plan = deriveGoal({itemId: 11213, quantity: 1, ship: 'a'}, STARTER)
        const hulls = plan.steps.filter((s) => s.kind === 'book').map((s) => s.itemId)
        expect(hulls).toEqual(expect.arrayContaining([10211, 11212, 11213]))
        expect(plan.nodes.find((n) => n.itemId === 10210)!.credited).toEqual([
            {place: 'entity', quantity: 1, entityId: 'a', location: undefined},
        ])
    })

    test('a named ship that already is the target finishes the goal', () => {
        const plan = deriveGoal(
            {itemId: 10211, quantity: 1, ship: 'p'},
            {stock: [], entities: [{id: 'p', itemId: 10211, installed: []}]}
        )
        expect(plan.finished).toBe(true)
        expect(plan.steps).toEqual([])
    })

    test('a plot structure claims the plot and takes its parts into it', () => {
        const plan = deriveGoal({itemId: 11202, quantity: 1}, {stock: [], entities: []})
        const partPickups = plan.steps.filter((s) => s.kind === 'pickup')
        expect(partPickups.every((s) => s.receiver === 'plot')).toBe(true)
        expect(partPickups.every((s) => s.dependsOn.includes('claim-plot:11202'))).toBe(true)
        expect(plan.steps.find((s) => s.id === 'book:11202')!.dependsOn).toContain(
            'claim-plot:11202'
        )
        expect(plan.steps.some((s) => s.id === 'pickup:11202')).toBe(false)
    })

    test('ready steps put bookings before pick-ups and gathers in hunt order', () => {
        const plan = deriveGoal(
            {itemId: 10102, quantity: 1},
            {stock: [{itemId: 10009, quantity: 300, place: 'workshop'}], entities: []}
        )
        expect(plan.ready.map((s) => s.id)).toEqual(['collect-workshop:10009', 'gather:101'])
        expect(plan.hunts.map((h) => h.category)).toEqual(['ore'])
    })
})

describe('sequenceGoal', () => {
    test('walks the ready set one step at a time, each booking before the next gather', () => {
        const plan = deriveGoal(
            {itemId: 10102, quantity: 1, ship: 'new'},
            {stock: [], entities: []}
        )
        expect(sequenceGoal(plan).map((s) => s.id)).toEqual([
            'gather:101',
            'book:10005',
            'pickup:10005',
            'gather:301',
            'book:10009',
            'pickup:10009',
            'book:10102',
            'pickup:10102',
            'install:10102',
        ])
    })

    test('a running job is walked as a pick-up the sequence waits on', () => {
        const plan = deriveGoal(
            {itemId: 10101, quantity: 1},
            {stock: [{itemId: 10004, quantity: 600, place: 'job'}], entities: []}
        )
        expect(sequenceGoal(plan).map((s) => s.id)).toEqual([
            'collect-job:10004',
            'book:10101',
            'pickup:10101',
        ])
    })
})
