import {expect, test} from 'bun:test'
import {Int32, Name, UInt16} from '@wharfkit/antelope'
import {ActionsManager, ServerContract, ServerTypes, type Shipload} from '@shipload/sdk'
import {buildAction} from '../../../src/commands/action/wrap'
import {client} from '../../../src/lib/client'

function makeStubShipload(): Shipload {
    const cargoRow = ServerTypes.cargo_row.from({
        id: 42,
        entity_id: 1,
        item_id: 101,
        quantity: 20,
        stats: '12345',
        modules: [],
    })
    const entityRow = ServerTypes.entity_row.from({
        id: 1,
        owner: 'alice',
        kind: 'ship',
        name: 'Test',
        stats: 0,
        coordinates: {x: 0, y: 0},
        cargomass: 0,
        modules: [],
        item_id: 1001,
    })
    const nftConfigRow = ServerTypes.nftconfig_row.from({
        item_id: UInt16.from(101),
        template_id: Int32.from(1),
        schema_name: Name.from('v1.ore'),
    })
    const realServer = new ServerContract.Contract({client})
    const stubServer = {
        action: realServer.action.bind(realServer),
        table(name: string) {
            return {
                async get() {
                    if (name === 'cargo') return cargoRow
                    if (name === 'entity') return entityRow
                    if (name === 'nftconfig') return nftConfigRow
                    return undefined
                },
            }
        },
    }
    const context: any = {server: stubServer}
    context.nft = {
        async getNftConfigForItem() {
            return {templateId: 1, schemaName: 'v1.ore'}
        },
    }
    const manager = new ActionsManager(context)
    return {actions: manager} as unknown as Shipload
}

test('wrap builds wrap + mintasset action pair', async () => {
    const actions = await buildAction(
        {
            owner: 'alice',
            entityId: 1n,
            nexusId: 3n,
            cargoId: 42n,
            quantity: 5n,
        },
        makeStubShipload()
    )
    expect(actions.length).toBe(2)
    expect(actions[0].name.toString()).toBe('wrap')
    expect(actions[0].account.toString()).toBe('eon.shipload')
    expect(actions[1].name.toString()).toBe('mintasset')
    expect(actions[1].account.toString()).toBe('atomicassets')
})
