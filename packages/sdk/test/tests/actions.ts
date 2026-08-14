import {describe, test, beforeEach} from 'bun:test'
import {assert} from 'chai'
import {makeClient} from '@wharfkit/mock-data'
import Shipload, {ActionsManager, PlatformContract, ServerContract} from '$lib'
import {Chains} from '@wharfkit/common'
import {Int64, Serializer, UInt64} from '@wharfkit/antelope'

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

    describe('load', () => {
        test('creates load action with single item', () => {
            const action = shipload.actions.load(1, 2, [
                {item_id: 101, stats: 0n, modules: [], quantity: 10},
            ])
            assert.equal(action.name.toString(), 'load')
            assert.isDefined(action.data)
        })

        test('creates load action with multiple items', () => {
            const action = shipload.actions.load(1, 2, [
                {item_id: 101, stats: 0n, modules: [], quantity: 10},
                {item_id: 201, stats: 1n, modules: [], quantity: 5},
            ])
            assert.equal(action.name.toString(), 'load')
            assert.isDefined(action.data)
        })
    })

    describe('unload', () => {
        test('creates unload action with single item', () => {
            const action = shipload.actions.unload(1, 2, [
                {item_id: 101, stats: 0n, modules: [], quantity: 10},
            ])
            assert.equal(action.name.toString(), 'unload')
            assert.isDefined(action.data)
        })
    })

    describe('shuttle', () => {
        test('creates shuttle action with single item', () => {
            const action = shipload.actions.shuttle(1, 2, 3, [
                {item_id: 101, stats: 0n, modules: [], quantity: 10},
            ])
            assert.equal(action.account.toString(), 'eon.shipload')
            assert.equal(action.name.toString(), 'shuttle')
            const data = Serializer.decode({
                data: action.data,
                type: 'shuttle',
                abi: ServerContract.abi,
            }) as any
            assert.equal(String(data.carrier), '1')
            assert.equal(String(data.from_id), '2')
            assert.equal(String(data.to_id), '3')
            assert.equal(data.items.length, 1)
            assert.equal(String(data.items[0].item_id), '101')
            assert.equal(String(data.items[0].quantity), '10')
        })

        test('creates shuttle action with multiple items', () => {
            const action = shipload.actions.shuttle(1, 2, 3, [
                {item_id: 101, stats: 0n, modules: [], quantity: 10},
                {item_id: 201, stats: 1n, modules: [], quantity: 5},
            ])
            assert.equal(action.name.toString(), 'shuttle')
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

    describe('travelplan', () => {
        test('travelplan builds the action with entities, waypoints, and recharge', () => {
            const action = shipload.actions.travelplan(
                [{entityType: 'ship', entityId: 24}],
                [
                    {x: 1000, y: 0},
                    {x: 2000, y: 0},
                ],
                true
            )
            assert.equal(action.account.toString(), 'eon.shipload')
            assert.equal(action.name.toString(), 'travelplan')
            const data = Serializer.decode({
                data: action.data,
                type: 'travelplan',
                abi: ServerContract.abi,
            }) as any
            assert.equal(data.entities.length, 1)
            assert.equal(data.waypoints.length, 2)
            assert.equal(Number(data.waypoints[1].x), 2000)
            assert.equal(Boolean(data.recharge), true)
        })
    })

    describe('gatherplan', () => {
        test('builds the action with defaults (recharge=true, empty slots)', () => {
            const action = shipload.actions.gatherplan(39, 13, 236, 35379)
            assert.equal(action.account.toString(), 'eon.shipload')
            assert.equal(action.name.toString(), 'gatherplan')
            const data = Serializer.decode({
                data: action.data,
                type: 'gatherplan',
                abi: ServerContract.abi,
            }) as any
            assert.equal(String(data.source_id), '39')
            assert.equal(String(data.destination_id), '13')
            assert.equal(String(data.stratum), '236')
            assert.equal(String(data.quantity), '35379')
            assert.equal(Boolean(data.recharge), true)
            assert.equal(data.slots.array.length, 0)
        })

        test('encodes an explicit slot filter as bytes', () => {
            const action = shipload.actions.gatherplan(39, 39, 100, 500, false, [2, 3])
            const data = Serializer.decode({
                data: action.data,
                type: 'gatherplan',
                abi: ServerContract.abi,
            }) as any
            assert.equal(Boolean(data.recharge), false)
            assert.deepEqual(Array.from(data.slots.array as Uint8Array), [2, 3])
        })
    })

    describe('sync guard', () => {
        const EXCLUDED = new Set([
            // read-only get* queries — no builder needed
            'getcharter',
            'getcluster',
            'getconfig',
            'getdecomp',
            'getdemand',
            'getdeposit',
            'geteligible',
            'getentcls',
            'getentities',
            'getentity',
            'getfootprint',
            'getitemdata',
            'getitemids',
            'getitems',
            'getitemtype',
            'getinfdecay',
            'getinfluence',
            'getinfvalue',
            'getitemtypes',
            'getjobs',
            'getkindmeta',
            'getlocation',
            'getlocdata',
            'getmintcfg',
            'getmodtypes',
            'getmodules',
            'getnearby',
            'getnftbase',
            'getnftinfo',
            'getplayer',
            'getpool',
            'getpools',
            'getprojstate',
            'getrecipe',
            'getrecipes',
            'getrescats',
            'getreserves',
            'getresources',
            'getservice',
            'getslots',
            'getstratum',
            'getsummaries',
            'getupgjobs',
            // admin / setup actions — contract authority only
            'addnexus',
            'cleartable',
            'configlog',
            'enable',
            'fixcargomass',
            'fixitemids',
            'forcereveal',
            'genesisfleet',
            'resolveearly',
            'setcivic',
            'setinfburn',
            'setinfd1',
            'setinfdemand',
            'setinfmint',
            'setinfweight',
            'setcluster',
            'setcoords',
            'setnextid',
            'setnftcfg',
            'setwrapcost',
            'setwrapfee',
            'wipe',
            // data import actions — admin one-shot migrations
            'importcargo',
            'importcell',
            'importentity',
            'importepoch',
            'importgroup',
            'importnftcfg',
            'importplayer',
            'importreserve',
            'importstate',
            // internal / notification actions — not player-initiated
            'configlog',
            'notify',
            // debug / util
            'dbgcredit',
            'dbgdirection',
            'descentity',
            'hash',
            'hash512',
            'nftimgurl',
            'rmnftcfg',
            // stow actions (platform-side, handled via NFT transfer flow)
            'stowcargo',
            'stowentity',
            // admin entity removal
            'delentity',
            // inline-only, get_sender gated to the platform front door
            'addcontrib',
        ])

        test('every server action has an ActionsManager builder (or is explicitly excluded)', () => {
            const actions = shipload.actions
            const builderNames = new Set<string>()
            for (const k of Object.getOwnPropertyNames(Object.getPrototypeOf(actions))) {
                if (typeof (actions as any)[k] === 'function') builderNames.add(k.toLowerCase())
            }
            const allActionNames = ServerContract.abi.actions.map((a) => String(a.name))
            const missing = allActionNames.filter((n) => !builderNames.has(n.toLowerCase()))
            assert.deepEqual(
                missing.filter((n) => !EXCLUDED.has(n)),
                []
            )
        })

        test('travelplan is surfaced as a builder', () => {
            assert.equal(typeof (shipload.actions as any).travelplan, 'function')
        })
    })
})
