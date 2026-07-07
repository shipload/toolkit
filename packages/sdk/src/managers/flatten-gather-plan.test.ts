import {expect, test, describe} from 'bun:test'
import {makeClient} from '@wharfkit/mock-data'
import {Serializer} from '@wharfkit/antelope'
import type {GatherPlan} from '../planner'
import {ActionsManager} from './actions'
import {ServerContract} from '../contracts'

const client = makeClient('https://jungle4.greymass.com')

function makeActions() {
    const realServer = new ServerContract.Contract({client})
    const stubServer = {
        account: realServer.account,
        action: realServer.action.bind(realServer),
    }
    const context = {server: stubServer} as any
    return new ActionsManager(context)
}

function fakePlan(): GatherPlan {
    return {
        cycles: [
            {
                rechargeBefore: false,
                rechargeSeconds: 0,
                gatherSeconds: 10,
                batchOre: 30,
                limpets: [
                    {slot: 0, quantity: 20, durationSeconds: 10},
                    {slot: 1, quantity: 10, durationSeconds: 8},
                ],
            },
            {
                rechargeBefore: true,
                rechargeSeconds: 5,
                gatherSeconds: 10,
                batchOre: 30,
                limpets: [{slot: 0, quantity: 30, durationSeconds: 10}],
            },
        ],
        cycleCount: 2,
        totalOre: 60,
        totalSeconds: 25,
        cap: 'requested',
        reachingCount: 2,
        totalLimpets: 2,
        warnings: [],
    }
}

describe('flattenGatherPlan', () => {
    test('flattens cycles to [recharge?, gather x limpets] in order with slots', () => {
        const actions = makeActions().flattenGatherPlan(fakePlan(), {
            sourceId: 1,
            destinationId: 1,
            stratum: 100,
        })
        expect(actions.map((a) => a.name.toString())).toEqual([
            'gather',
            'gather',
            'recharge',
            'gather',
        ])
        expect(actions.filter((a) => a.name.toString() === 'recharge').length).toBe(1)
        const gatherSlots = actions
            .filter((a) => a.name.toString() === 'gather')
            .map((a) => {
                const decoded = Serializer.decode({data: a.data, type: ServerContract.Types.gather})
                return Number(decoded.slot)
            })
        expect(gatherSlots).toEqual([0, 1, 0])
    })

    test('empty plan produces no actions', () => {
        const empty = {...fakePlan(), cycles: [], cycleCount: 0, totalOre: 0}
        expect(
            makeActions().flattenGatherPlan(empty, {sourceId: 1, destinationId: 1, stratum: 100})
        ).toHaveLength(0)
    })
})
