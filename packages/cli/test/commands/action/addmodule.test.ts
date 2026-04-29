import {describe, expect, test} from 'bun:test'
import {buildAction, preflightAgainstSnapshot} from '../../../src/commands/action/addmodule'
import type {EntitySnapshot} from '../../../src/lib/snapshot'

const ITEM_ENGINE_T1 = 10100 // ITEM_TYPE_MODULE — see game/contracts/server/include/server/items.hpp:81
const ITEM_ORE_T1 = 101 // ITEM_TYPE_RESOURCE — see game/contracts/server/include/server/items.hpp:16

function snap(
    cargo: Array<{id: bigint; item_id: number; stats?: bigint; quantity?: number}>
): EntitySnapshot {
    return {
        type: 'ship',
        id: 1n,
        owner: 'alice',
        entity_name: '',
        coordinates: {x: 0n, y: 0n},
        cargomass: 0n,
        is_idle: true,
        cargo: cargo.map((c) => ({
            item_id: c.item_id,
            quantity: c.quantity ?? 1,
            stats: c.stats ?? 0n,
            modules: [],
            id: c.id,
        })),
    }
}

describe('addmodule.buildAction', () => {
    test('defaults target to 0', async () => {
        const action = await buildAction({
            entityType: 'ship',
            entityId: 1n,
            moduleIndex: 0,
            moduleCargoId: 5n,
            targetCargoId: 0n,
        })
        expect(action.name.toString()).toBe('addmodule')
    })

    test('respects explicit target', async () => {
        const action = await buildAction({
            entityType: 'ship',
            entityId: 1n,
            moduleIndex: 0,
            moduleCargoId: 5n,
            targetCargoId: 42n,
        })
        expect(action.name.toString()).toBe('addmodule')
    })
})

describe('addmodule.preflightAgainstSnapshot', () => {
    test('passes when row id matches a module item in cargo', () => {
        expect(() =>
            preflightAgainstSnapshot(snap([{id: 99n, item_id: ITEM_ENGINE_T1}]), {
                entityType: 'ship',
                entityId: 1n,
                moduleIndex: 0,
                moduleCargoId: 99n,
                targetCargoId: 0n,
            })
        ).not.toThrow()
    })

    test('throws when row id is not in cargo', () => {
        expect(() =>
            preflightAgainstSnapshot(snap([]), {
                entityType: 'ship',
                entityId: 1n,
                moduleIndex: 0,
                moduleCargoId: 99n,
                targetCargoId: 0n,
            })
        ).toThrow(/cargo row 99/i)
    })

    test('throws when the cargo row is not a module', () => {
        expect(() =>
            preflightAgainstSnapshot(snap([{id: 12n, item_id: ITEM_ORE_T1}]), {
                entityType: 'ship',
                entityId: 1n,
                moduleIndex: 0,
                moduleCargoId: 12n,
                targetCargoId: 0n,
            })
        ).toThrow(/not a module/i)
    })

    test('throws when targetCargoId is non-zero and not in cargo', () => {
        expect(() =>
            preflightAgainstSnapshot(snap([{id: 99n, item_id: ITEM_ENGINE_T1}]), {
                entityType: 'ship',
                entityId: 1n,
                moduleIndex: 0,
                moduleCargoId: 99n,
                targetCargoId: 7n,
            })
        ).toThrow(/target cargo row 7/i)
    })
})
