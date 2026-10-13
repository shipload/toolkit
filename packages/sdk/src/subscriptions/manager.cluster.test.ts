import {afterEach, describe, expect, test} from 'bun:test'
import type {ConnectionState} from './connection'
import {SubscriptionsManager} from './manager'
import type {ServerMessage} from './types'

function createManager(): SubscriptionsManager {
    return new SubscriptionsManager({url: 'ws://localhost:0'})
}

function deliver(mgr: SubscriptionsManager, msg: ServerMessage) {
    ;(mgr as unknown as {onMessage(m: ServerMessage): void}).onMessage(msg)
}

function changeState(mgr: SubscriptionsManager, state: ConnectionState) {
    ;(mgr as unknown as {onStateChange(s: ConnectionState): void}).onStateChange(state)
}

describe('connection state', () => {
    let mgr: SubscriptionsManager | undefined

    afterEach(() => {
        mgr?.close()
        mgr = undefined
    })

    test('connectionState reads the socket state', () => {
        mgr = createManager()
        expect(['connecting', 'reconnecting']).toContain(mgr.connectionState)
    })

    test('listeners receive every state change until they unsubscribe', () => {
        mgr = createManager()
        const seen: ConnectionState[] = []
        const off = mgr.onConnectionStateChange((s) => seen.push(s))
        changeState(mgr, 'connected')
        changeState(mgr, 'reconnecting')
        off()
        changeState(mgr, 'connected')
        expect(seen).toEqual(['connected', 'reconnecting'])
    })
})

describe('cluster delta routing', () => {
    let mgr: SubscriptionsManager | undefined

    afterEach(() => {
        mgr?.close()
        mgr = undefined
    })

    test('routes a cluster frame to the matching entity subscription onCluster', () => {
        mgr = createManager()
        const received: unknown[] = []
        const handle = mgr.subscribeEntity(42, {
            onCluster: (p) => received.push(p),
        })
        deliver(mgr, {
            type: 'cluster',
            sub_id: handle.subId,
            hub_id: 42,
            seq: 7,
            cells: [{gx: 0, gy: 1, entity: 99, type: 'warehouse'}],
        })
        expect(received).toEqual([
            {
                hubId: 42,
                seq: 7,
                cells: [{gx: 0, gy: 1, entity: 99, type: 'warehouse'}],
                erased: false,
            },
        ])
    })

    test('an erased cluster frame yields cells:null, erased:true', () => {
        mgr = createManager()
        const received: unknown[] = []
        const handle = mgr.subscribeEntity(42, {onCluster: (p) => received.push(p)})
        deliver(mgr, {type: 'cluster', sub_id: handle.subId, hub_id: 42, seq: 8, erased: true})
        expect(received).toEqual([{hubId: 42, seq: 8, cells: null, erased: true}])
    })
})
