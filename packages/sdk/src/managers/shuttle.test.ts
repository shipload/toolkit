import {describe, expect, it} from 'bun:test'
import {TimePoint, UInt16, UInt64} from '@wharfkit/antelope'
import type {ShuttleReasonCode} from './shuttle'
import {
    BOOKING_LEVEL_CODES,
    OMITTED_REASONS,
    rankShuttleOptions,
    ShuttleManager,
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
                rawOption({start: zero, finish: zero, duration: 0, rejection: rej}),
                rawOption({
                    shuttled_by: UInt64.from(5),
                    mode: 1,
                    start: zero,
                    finish: zero,
                    duration: 0,
                    rejection: rej,
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
        expect(out.options.filter((o) => o.finish.getTime() === 0).every((o) => o.blocked)).toBe(
            true
        )
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
            ['lane queue is full', 'unknown'],
            ['ship departs before the shuttle completes', 'departs'],
            ['giver has insufficient giveable cargo', 'cargo-not-aboard'],
            ['Entity cargo capacity would be exceeded.', 'no-capacity'],
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
})
