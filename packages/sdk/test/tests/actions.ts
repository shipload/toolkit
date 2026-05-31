import {describe, test, beforeEach} from 'bun:test'
import {assert} from 'chai'
import {makeClient} from '@wharfkit/mock-data'
import Shipload, {ActionsManager, PlatformContract, ServerContract, ServerTypes} from '$lib'
import {Chains} from '@wharfkit/common'
import {Int32, Int64, Name, UInt16, UInt64} from '@wharfkit/antelope'

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
        const cargoRow = ServerTypes.cargo_row.from({
            id: 99,
            entity_id: 42,
            item_id: 101,
            quantity: 20,
            stats: '12345',
            modules: [],
        })
        const entityRow = ServerTypes.entity_row.from({
            id: 42,
            owner: 'alice',
            kind: 'ship',
            name: 'Test Ship',
            stats: 0,
            coordinates: {x: 5, y: 10},
            cargomass: 0,
            modules: [],
            item_id: 1001,
        })
        const nftConfigRow = ServerTypes.nftconfig_row.from({
            item_id: UInt16.from(101),
            template_id: Int32.from(42),
            schema_name: Name.from('v1.ore'),
        })

        function makeStubManager() {
            const realServer = new ServerContract.Contract({client})
            const realPlatform = new PlatformContract.Contract({client})
            const stubServer = {
                account: realServer.account,
                action: realServer.action.bind(realServer),
                table(name: string) {
                    return {
                        async get(key: unknown) {
                            if (name === 'cargo') return cargoRow
                            if (name === 'entity') return entityRow
                            if (name === 'nftconfig') {
                                const id = UInt16.from(key as any).toString()
                                return id === '101' ? nftConfigRow : undefined
                            }
                            return undefined
                        },
                    }
                },
            }
            const stubPlatform = {
                account: realPlatform.account,
                action: realPlatform.action.bind(realPlatform),
            }
            const context = {server: stubServer, platform: stubPlatform} as any
            const manager = new ActionsManager(context)
            const nftLookup = {
                async getNftConfigForItem(itemId: any) {
                    if (Number(UInt16.from(itemId).toString()) === 101) {
                        return {templateId: 42, schemaName: 'v1.ore'}
                    }
                    return undefined
                },
            }
            context.nft = nftLookup
            return manager
        }

        test('returns wrap + mintasset action pair', async () => {
            const actions = await makeStubManager().wrap('alice', 42, 7, 99, 5)
            assert.equal(actions.length, 2)
            assert.equal(actions[0].name.toString(), 'wrap')
            assert.equal(actions[0].account.toString(), 'nex.shipload')
            assert.equal(actions[1].name.toString(), 'mintasset')
            assert.equal(actions[1].account.toString(), 'atomicassets')
            assert.isDefined(actions[0].data)
            assert.isDefined(actions[1].data)
        })

        test('throws when cargo row missing', async () => {
            const realServer = new ServerContract.Contract({client})
            const stubServer = {
                action: realServer.action.bind(realServer),
                table() {
                    return {async get() {}}
                },
            }
            const context = {server: stubServer, nft: {async getNftConfigForItem() {}}} as any
            const manager = new ActionsManager(context)
            try {
                await manager.wrap('alice', 42, 7, 99, 5)
                assert.fail('expected wrap to throw')
            } catch (err: any) {
                assert.match(err.message, /cargo row 99 not found/)
            }
        })
    })

    describe('wrapEntity', () => {
        const entityRow = ServerTypes.entity_row.from({
            id: 50,
            owner: 'alice',
            kind: 'ship',
            name: 'Wrappable',
            stats: '7777',
            coordinates: {x: 3, y: -4},
            cargomass: 0,
            modules: [],
            item_id: 10200,
        })

        function makeStubManager() {
            const realServer = new ServerContract.Contract({client})
            const realPlatform = new PlatformContract.Contract({client})
            const stubServer = {
                account: realServer.account,
                action: realServer.action.bind(realServer),
                table(name: string) {
                    return {
                        async get() {
                            if (name === 'entity') return entityRow
                            return undefined
                        },
                    }
                },
            }
            const stubPlatform = {
                account: realPlatform.account,
                action: realPlatform.action.bind(realPlatform),
            }
            const context = {
                server: stubServer,
                platform: stubPlatform,
                nft: {
                    async getNftConfigForItem(itemId: any) {
                        if (Number(UInt16.from(itemId).toString()) === 10200) {
                            return {templateId: 9000, schemaName: 'v1.entity'}
                        }
                        return undefined
                    },
                },
            } as any
            return new ActionsManager(context)
        }

        test('returns wrapentity + mintasset action pair', async () => {
            const actions = await makeStubManager().wrapEntity('alice', 50, 7)
            assert.equal(actions.length, 2)
            assert.equal(actions[0].name.toString(), 'wrapentity')
            assert.equal(actions[0].account.toString(), 'nex.shipload')
            assert.equal(actions[1].name.toString(), 'mintasset')
            assert.equal(actions[1].account.toString(), 'atomicassets')
            assert.isDefined(actions[0].data)
            assert.isDefined(actions[1].data)
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
