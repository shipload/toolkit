import {describe, expect, test} from 'bun:test'
import {buildAction, preflightAgainstSnapshot} from '../../../src/commands/action/addmodule'
import type {EntitySnapshot} from '../../../src/lib/snapshot'
import {getLocalShipload} from '../../helpers/shipload'

const ITEM_ENGINE_T1 = 10100 // ITEM_TYPE_MODULE — see contracts/src/server/include/server/items.hpp:81
const ITEM_ORE_T1 = 101 // ITEM_TYPE_RESOURCE — see contracts/src/server/include/server/items.hpp:16

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
    test('host-mode: target_ref defaults to null', async () => {
        const action = await buildAction(
            {
                entityType: 'ship',
                entityId: 1n,
                moduleIndex: 0,
                moduleItemId: BigInt(ITEM_ENGINE_T1),
                moduleStats: 0n,
            },
            getLocalShipload()
        )
        expect(action.name.toString()).toBe('addmodule')
    })

    test('packed-mode: target_ref present when target-* set', async () => {
        const action = await buildAction(
            {
                entityType: 'ship',
                entityId: 1n,
                moduleIndex: 0,
                moduleItemId: BigInt(ITEM_ENGINE_T1),
                moduleStats: 0n,
                targetItemId: 27n,
                targetStats: 888888888n,
                targetModules: [],
            },
            getLocalShipload()
        )
        expect(action.name.toString()).toBe('addmodule')
    })
})

describe('addmodule.preflightAgainstSnapshot', () => {
    test('passes when (item-id, stats) matches a module item in cargo', () => {
        expect(() =>
            preflightAgainstSnapshot(snap([{id: 99n, item_id: ITEM_ENGINE_T1}]), {
                entityType: 'ship',
                entityId: 1n,
                moduleIndex: 0,
                moduleItemId: BigInt(ITEM_ENGINE_T1),
                moduleStats: 0n,
            })
        ).not.toThrow()
    })

    test('throws when module item id is not in cargo', () => {
        expect(() =>
            preflightAgainstSnapshot(snap([]), {
                entityType: 'ship',
                entityId: 1n,
                moduleIndex: 0,
                moduleItemId: BigInt(ITEM_ENGINE_T1),
                moduleStats: 0n,
            })
        ).toThrow(/no cargo with item/i)
    })

    test('throws when matched cargo is not a module', () => {
        expect(() =>
            preflightAgainstSnapshot(snap([{id: 12n, item_id: ITEM_ORE_T1}]), {
                entityType: 'ship',
                entityId: 1n,
                moduleIndex: 0,
                moduleItemId: BigInt(ITEM_ORE_T1),
                moduleStats: 0n,
            })
        ).toThrow(/not a module/i)
    })

    test('throws when target (item-id, stats) is not in cargo', () => {
        expect(() =>
            preflightAgainstSnapshot(snap([{id: 99n, item_id: ITEM_ENGINE_T1}]), {
                entityType: 'ship',
                entityId: 1n,
                moduleIndex: 0,
                moduleItemId: BigInt(ITEM_ENGINE_T1),
                moduleStats: 0n,
                targetItemId: 27n,
                targetStats: 888888888n,
            })
        ).toThrow(/no target cargo with item 27/i)
    })
})
