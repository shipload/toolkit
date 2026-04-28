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

describe('SubscriptionsManager resubscribe-on-reconnect', () => {
    let fake: FakeWebSocketServer
    let mgr: SubscriptionsManager

    beforeEach(() => {
        fake = new FakeWebSocketServer()
        mgr = new SubscriptionsManager({url: 'ws://fake/', minReconnectDelay: 1})
    })

    afterEach(() => {
        mgr.close()
        fake.close()
    })

    test('replays subscribe_entity after reconnect with same sub_id', async () => {
        await new Promise((r) => setTimeout(r, 1))
        const handle = mgr.subscribeEntity('ship', '42', noop)
        const first = await fake.nextMessage()
        assert.equal(first.type, 'subscribe_entity')
        assert.equal(first.entity_id, '42')

        fake.triggerClose()

        const replay = await fake.nextMessage()
        assert.equal(replay.type, 'subscribe_entity')
        assert.equal(replay.entity_type, 'ship')
        assert.equal(replay.entity_id, '42')
        assert.equal(replay.sub_id, first.sub_id)
        handle.unsubscribe()
    })

    test('replays subscribe (bounds) after reconnect with current bounds', async () => {
        await new Promise((r) => setTimeout(r, 1))
        const initial = {min_x: 0, min_y: 0, max_x: 10, max_y: 10}
        const handle = mgr.subscribeBounds(initial, {})
        const first = await fake.nextMessage()
        assert.equal(first.type, 'subscribe')
        assert.deepEqual(first.bounds, initial)

        const updated = {min_x: 5, min_y: 5, max_x: 20, max_y: 20}
        handle.updateBounds(updated)
        const updateMsg = await fake.nextMessage()
        assert.equal(updateMsg.type, 'update_bounds')

        fake.triggerClose()

        const replay = await fake.nextMessage()
        assert.equal(replay.type, 'subscribe')
        assert.equal(replay.sub_id, first.sub_id)
        assert.deepEqual(replay.bounds, updated)
        handle.unsubscribe()
    })

    test('does not double-send subscribe_entity on initial connect', async () => {
        await new Promise((r) => setTimeout(r, 1))
        const handle = mgr.subscribeEntity('ship', '7', noop)
        const first = await fake.nextMessage()
        assert.equal(first.type, 'subscribe_entity')

        // Wait long enough for any spurious replay to arrive.
        await new Promise((r) => setTimeout(r, 5))
        handle.unsubscribe()
        const next = await fake.nextMessage()
        assert.equal(next.type, 'unsubscribe_entity')
    })
})

describe('SubscriptionsManager heartbeat', () => {
    let fake: FakeWebSocketServer

    beforeEach(() => {
        fake = new FakeWebSocketServer()
    })

    afterEach(() => {
        fake.close()
    })

    test('sends ping at the configured interval while connected', async () => {
        const mgr = new SubscriptionsManager({
            url: 'ws://fake/',
            pingIntervalMs: 5,
            pongTimeoutMs: 1000,
        })
        try {
            const msg = await fake.nextMessage()
            assert.equal(msg.type, 'ping')
        } finally {
            mgr.close()
        }
    })

    test('forces reconnect when no frames received within pongTimeout', async () => {
        const mgr = new SubscriptionsManager({
            url: 'ws://fake/',
            pingIntervalMs: 5,
            pongTimeoutMs: 5,
            minReconnectDelay: 1,
        })
        try {
            await new Promise((r) => setTimeout(r, 1))
            const handle = mgr.subscribeEntity('ship', '99', noop)
            const first = await fake.nextMessage()
            assert.equal(first.type, 'subscribe_entity')

            // Server never replies. Stale timer should fire, force-close,
            // reconnect, then replay our subscription.
            let replayed = false
            for (let i = 0; i < 20; i++) {
                const msg = await fake.nextMessage()
                if (msg.type === 'subscribe_entity' && msg.sub_id === first.sub_id) {
                    replayed = true
                    break
                }
            }
            assert.isTrue(
                replayed,
                'expected subscribe_entity replay after stale-timeout reconnect'
            )
            handle.unsubscribe()
        } finally {
            mgr.close()
        }
    })

    test('inbound frames keep the connection alive past pongTimeout', async () => {
        const mgr = new SubscriptionsManager({
            url: 'ws://fake/',
            pingIntervalMs: 5,
            pongTimeoutMs: 10,
            minReconnectDelay: 1,
        })
        try {
            await new Promise((r) => setTimeout(r, 1))
            const handle = mgr.subscribeEntity('ship', '101', noop)
            const first = await fake.nextMessage()
            assert.equal(first.type, 'subscribe_entity')
            const subId = first.sub_id

            // Reply to every ping with a pong for ~50ms (well past
            // pingInterval + pongTimeout = 15ms).
            const stopAt = Date.now() + 50
            while (Date.now() < stopAt) {
                const msg = await fake.nextMessage()
                if (msg.type === 'ping') {
                    fake.send({type: 'pong'})
                } else if (msg.type === 'subscribe_entity' && msg.sub_id === subId) {
                    assert.fail('connection dropped despite pong replies')
                }
            }
            handle.unsubscribe()
        } finally {
            mgr.close()
        }
    })
})
