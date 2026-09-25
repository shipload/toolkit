import {describe, expect, it} from 'bun:test'
import {Name, type NameType, TimePoint, UInt16, UInt64} from '@wharfkit/antelope'
import {ITEM_LOADER_T1} from '../data/item-ids'
import {ENTITY_DEPOT, ENTITY_SHIP, ENTITY_WORKSHOP} from '../data/kind-registry'
import type {CandidateEntity, ShuttleReasonCode} from './shuttle'
import {
    BOOKING_LEVEL_CODES,
    OMITTED_REASONS,
    rankShuttleOptions,
    ShuttleManager,
    shuttleCandidates,
    shuttleReasonCode,
} from './shuttle'

function managerWithReadonly(impl: (name: string, data: unknown) => Promise<unknown>) {
    const ctx = {server: {readonly: impl}} as never
    return new ShuttleManager(ctx)
}

const t = (s: number) => TimePoint.fromMilliseconds(s * 1000)
const zero = TimePoint.fromMilliseconds(0)

function rawOption(over: Record<string, unknown> = {}) {
    return {
        shuttled_by: null,
        mode: 0,
        host_id: UInt64.from(5),
        lane_key: 0,
        duration: 60,
        start: t(1000),
        finish: t(1060),
        bays: 0,
        window_starts_at: null,
        window_completes_at: null,
        energy_cost: null,
        rejection: null,
        resolved: true,
        ...over,
    }
}

