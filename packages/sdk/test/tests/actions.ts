import {describe, test, beforeEach} from 'bun:test'
import {assert} from 'chai'
import {makeClient} from '@wharfkit/mock-data'
import Shipload, {ActionsManager, PlatformContract, ServerContract} from '$lib'
import {Chains} from '@wharfkit/common'
import {Int64, UInt64} from '@wharfkit/antelope'

const client = makeClient('https://jungle4.greymass.com')

describe('ActionsManager', () => {
    let shipload: Shipload

    beforeEach(() => {
        shipload = new Shipload(Chains.Jungle4, {client})
    })

    describe('travel', () => {
        test('creates travel action with number coordinates', () => {
            const action = shipload.actions.travel(1, {x: 5, y: 10})
            assert.equal(action.name.toString(), 'travel')
            assert.isDefined(action.data)
        })

        test('creates travel action with Int64 coordinates', () => {
            const action = shipload.actions.travel(1, {x: Int64.from(5), y: Int64.from(10)})
            assert.equal(action.name.toString(), 'travel')
            assert.isDefined(action.data)
        })

        test('creates travel action with recharge false', () => {
            const action = shipload.actions.travel(1, {x: 5, y: 10}, false)
            assert.equal(action.name.toString(), 'travel')
        })
    })

    describe('resolve', () => {
        test('creates resolve action', () => {
            const action = shipload.actions.resolve(1)
            assert.equal(action.name.toString(), 'resolve')
            assert.isDefined(action.data)
        })

        test('creates resolve action with UInt64', () => {
            const action = shipload.actions.resolve(UInt64.from(123))
            assert.equal(action.name.toString(), 'resolve')
        })
    })

    describe('join', () => {
        test('creates join action', () => {
            const action = shipload.actions.join('newplayer')
            assert.equal(action.name.toString(), 'join')
            assert.isDefined(action.data)
        })
    })

    describe('warp', () => {
        test('creates warp action with number coordinates', () => {
            const action = shipload.actions.warp(1, {x: 5, y: 10})
            assert.equal(action.name.toString(), 'warp')
            assert.isDefined(action.data)
        })

        test('creates warp action with Int64 coordinates', () => {
            const action = shipload.actions.warp(1, {x: Int64.from(5), y: Int64.from(10)})
            assert.equal(action.name.toString(), 'warp')
            assert.isDefined(action.data)
        })
    })

    describe('wrap', () => {
        function makeStubManager() {
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
            const context = {server: stubServer, platform: stubPlatform} as any
            return new ActionsManager(context)
        }

        test('returns a single wrapcargo action (mint is inline on-chain)', async () => {
            const actions = await makeStubManager().wrap('alice', 42, 7, 99, 5)
            assert.equal(actions.length, 1)
            assert.equal(actions[0].name.toString(), 'wrapcargo')
            assert.equal(actions[0].account.toString(), 'nex.shipload')
            assert.isDefined(actions[0].data)
        })
    })

    describe('wrapEntity', () => {
        function makeStubManager() {
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
            const context = {server: stubServer, platform: stubPlatform} as any
            return new ActionsManager(context)
        }

        test('returns a single wrapentity action (mint is inline on-chain)', async () => {
            const actions = await makeStubManager().wrapEntity('alice', 50, 7)
            assert.equal(actions.length, 1)
            assert.equal(actions[0].name.toString(), 'wrapentity')
            assert.equal(actions[0].account.toString(), 'nex.shipload')
            assert.isDefined(actions[0].data)
        })
    })

    describe('transfer', () => {
        test('creates transfer action with single item', () => {
            const action = shipload.actions.transfer(1, 2, [
                {item_id: 101, stats: 0n, modules: [], quantity: 10},
            ])
            assert.equal(action.name.toString(), 'transfer')
            assert.isDefined(action.data)
        })

        test('creates transfer action with multiple items', () => {
            const action = shipload.actions.transfer(1, 2, [
                {item_id: 101, stats: 0n, modules: [], quantity: 10},
                {item_id: 201, stats: 1n, modules: [], quantity: 5},
            ])
            assert.equal(action.name.toString(), 'transfer')
            assert.isDefined(action.data)
        })
    })

    describe('deploy', () => {
        test('creates deploy action with cargo_ref', () => {
            const action = shipload.actions.deploy(42, {
                item_id: 1001,
                stats: 12345n,
                modules: [],
            })
            assert.equal(action.name.toString(), 'deploy')
            assert.isDefined(action.data)
        })
    })

    describe('addmodule', () => {
        test('creates addmodule action without target', () => {
            const action = shipload.actions.addmodule(42, 0, {
                item_id: 2001,
                stats: 0n,
                modules: [],
            })
            assert.equal(action.name.toString(), 'addmodule')
            assert.isDefined(action.data)
        })

        test('creates addmodule action with target_ref', () => {
            const action = shipload.actions.addmodule(
                42,
                0,
                {item_id: 2001, stats: 0n, modules: []},
                {item_id: 1001, stats: 12345n, modules: []}
            )
            assert.equal(action.name.toString(), 'addmodule')
            assert.isDefined(action.data)
        })
    })

    describe('rmmodule', () => {
        test('creates rmmodule action without target', () => {
            const action = shipload.actions.rmmodule(42, 0)
            assert.equal(action.name.toString(), 'rmmodule')
            assert.isDefined(action.data)
        })

        test('creates rmmodule action with target_ref', () => {
            const action = shipload.actions.rmmodule(42, 0, {
                item_id: 1001,
                stats: 12345n,
                modules: [],
            })
            assert.equal(action.name.toString(), 'rmmodule')
            assert.isDefined(action.data)
        })
    })

    describe('cleanrsvp', () => {
        test('creates cleanrsvp action', () => {
            const action = shipload.actions.cleanrsvp(5, 100)
            assert.equal(action.name.toString(), 'cleanrsvp')
            assert.isDefined(action.data)
        })

        test('creates cleanrsvp action with UInt64 args', () => {
            const action = shipload.actions.cleanrsvp(UInt64.from(5), UInt64.from(100))
            assert.equal(action.name.toString(), 'cleanrsvp')
        })
    })
})
