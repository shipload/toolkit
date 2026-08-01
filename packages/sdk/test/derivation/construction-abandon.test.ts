import {describe, expect, test} from 'bun:test'
import {Name, TimePoint, UInt8, UInt16, UInt32, UInt64} from '@wharfkit/antelope'
import {ConstructionManager} from '../../src/managers/construction'
import {ServerContract} from '../../src/contracts'
import {ITEM_WAREHOUSE_T1_PACKED} from '../../src/data/item-ids'
import {HoldKind, TaskType} from '../../src/types'
import {makeTask} from '../helpers'

describe('ConstructionManager.canAbandon', () => {
    const OWNER = Name.from('alice.gm')

    function makePlot(
        overrides: Partial<{
            kind: string
            holds: ServerContract.Types.hold[]
            lanes: ServerContract.Types.lane[]
            cargomass: number
        }> = {}
    ) {
        return ServerContract.Types.entity_row.from({
            id: UInt64.from(1),
            kind: Name.from(overrides.kind ?? 'plot'),
            item_id: UInt16.from(ITEM_WAREHOUSE_T1_PACKED),
            owner: OWNER,
            name: '',
            stats: UInt64.from(0),
            cargomass: UInt32.from(overrides.cargomass ?? 0),
            coordinates: ServerContract.Types.coordinates.from({x: 0, y: 0}),
            modules: [],
            lanes: overrides.lanes ?? [],
            holds: overrides.holds ?? [],
        })
    }

    function makeCargoRow(entityId: number, rowId: number) {
        return ServerContract.Types.cargo_row.from({
            id: UInt64.from(rowId),
            entity_id: UInt64.from(entityId),
            item_id: UInt64.from(1),
            quantity: UInt64.from(1),
            stats: UInt64.from(0),
            modules: [],
        })
    }

    test('returns true for an empty unscheduled plot', () => {
        const mgr = new ConstructionManager({} as any)
        expect(mgr.canAbandon(makePlot(), [])).toBe(true)
    })

    test('returns false for non-plot kind', () => {
        const mgr = new ConstructionManager({} as any)
        const ship = makePlot({kind: 'ship'})
        expect(mgr.canAbandon(ship, [])).toBe(false)
    })

    test('returns false with a hold present', () => {
        const mgr = new ConstructionManager({} as any)
        const plot = makePlot({
            holds: [
                ServerContract.Types.hold.from({
                    id: UInt64.from(1),
                    kind: UInt8.from(HoldKind.BUILD),
                    counterpart: ServerContract.Types.entity_ref.from({
                        entity_type: 'ship',
                        entity_id: UInt64.from(2),
                    }),
                    until: TimePoint.from('2026-06-02T10:00:00.000'),
                    incoming_mass: UInt32.from(0),
                }),
            ],
        })
        expect(mgr.canAbandon(plot, [])).toBe(false)
    })

    test('returns false with a lane task', () => {
        const mgr = new ConstructionManager({} as any)
        const plot = makePlot({
            lanes: [
                ServerContract.Types.lane.from({
                    lane_key: UInt8.from(0),
                    schedule: ServerContract.Types.schedule.from({
                        started: TimePoint.from('2026-06-02T10:00:00.000'),
                        tasks: [makeTask(TaskType.BUILDPLOT, {duration: 60})],
                    }),
                }),
            ],
        })
        expect(mgr.canAbandon(plot, [])).toBe(false)
    })

    test('returns false with nonzero cargomass', () => {
        const mgr = new ConstructionManager({} as any)
        const plot = makePlot({cargomass: 100})
        expect(mgr.canAbandon(plot, [])).toBe(false)
    })

    test('returns false when a cargo row exists for the entity', () => {
        const mgr = new ConstructionManager({} as any)
        const plot = makePlot()
        const cargo = makeCargoRow(1, 100)
        expect(mgr.canAbandon(plot, [cargo])).toBe(false)
    })
})
