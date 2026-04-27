import {describe, test, beforeEach} from 'bun:test'
import {assert} from 'chai'
import {makeClient} from '@wharfkit/mock-data'
import Shipload from '$lib'
import {Chains} from '@wharfkit/common'
import {Int64, UInt64} from '@wharfkit/antelope'
import {EntityType} from 'src/types'

const client = makeClient('https://jungle4.greymass.com')
const platformContractName = 'platform.gm'
const serverContractName = 'shipload.gm'

describe('ActionsManager', () => {
    let shipload: Shipload

    beforeEach(async () => {
        shipload = await Shipload.load(Chains.Jungle4, {
            client,
            platformContractName,
            serverContractName,
        })
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
            const action = shipload.actions.wrap('alice', EntityType.SHIP, 42, 7, 5)
            assert.equal(action.name.toString(), 'wrap')
            assert.isDefined(action.data)
        })
    })
})
