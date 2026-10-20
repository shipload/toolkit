import {expect, test} from 'bun:test'
import {
    ATOMICASSETS_ACCOUNT,
    ActionsManager,
    PlatformContract,
    SHIPLOAD_COLLECTION,
    ServerContract,
    ServerTypes,
    type Shipload,
} from '@shipload/sdk'
import {Name} from '@wharfkit/antelope'
import {buildAction, selectStack} from '../../../src/commands/action/wrap'
import {client} from '../../../src/lib/client'

function makeStubShipload(): Shipload {
    const realServer = new ServerContract.Contract({client})
    const realPlatform = new PlatformContract.Contract({client})
    const stubServer = {
        account: realServer.account,
        action: realServer.action.bind(realServer),
    }
    const stubPlatform = {
        account: realPlatform.account,
        action: realPlatform.action.bind(realPlatform),
    }
    const context: any = {
        server: stubServer,
        platform: stubPlatform,
        atomicAssetsAccount: Name.from(ATOMICASSETS_ACCOUNT),
        collection: SHIPLOAD_COLLECTION,
    }
    const manager = new ActionsManager(context)
    return {actions: manager} as unknown as Shipload
}

test('wrap builds wrapcargo plus the RAM claim (mint is inline on-chain)', async () => {
    const actions = await buildAction(
        {
            owner: 'alice',
            entityId: 1n,
            nexusId: 3n,
            stack: ServerTypes.cargo_item.from({
                item_id: 301,
                stats: 214202522n,
                modules: [],
                quantity: 5n,
            }),
        },
        makeStubShipload()
    )
    expect(actions.length).toBe(2)
    expect(actions[0].name.toString()).toBe('wrapcargo')
    expect(actions[0].account.toString()).toBe('nex.shipload')
    expect(actions[1].name.toString()).toBe('setlastpayer')
    expect(actions[1].account.toString()).toBe(ATOMICASSETS_ACCOUNT)
})

const cargo = [
    {item_id: 301n, quantity: 10n, stats: 7n, modules: []},
    {item_id: 302n, quantity: 4n, stats: 9n, modules: [], entity_id: 11n},
    {item_id: 302n, quantity: 2n, stats: 9n, modules: [], entity_id: 12n},
]

test('selectStack returns the matching stack with the requested quantity', () => {
    const stack = selectStack(cargo, {itemId: 301, stackId: 7n}, 3n)
    expect(Number(stack.item_id)).toBe(301)
    expect(Number(stack.quantity)).toBe(3)
})

test('selectStack fails when nothing matches', () => {
    expect(() => selectStack(cargo, {itemId: 999, stackId: 1n}, 1n)).toThrow(/No cargo matches/)
})

test('selectStack lists candidates when several stacks match', () => {
    expect(() => selectStack(cargo, {itemId: 302, stackId: 9n}, 1n)).toThrow(
        /More than one cargo stack[\s\S]*sequence id 11[\s\S]*sequence id 12/
    )
})

test('selectStack picks one candidate by sequence id', () => {
    const stack = selectStack(cargo, {itemId: 302, stackId: 9n}, 1n, 12n)
    expect(Number(stack.entity_id)).toBe(12)
})

test('selectStack rejects a quantity above the stack', () => {
    expect(() => selectStack(cargo, {itemId: 301, stackId: 7n}, 11n)).toThrow(/requested 11/)
})