describe('ShuttleManager', () => {
    it('craft calls getcraftopts with the signed fields and maps the result', async () => {
        let called: {name: string; data: unknown} | null = null
        const m = managerWithReadonly(async (name, data) => {
            called = {name, data}
            return {
                options: [
                    rawOption(),
                    rawOption({
                        shuttled_by: UInt64.from(5),
                        mode: 1,
                        host_id: UInt64.from(5),
                        finish: t(1030),
                    }),
                ],
            }
        })
        const out = await m.craft({
            shipId: 5,
            workshopId: 9,
            recipeId: 1,
            quantity: 2,
            inputs: [],
            candidates: [],
            recharge: true,
        })
        expect(called!.name).toBe('getcraftopts')
        expect((called!.data as {recharge: boolean}).recharge).toBe(true)
        expect(out.options.map((o) => o.mode)).toEqual(['own', 'internal'])
        expect(out.auto?.mode).toBe('own')
        expect(out.blocked).toBeUndefined()
    })

    it('build, claim, cancelBuild, store and take call their own action with every field', async () => {
        const calls: {name: string; data: unknown}[] = []
        const m = managerWithReadonly(async (name, data) => {
            calls.push({name, data})
            return {options: [rawOption()]}
        })

        const buildInputs = [{item_id: 1}] as never
        const storeItems = [{item_id: 2}] as never
        const takeItems = [{item_id: 3}] as never

        await m.build({
            targetId: 1,
            dockId: 2,
            targetItemId: 3,
            inputs: buildInputs,
            candidates: [4],
        })
        await m.claim({jobId: 5, shipId: 6, candidates: [7]})
        await m.cancelBuild({jobId: 8, candidates: [9]})
        await m.store({shipId: 10, depotId: 11, items: storeItems, candidates: [12]})
        await m.take({shipId: 13, depotId: 14, items: takeItems, candidates: [15]})

        expect(calls.map((c) => c.name)).toEqual([
            'getbuildopts',
            'getclaimopts',
            'getcbldopts',
            'getstoreopts',
            'gettakeopts',
        ])
        expect(calls[0].data).toEqual({
            target_id: UInt64.from(1),
            dock_id: UInt64.from(2),
            target_item_id: UInt16.from(3),
            inputs: buildInputs,
            candidates: [UInt64.from(4)],
        })
        expect(calls[1].data).toEqual({
            job_id: UInt64.from(5),
            ship_id: UInt64.from(6),
            candidates: [UInt64.from(7)],
        })
        expect(calls[2].data).toEqual({
            job_id: UInt64.from(8),
            candidates: [UInt64.from(9)],
        })
        expect(calls[3].data).toEqual({
            ship_id: UInt64.from(10),
            depot_id: UInt64.from(11),
            items: storeItems,
            candidates: [UInt64.from(12)],
        })
        expect(calls[4].data).toEqual({
            ship_id: UInt64.from(13),
            depot_id: UInt64.from(14),
            items: takeItems,
            candidates: [UInt64.from(15)],
        })
    })

    it('a rejection maps to its code and values', async () => {
        const m = managerWithReadonly(async () => ({
            options: [
                rawOption({
                    rejection: {
                        reason: "the building's shuttle bays are fully booked",
                        at: t(2000),
                        until: null,
                        have: null,
                        need: null,
                        cap: null,
                        task_type: null,
                    },
                }),
            ],
        }))
        const out = await m.store({shipId: 5, depotId: 9, items: [], candidates: []})
        expect(out.options[0].blocked?.code).toBe('bays-booked')
        expect(out.options[0].blocked?.at?.getTime()).toBe(2000 * 1000)
    })

    it('a never-shuttle reason is omitted', async () => {
        const m = managerWithReadonly(async () => ({
            options: [
                rawOption(),
                rawOption({
                    shuttled_by: UInt64.from(7),
                    rejection: {
                        reason: 'that ship belongs to another player',
                        at: null,
                        until: null,
                        have: null,
                        need: null,
                        cap: null,
                        task_type: null,
                    },
                }),
            ],
        }))
        const out = await m.take({shipId: 5, depotId: 9, items: [], candidates: [7]})
        expect(out.options.length).toBe(1)
    })

    it('a booking-level reason on every option becomes blocked', async () => {
        const rej = {
            reason: 'player storage allowance at this depot is exceeded',
            at: null,
            until: null,
            have: 900,
            need: 200,
            cap: 1000,
            task_type: null,
        }
        const m = managerWithReadonly(async () => ({
            options: [
                rawOption({rejection: rej}),
                rawOption({shuttled_by: UInt64.from(5), mode: 1, rejection: rej}),
            ],
        }))
        const out = await m.store({shipId: 5, depotId: 9, items: [], candidates: []})
        expect(out.blocked?.code).toBe('depot-full')
        expect(out.blocked?.cap).toBe(1000)
        expect(out.auto).toBeUndefined()
    })

    it('unresolved booking-level rejections carry zero times and never win over a real option', async () => {
        const rej = {
            reason: 'workshop has a pending plan-capper; cannot accept new jobs',
            at: null,
            until: null,
            have: null,
            need: null,
            cap: null,
            task_type: 3,
        }
        const m = managerWithReadonly(async () => ({
            options: [
                rawOption({
                    start: zero,
                    finish: zero,
                    duration: 0,
                    rejection: rej,
                    resolved: false,
                }),
                rawOption({
                    shuttled_by: UInt64.from(5),
                    mode: 1,
                    start: zero,
                    finish: zero,
                    duration: 0,
                    rejection: rej,
                    resolved: false,
                }),
                rawOption({
                    shuttled_by: UInt64.from(7),
                    mode: 2,
                    host_id: UInt64.from(7),
                }),
            ],
        }))
        const out = await m.craft({
            shipId: 5,
            workshopId: 9,
            recipeId: 1,
            quantity: 1,
            inputs: [],
            candidates: [7],
        })
        expect(out.blocked).toBeUndefined()
        expect(out.auto?.mode).toBe('ship')
        expect(out.options[0].mode).toBe('ship')
        expect(out.options[0].blocked).toBeUndefined()
        const unresolved = out.options.filter((o) => !o.resolved)
        expect(unresolved.length).toBe(2)
        expect(unresolved.every((o) => o.blocked && !o.start && !o.finish)).toBe(true)
        expect(out.options[0].resolved).toBe(true)
        expect(out.options[0].finish?.getTime()).toBe(1060 * 1000)
    })

    it('ranking puts an option with no finish after every timed option', () => {
        const timed = {
            mode: 'ship',
            hostId: '9',
            finish: new Date(9000),
            blocked: undefined,
        } as never
        const untimed = {
            mode: 'internal',
            hostId: '1',
            finish: undefined,
            blocked: undefined,
        } as never
        expect(
            [untimed, timed].sort(rankShuttleOptions).map((o: {hostId: string}) => o.hostId)
        ).toEqual(['9', '1'])
    })

    it('an unmapped reason keeps the raw string', () => {
        expect(shuttleReasonCode('some new contract error')).toBe('unknown')
    })

    it('pins every mapped reason string to its code', () => {
        const table: [string, ShuttleReasonCode][] = [
            ['workshop has a pending plan-capper; cannot accept new jobs', 'workshop-capped'],
            ['ship needs an energy source to book a craft job', 'no-generator'],
            ['entity cannot recharge', 'no-generator'],
            ['workshop has no fabricator installed', 'not-equipped'],
            ['dock has no assembly arm installed', 'not-equipped'],
            ['too many bookings waiting on materials at this building', 'job-cap'],
            ['upgrade target is busy', 'target-busy'],
            ['Entity must be idle to modify modules.', 'target-busy'],
            ['target cargo would not fit the upgraded capacity', 'cargo-wont-fit'],
            ['player storage allowance at this depot is exceeded', 'depot-full'],
            ['player has no such item stored at this depot', 'not-stored'],
            ['player has fewer of that item stored at this depot', 'not-stored'],
            ['entity has no storage', 'no-storage'],
            ['target entity has no storage', 'no-storage'],
            ["the building's shuttle bays are fully booked", 'bays-booked'],
            ['player already has the most transfers this building takes', 'player-cap'],
            ['fabricator queue is full', 'queue-full'],
            ['Cannot unload cargo that is not loaded.', 'inputs-unavailable'],
            ['Insufficient inputs for recipe.', 'inputs-unavailable'],
            ['Cargo debit exceeds available quantity.', 'inputs-unavailable'],
            ['Craft requires more energy than entity has.', 'ship-energy'],
            [
                'identical Workshop delivery already scheduled at this time; finish that delivery or change the shipment',
                'dropoff-collision',
            ],
            ['cannot append: schedule is capped by a pending plan-capper', 'ship-capped'],
            ['lane queue is full', 'schedule-full'],
            ['ship departs before the shuttle completes', 'departs'],
            ['giver has insufficient giveable cargo', 'cargo-not-aboard'],
            ['Entity cargo capacity would be exceeded.', 'no-capacity'],
            ['No recipe found for plot target.', 'plot-recipe'],
            ['Item is not part of the plot target recipe.', 'plot-recipe'],
            ['Deposit would exceed plot recipe requirement.', 'plot-recipe'],
            ['craft job is not finished yet', 'not-ready'],
        ]
        for (const [reason, code] of table) {
            expect(shuttleReasonCode(reason)).toBe(code)
        }
    })

    it('lists every omitted reason and booking-level code from the spec', () => {
        expect([...OMITTED_REASONS]).toEqual([
            'that ship has no shuttle bay',
            'that ship belongs to another player',
            'that ship is not here',
            "only a Depot's public shuttle bays can take this",
            "choose the building's own shuttle instead",
            'counterpart has a pending plan-capper; cannot place a hold on it',
            'entity not found',
        ])
        expect([...BOOKING_LEVEL_CODES]).toEqual([
            'workshop-capped',
            'no-generator',
            'not-equipped',
            'job-cap',
            'target-busy',
            'cargo-wont-fit',
            'depot-full',
            'not-stored',
            'no-storage',
            'not-ready',
        ])
    })

    it('ranking: unblocked first, earliest finish, endpoints before third parties, lowest id', () => {
        const a = {mode: 'ship', hostId: '9', finish: new Date(3000), blocked: undefined} as never
        const b = {
            mode: 'internal',
            hostId: '1',
            finish: new Date(3000),
            blocked: undefined,
        } as never
        const c = {
            mode: 'own',
            hostId: '5',
            finish: new Date(2000),
            blocked: {code: 'departs'},
        } as never
        const d = {mode: 'bays', hostId: '2', finish: new Date(1000), blocked: undefined} as never
        expect(
            [a, b, c, d].sort(rankShuttleOptions).map((o: {hostId: string}) => o.hostId)
        ).toEqual(['2', '1', '9', '5'])
    })

    it('two strings under one booking-level code still fold into blocked', async () => {
        const rej = (reason: string) => ({
            reason,
            at: null,
            until: null,
            have: null,
            need: null,
            cap: null,
            task_type: null,
        })
        const m = managerWithReadonly(async () => ({
            options: [
                rawOption({rejection: rej('entity has no storage'), resolved: false}),
                rawOption({
                    shuttled_by: UInt64.from(9),
                    mode: 3,
                    host_id: UInt64.from(9),
                    rejection: rej('target entity has no storage'),
                }),
            ],
        }))
        const out = await m.take({shipId: 5, depotId: 9, items: [], candidates: []})
        expect(out.blocked?.code).toBe('no-storage')
        expect(out.auto).toBeUndefined()
    })

    it('a shared option-level reason never becomes blocked', async () => {
        const rej = {
            reason: 'ship departs before the shuttle completes',
            at: null,
            until: null,
            have: null,
            need: null,
            cap: null,
            task_type: null,
        }
        const m = managerWithReadonly(async () => ({
            options: [
                rawOption({
                    shuttled_by: UInt64.from(7),
                    mode: 2,
                    host_id: UInt64.from(7),
                    rejection: rej,
                }),
                rawOption({
                    shuttled_by: UInt64.from(9),
                    mode: 3,
                    host_id: UInt64.from(9),
                    rejection: rej,
                }),
            ],
        }))
        const out = await m.take({shipId: 5, depotId: 9, items: [], candidates: [7, 9]})
        expect(out.blocked).toBeUndefined()
        expect(out.options.length).toBe(2)
    })

    it('a query the chain rejects is a blocked result carrying the assertion text', async () => {
        const m = managerWithReadonly(async () => {
            throw new Error('assertion failure with message: craft job is not finished yet')
        })
        const out = await m.claim({jobId: 1, shipId: 5, candidates: []})
        expect(out.options).toEqual([])
        expect(out.auto).toBeUndefined()
        expect(out.blocked?.code).toBe('not-ready')
        expect(out.blocked?.reason).toBe('craft job is not finished yet')
    })

    it('a non-assertion throw from the readonly call is rethrown, not blocked', async () => {
        const m = managerWithReadonly(async () => {
            throw new Error('fetch failed')
        })
        await expect(m.claim({jobId: 1, shipId: 5, candidates: []})).rejects.toThrow('fetch failed')
    })

    it('a chain error surfaces the assertion text from details when message lacks it', async () => {
        const m = managerWithReadonly(async () => {
            const err = new Error('unknown error') as Error & {
                details?: {message?: string}[]
            }
            err.details = [
                {message: 'assertion failure with message: craft job is not finished yet'},
            ]
            throw err
        })
        const out = await m.claim({jobId: 1, shipId: 5, candidates: []})
        expect(out.blocked?.code).toBe('not-ready')
        expect(out.blocked?.reason).toBe('craft job is not finished yet')
    })

    it('resolved comes from the wire, not from the times', async () => {
        const m = managerWithReadonly(async () => ({
            options: [
                rawOption({start: zero, finish: zero, resolved: true}),
                rawOption({
                    shuttled_by: UInt64.from(7),
                    mode: 2,
                    host_id: UInt64.from(7),
                    resolved: false,
                }),
            ],
        }))
        const out = await m.store({shipId: 5, depotId: 9, items: [], candidates: []})
        const internal = out.options.find((o) => o.mode === 'internal')
        const third = out.options.find((o) => o.hostId === '7')
        expect(internal?.resolved).toBe(true)
        expect(third?.resolved).toBe(false)
    })
})

