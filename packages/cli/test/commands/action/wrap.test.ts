import {expect, test} from 'bun:test'
import {ActionsManager, PlatformContract, ServerContract, type Shipload} from '@shipload/sdk'
import {buildAction} from '../../../src/commands/action/wrap'
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
    const context: any = {server: stubServer, platform: stubPlatform}
    const manager = new ActionsManager(context)
    return {actions: manager} as unknown as Shipload
}

test('wrap builds a single wrapcargo action (mint is inline on-chain)', async () => {
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
    expect(actions.length).toBe(1)
    expect(actions[0].name.toString()).toBe('wrapcargo')
    expect(actions[0].account.toString()).toBe('nex.shipload')
})
