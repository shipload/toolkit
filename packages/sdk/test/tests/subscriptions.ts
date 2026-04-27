import {describe, test, beforeEach, afterEach} from 'bun:test'
import {assert} from 'chai'
import {Container, ServerContract, Ship, Warehouse} from '$lib'
import {mapEntity} from '../../src/subscriptions/mappers'
import {SubscriptionsManager} from '../../src/subscriptions/manager'
import {FakeWebSocketServer} from '../helpers/fake-ws'

const noop = (): void => undefined

describe('subscriptions/mappers', () => {
    test('mapEntity returns Ship for type=ship', () => {
        const ei = ServerContract.Types.entity_info.from({
            type: 'ship',
            id: 1,
            owner: 'alice',
            entity_name: 'Test Ship',
            coordinates: {x: 0, y: 0, z: 800},
            cargomass: 0,
            cargo: [],
            modules: [],
            is_idle: true,
            current_task_elapsed: 0,
            current_task_remaining: 0,
            pending_tasks: [],
        })
        assert.instanceOf(mapEntity(ei), Ship)
    })

    test('mapEntity returns Warehouse for type=warehouse', () => {
        const ei = ServerContract.Types.entity_info.from({
            type: 'warehouse',
            id: 2,
            owner: 'alice',
            entity_name: 'Test WH',
            coordinates: {x: 0, y: 0, z: 800},
            cargomass: 0,
            cargo: [],
            modules: [],
            is_idle: true,
            current_task_elapsed: 0,
            current_task_remaining: 0,
            pending_tasks: [],
        })
        assert.instanceOf(mapEntity(ei), Warehouse)
    })

    test('mapEntity returns Container for type=container', () => {
        const ei = ServerContract.Types.entity_info.from({
            type: 'container',
            id: 3,
            owner: 'alice',
            entity_name: 'Test C',
            coordinates: {x: 0, y: 0, z: 800},
            cargomass: 0,
            cargo: [],
            modules: [],
            is_idle: true,
            current_task_elapsed: 0,
            current_task_remaining: 0,
            pending_tasks: [],
        })
        assert.instanceOf(mapEntity(ei), Container)
    })
})

describe('SubscriptionsManager', () => {
    let fake: FakeWebSocketServer
    let mgr: SubscriptionsManager

    beforeEach(() => {
        fake = new FakeWebSocketServer()
        mgr = new SubscriptionsManager({url: 'ws://fake/'})
    })

    afterEach(() => {
        mgr.close()
        fake.close()
    })

    test('subscribeEntity sends subscribe_entity frame', async () => {
        await new Promise((r) => setTimeout(r, 1))
        const handle = mgr.subscribeEntity('ship', '1', noop)
        const msg = await fake.nextMessage()
        assert.equal(msg.type, 'subscribe_entity')
        assert.equal(msg.entity_type, 'ship')
        assert.equal(msg.entity_id, '1')
        assert.isString(msg.sub_id)
        handle.unsubscribe()
    })

    test('subscribeEntity invokes callback on snapshot frame', async () => {
        await new Promise((r) => setTimeout(r, 1))
        let received: Ship | Warehouse | Container | null = null
        const handle = mgr.subscribeEntity('ship', '1', (e) => {
            received = e
        })
        const sentMsg = await fake.nextMessage()
        fake.send({type: 'subscribed', sub_id: sentMsg.sub_id})
        fake.send({
            type: 'snapshot',
            sub_id: sentMsg.sub_id,
            seq: 100,
            entities: [
                {
                    type: 1,
                    type_name: 'ship',
                    id: '1',
                    owner: 'alice',
                    entity_name: 'Test',
                    coordinates: {x: 0, y: 0, z: 800},
                    cargomass: 0,
                    cargo: [],
                    modules: [],
                    is_idle: true,
                    current_task_elapsed: 0,
                    current_task_remaining: 0,
                    pending_tasks: [],
                },
            ],
            truncated: false,
        })
        await new Promise((r) => setTimeout(r, 10))
        assert.isNotNull(received)
        assert.instanceOf(received!, Ship)
        handle.unsubscribe()
    })

    test('handle.unsubscribe sends unsubscribe_entity frame', async () => {
        await new Promise((r) => setTimeout(r, 1))
        const handle = mgr.subscribeEntity('ship', '1', noop)
        await fake.nextMessage()
        handle.unsubscribe()
        const msg = await fake.nextMessage()
        assert.equal(msg.type, 'unsubscribe_entity')
    })
})