describe('shuttleCandidates', () => {
    const civicOwner = 'nex.shipload'
    const player = 'alice'
    const site = {x: 10, y: 20}
    const elsewhere = {x: 99, y: 99}

    function entity(over: {
        id: number
        owner?: NameType
        kind?: NameType
        item_id?: number
        coordinates?: {x: number; y: number}
        modules?: CandidateEntity['modules']
    }): CandidateEntity {
        return {
            id: UInt64.from(over.id),
            owner: Name.from(over.owner ?? player),
            kind: Name.from(over.kind ?? ENTITY_SHIP),
            item_id: UInt16.from(over.item_id ?? 1),
            coordinates: (over.coordinates ?? site) as never,
            modules: over.modules ?? [],
            lanes: [],
        }
    }

    const loaderModule = {installed: {item_id: ITEM_LOADER_T1, stats: 0}} as never
    const emptyModule = {installed: undefined} as never

    const building = entity({id: 1, owner: civicOwner, kind: ENTITY_WORKSHOP})

    it('includes a same-owner ship with a loader at the site', () => {
        const ship = entity({id: 2, modules: [loaderModule]})
        const out = shuttleCandidates({building, shipId: 999, player}, [ship], civicOwner)
        expect(out).toEqual(['2'])
    })

    it('excludes a same-owner ship with no loader module', () => {
        const ship = entity({id: 2, modules: [emptyModule]})
        const out = shuttleCandidates({building, shipId: 999, player}, [ship], civicOwner)
        expect(out).toEqual([])
    })

    it('excludes a ship at another site', () => {
        const ship = entity({id: 2, modules: [loaderModule], coordinates: elsewhere})
        const out = shuttleCandidates({building, shipId: 999, player}, [ship], civicOwner)
        expect(out).toEqual([])
    })

    it('excludes a ship owned by another player', () => {
        const ship = entity({id: 2, owner: 'mallory', modules: [loaderModule]})
        const out = shuttleCandidates({building, shipId: 999, player}, [ship], civicOwner)
        expect(out).toEqual([])
    })

    it('includes a Depot at the site regardless of owner', () => {
        const depot = entity({id: 3, owner: civicOwner, kind: ENTITY_DEPOT})
        const out = shuttleCandidates({building, shipId: 999, player}, [depot], civicOwner)
        expect(out).toEqual(['3'])
    })

    it('excludes a Workshop and any other non-Depot civic building', () => {
        const otherWorkshop = entity({id: 3, owner: civicOwner, kind: ENTITY_WORKSHOP})
        const out = shuttleCandidates({building, shipId: 999, player}, [otherWorkshop], civicOwner)
        expect(out).toEqual([])
    })

    it('excludes the building itself', () => {
        const out = shuttleCandidates({building, shipId: 999, player}, [building], civicOwner)
        expect(out).toEqual([])
    })

    it('excludes the booking ship', () => {
        const ship = entity({id: 2, modules: [loaderModule]})
        const out = shuttleCandidates({building, shipId: 2, player}, [ship], civicOwner)
        expect(out).toEqual([])
    })

    it('returns unique ids in deterministic order, Depots first then ships ascending, capped at 8', () => {
        const depotA = entity({id: 20, owner: civicOwner, kind: ENTITY_DEPOT})
        const depotB = entity({id: 5, owner: civicOwner, kind: ENTITY_DEPOT})
        const ships = Array.from({length: 9}, (_, i) =>
            entity({id: 100 + i, modules: [loaderModule]})
        )
        const out = shuttleCandidates(
            {building, shipId: 999, player},
            [depotA, depotB, ...ships, ships[0]],
            civicOwner
        )
        expect(out).toEqual(['5', '20', '100', '101', '102', '103', '104', '105'])
    })
})
