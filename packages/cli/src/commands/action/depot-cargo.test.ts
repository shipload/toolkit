import {describe, expect, test} from 'bun:test'
import {resolveCargoInputs} from '../../lib/cargo-resolve'
import {buildAction, lockerAsCargo} from './depot-cargo'

function stub(captured: Record<string, unknown[]>) {
    return {
        actions: {
            depotstore: (...args: unknown[]) => {
                captured.depotstore = args
                return {} as never
            },
            depottake: (...args: unknown[]) => {
                captured.depottake = args
                return {} as never
            },
        },
    } as never
}

const INPUT = {itemId: 101, stackId: 413333752n, quantity: 10, modules: []}

describe('depot cargo buildAction', () => {
    test('store passes ship, depot, items, and shuttled_by to depotstore', async () => {
        const captured: Record<string, unknown[]> = {}
        await buildAction(
            'store',
            {shipId: 6n, depotId: 3n, inputs: [INPUT], shuttledBy: 9n},
            stub(captured)
        )
        const [ship, depot, items, shuttledBy] = captured.depotstore
        expect(ship).toBe(6n)
        expect(depot).toBe(3n)
        expect(shuttledBy).toBe(9n)
        const [item] = items as {item_id: unknown; quantity: unknown; stats: unknown}[]
        expect(Number(item.item_id)).toBe(101)
        expect(Number(item.quantity)).toBe(10)
        expect(String(item.stats)).toBe('413333752')
    })

    test('take routes to depottake and omits shuttled_by when unset', async () => {
        const captured: Record<string, unknown[]> = {}
        await buildAction('take', {shipId: 6n, depotId: 3n, inputs: [INPUT]}, stub(captured))
        expect(captured.depotstore).toBeUndefined()
        expect(captured.depottake[3]).toBeUndefined()
    })

    test('stored rows resolve like cargo, keeping the individuated id', () => {
        const rows = [
            {item_id: 101, quantity: 25, stats: 413333752n, modules: [], sequence_id: undefined},
            {item_id: 10201, quantity: 1, stats: 7n, modules: [], sequence_id: 44n},
        ] as never
        const [ore, packed] = resolveCargoInputs(
            [
                {itemId: 101, stackId: 413333752n, quantity: 10},
                {itemId: 10201, stackId: 7n, quantity: 1},
            ],
            lockerAsCargo(rows)
        )
        expect(ore.quantity).toBe(10)
        expect(packed.entityId).toBe(44n)
    })
})
