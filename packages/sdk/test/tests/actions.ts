import {describe, test, beforeEach} from 'bun:test'
import {assert} from 'chai'
import {makeClient} from '@wharfkit/mock-data'
import Shipload from '$lib'
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
        test('creates wrap action', () => {
            const action = shipload.actions.wrap('alice', 42, 7, 99, 5)
            assert.equal(action.name.toString(), 'wrap')
            assert.isDefined(action.data)
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
})
