import {describe, test, beforeEach, afterEach} from 'bun:test'
import {assert} from 'chai'
import {Entity, ServerContract} from '$lib'
import {mapEntity} from '../../src/subscriptions/mappers'
import {
    type BoundsSubscriptionHandle,
    type EntitySubscriptionFilter,
    type EntitySubscriptionMeta,
    type EntitySubscriptionHandle,
    type OwnerSubscriptionHandle,
    SubscriptionsManager,
} from '../../src/subscriptions/manager'
import {FakeWebSocketServer} from '../helpers/fake-ws'

const noop = (): void => undefined
const noMessageWithin = (fake: FakeWebSocketServer, ms = 10): Promise<boolean> =>
    Promise.race([
        fake.nextMessage().then(() => false),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(true), ms)),
    ])

describe('subscriptions/mappers', () => {
    test('mapEntity returns Entity for type=ship', () => {
        const ei = ServerContract.Types.entity_info.from({
            type: 'ship',
            id: 1,
            owner: 'alice',
            entity_name: 'Test Ship',
            coordinates: {x: 0, y: 0, z: 800},
            item_id: 0,
            cargomass: 0,
            cargo: [],
            modules: [],
            is_idle: true,
            current_task_elapsed: 0,
            current_task_remaining: 0,
            pending_tasks: [],
            lanes: [],
            gatherer_lanes: [],
            crafter_lanes: [],
            loader_lanes: [],
            holds: [],
        })
        assert.instanceOf(mapEntity(ei), Entity)
    })

    test('mapEntity returns Entity for type=warehouse', () => {
        const ei = ServerContract.Types.entity_info.from({
            type: 'warehouse',
            id: 2,
            owner: 'alice',
            entity_name: 'Test WH',
            coordinates: {x: 0, y: 0, z: 800},
            item_id: 0,
            cargomass: 0,
            cargo: [],
            modules: [],
            is_idle: true,
            current_task_elapsed: 0,
            current_task_remaining: 0,
            pending_tasks: [],
            lanes: [],
            gatherer_lanes: [],
            crafter_lanes: [],
            loader_lanes: [],
            holds: [],
        })
        assert.instanceOf(mapEntity(ei), Entity)
    })

    test('mapEntity returns Entity for type=container', () => {
        const ei = ServerContract.Types.entity_info.from({
            type: 'container',
            id: 3,
            owner: 'alice',
            entity_name: 'Test C',
            coordinates: {x: 0, y: 0, z: 800},
            item_id: 0,
            cargomass: 0,
            cargo: [],
            modules: [],
            is_idle: true,
            current_task_elapsed: 0,
            current_task_remaining: 0,
            pending_tasks: [],
            lanes: [],
            gatherer_lanes: [],
            crafter_lanes: [],
            loader_lanes: [],
            holds: [],
        })
        assert.instanceOf(mapEntity(ei), Entity)
    })

    test('mapEntity returns Entity for type=nexus', () => {
        const ei = ServerContract.Types.entity_info.from({
            type: 'nexus',
            id: 4,
            owner: 'shipload.gm',
            entity_name: 'Genesis Nexus',
            coordinates: {x: 0, y: 0, z: 800},
            item_id: 0,
            cargomass: 0,
            cargo: [],
            modules: [],
            is_idle: true,
            current_task_elapsed: 0,
            current_task_remaining: 0,
            pending_tasks: [],
            lanes: [],
            gatherer_lanes: [],
            crafter_lanes: [],
            loader_lanes: [],
            holds: [],
        })
        assert.instanceOf(mapEntity(ei), Entity)
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
        const handle: EntitySubscriptionHandle = mgr.subscribeEntity('1', {onUpdate: noop})
        const msg = await fake.nextMessage()
        assert.equal(msg.type, 'subscribe_entity')
        assert.equal(msg.entity_id, '1')
        assert.isUndefined(msg.entity_type)
        assert.isString(msg.sub_id)
        assert.isUndefined((handle as {updateBounds?: unknown}).updateBounds)
        handle.unsubscribe()
    })

    test('subscribeEntity invokes callback on snapshot frame', async () => {
        await new Promise((r) => setTimeout(r, 1))
        let received: Entity | null = null
        const handle = mgr.subscribeEntity('1', {
            onUpdate: (e) => {
                received = e
            },
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
                    item_id: 0,
                    cargomass: 0,
                    cargo: [],
                    modules: [],
                    is_idle: true,
                    current_task_elapsed: 0,
                    current_task_remaining: 0,
                    pending_tasks: [],
                    lanes: [],
                },
            ],
            truncated: false,
        })
        await new Promise((r) => setTimeout(r, 10))
        assert.isNotNull(received)
        assert.instanceOf(received!, Entity)
        handle.unsubscribe()
    })

    test('handle.unsubscribe sends unsubscribe_entity frame', async () => {
        await new Promise((r) => setTimeout(r, 1))
        const handle = mgr.subscribeEntity('1', {onUpdate: noop})
        await fake.nextMessage()
        handle.unsubscribe()
        const msg = await fake.nextMessage()
        assert.equal(msg.type, 'unsubscribe_entity')
    })

    test('subscribeEntities sends broad subscribe frame without owner or bounds', async () => {
        await new Promise((r) => setTimeout(r, 1))
        const handle = mgr.subscribeEntities({}, {})
        const msg = await fake.nextMessage()
        assert.equal(msg.type, 'subscribe')
        assert.isUndefined(msg.owner)
        assert.isUndefined(msg.bounds)
        assert.isString(msg.sub_id)
        handle.unsubscribe()
    })

    test('subscribeEntities accepts a union-typed filter variable', async () => {
        await new Promise((r) => setTimeout(r, 1))
        const filter: EntitySubscriptionFilter = Math.random() < 2 ? {owner: 'alice'} : {id: '1'}
        const handle = mgr.subscribeEntities(filter, {})
        const msg = await fake.nextMessage()
        assert.equal(msg.type, 'subscribe')
        assert.equal(msg.owner, 'alice')
        handle.unsubscribe()
    })

    test('subscribeEntities rejects mixed exact and broad filters without sending a frame', async () => {
        await new Promise((r) => setTimeout(r, 1))
        const filter = {
            id: '1',
            bounds: {min_x: 0, min_y: 0, max_x: 10, max_y: 10},
        } as unknown as EntitySubscriptionFilter

        assert.throws(() => mgr.subscribeEntities(filter, {}), /exact entity subscription/i)
        assert.isTrue(await noMessageWithin(fake))
    })

    test('subscribeAllEntities sends broad subscribe frame without owner or bounds', async () => {
        await new Promise((r) => setTimeout(r, 1))
        const handle = mgr.subscribeAllEntities({})
        const msg = await fake.nextMessage()
        assert.equal(msg.type, 'subscribe')
        assert.isUndefined(msg.owner)
        assert.isUndefined(msg.bounds)
        assert.isString(msg.sub_id)
        handle.unsubscribe()
    })

    test('subscribeBounds sends subscribe frame with bounds', async () => {
        await new Promise((r) => setTimeout(r, 1))
        const bounds = {min_x: 0, min_y: 0, max_x: 10, max_y: 10}
        const handle: BoundsSubscriptionHandle = mgr.subscribeBounds(bounds, {})
        const msg = await fake.nextMessage()
        assert.equal(msg.type, 'subscribe')
        assert.deepEqual(msg.bounds, bounds)
        assert.isUndefined(msg.owner)
        assert.isString(msg.sub_id)
        handle.updateBounds(bounds)
        const updateMsg = await fake.nextMessage()
        assert.equal(updateMsg.type, 'update_bounds')
        handle.unsubscribe()
    })

    test('exposed filter mutation cannot alter exact unsubscribe behavior', async () => {
        await new Promise((r) => setTimeout(r, 1))
        const handle = mgr.subscribeEntity('5', {})
        await fake.nextMessage()

        try {
            const exposed = handle.filter as unknown as {id?: undefined; owner?: string}
            exposed.id = undefined
            exposed.owner = 'alice'
        } catch {
            // Frozen snapshots throw in strict mode; either way, internals must be protected.
        }

        handle.unsubscribe()
        const msg = await fake.nextMessage()
        assert.equal(msg.type, 'unsubscribe_entity')
    })

    test('snapshot callback receives metadata', async () => {
        await new Promise((r) => setTimeout(r, 1))
        let metaSeen: EntitySubscriptionMeta | null = null
        const handle = mgr.subscribeAllEntities({
            onSnapshot: (_entities, meta) => {
                metaSeen = meta
            },
        })
        const sent = await fake.nextMessage()
        fake.send({
            type: 'snapshot',
            sub_id: sent.sub_id,
            seq: 44,
            entities: [],
            truncated: true,
        })
        await new Promise((r) => setTimeout(r, 10))
        assert.deepEqual(metaSeen, {seq: 44, truncated: true})
        handle.unsubscribe()
    })

    test('update callback receives metadata', async () => {
        await new Promise((r) => setTimeout(r, 1))
        let metaSeen: EntitySubscriptionMeta | null = null
        const handle = mgr.subscribeAllEntities({
            onUpdate: (_entity, meta) => {
                metaSeen = meta
            },
        })
        const sent = await fake.nextMessage()
        fake.send({
            type: 'update',
            sub_ids: [sent.sub_id],
            entity_id: 5,
            seq: 45,
            entity: {
                type: 1,
                type_name: 'ship',
                id: '5',
                owner: 'alice',
                entity_name: 'Test',
                coordinates: {x: 0, y: 0, z: 800},
                item_id: 0,
                cargomass: 0,
                cargo: [],
                modules: [],
                is_idle: true,
                current_task_elapsed: 0,
                current_task_remaining: 0,
                pending_tasks: [],
                lanes: [],
            },
        })
        await new Promise((r) => setTimeout(r, 10))
        assert.deepEqual(metaSeen, {seq: 45})
        handle.unsubscribe()
    })

    test('bounds delta callback receives metadata', async () => {
        await new Promise((r) => setTimeout(r, 1))
        let metaSeen: EntitySubscriptionMeta | null = null
        const handle = mgr.subscribeBounds(
            {min_x: 0, min_y: 0, max_x: 10, max_y: 10},
            {
                onBoundsDelta: (_entered, _exited, meta) => {
                    metaSeen = meta
                },
            }
        )
        const sent = await fake.nextMessage()
        fake.send({
            type: 'bounds_delta',
            sub_id: sent.sub_id,
            seq: 46,
            entered: [],
            exited: [],
            truncated: true,
        })
        await new Promise((r) => setTimeout(r, 10))
        assert.deepEqual(metaSeen, {seq: 46, truncated: true})
        handle.unsubscribe()
    })

    test('entity_deleted invokes delete handler for exact subscription', async () => {
        await new Promise((r) => setTimeout(r, 1))
        let deleted: string | null = null
        const handle = mgr.subscribeEntity('99', {
            onDeleted: (id) => {
                deleted = id
            },
        })
        const sent = await fake.nextMessage()
        fake.send({type: 'entity_deleted', sub_id: sent.sub_id, entity_id: 99, seq: 55})
        await new Promise((r) => setTimeout(r, 10))
        assert.equal(deleted, '99')
        handle.unsubscribe()
    })

    test('throwing deleted callback still removes exact subscription before reconnect replay', async () => {
        mgr.close()
        fake.close()
        fake = new FakeWebSocketServer()
        mgr = new SubscriptionsManager({url: 'ws://fake/', minReconnectDelay: 1})
        const originalError = console.error
        console.error = () => undefined

        try {
            await new Promise((r) => setTimeout(r, 1))
            const handle = mgr.subscribeEntity('77', {
                onDeleted: () => {
                    throw new Error('boom')
                },
            })
            const sent = await fake.nextMessage()
            fake.send({
                type: 'entity_deleted',
                sub_id: sent.sub_id,
                entity_id: 77,
                seq: 56,
            })
            await new Promise((r) => setTimeout(r, 10))

            fake.triggerClose()
            assert.isTrue(await noMessageWithin(fake, 20))
            handle.unsubscribe()
        } finally {
            console.error = originalError
        }
    })

    test('throwing error callback still removes subscription before reconnect replay', async () => {
        mgr.close()
        fake.close()
        fake = new FakeWebSocketServer()
        mgr = new SubscriptionsManager({url: 'ws://fake/', minReconnectDelay: 1})
        const originalError = console.error
        console.error = () => undefined

        try {
            await new Promise((r) => setTimeout(r, 1))
            const handle = mgr.subscribeOwner('alice', {
                onError: () => {
                    throw new Error('boom')
                },
            })
            const sent = await fake.nextMessage()
            fake.send({type: 'error', sub_id: sent.sub_id, error: 'server error'})
            await new Promise((r) => setTimeout(r, 10))

            fake.triggerClose()
            assert.isTrue(await noMessageWithin(fake, 20))
            handle.unsubscribe()
        } finally {
            console.error = originalError
        }
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
        const handle = mgr.subscribeEntity('42', {onUpdate: noop})
        const first = await fake.nextMessage()
        assert.equal(first.type, 'subscribe_entity')
        assert.equal(first.entity_id, '42')

        fake.triggerClose()

        const replay = await fake.nextMessage()
        assert.equal(replay.type, 'subscribe_entity')
        assert.isUndefined(replay.entity_type)
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
        const handle = mgr.subscribeEntity('7', {onUpdate: noop})
        const first = await fake.nextMessage()
        assert.equal(first.type, 'subscribe_entity')

        // Wait long enough for any spurious replay to arrive.
        await new Promise((r) => setTimeout(r, 5))
        handle.unsubscribe()
        const next = await fake.nextMessage()
        assert.equal(next.type, 'unsubscribe_entity')
    })
})

describe('SubscriptionsManager subscribeOwner', () => {
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

    test('subscribeOwner sends subscribe frame with owner and no bounds', async () => {
        await new Promise((r) => setTimeout(r, 1))
        const handle: OwnerSubscriptionHandle = mgr.subscribeOwner('alice', {})
        const msg = await fake.nextMessage()
        assert.equal(msg.type, 'subscribe')
        assert.equal(msg.owner, 'alice')
        assert.isUndefined(msg.bounds)
        assert.isString(msg.sub_id)
        assert.isUndefined((handle as {updateBounds?: unknown}).updateBounds)
        handle.unsubscribe()
    })

    test('subscribeOwner unsubscribe sends unsubscribe frame', async () => {
        await new Promise((r) => setTimeout(r, 1))
        const handle = mgr.subscribeOwner('alice', {})
        const first = await fake.nextMessage()
        assert.equal(first.type, 'subscribe')
        handle.unsubscribe()
        const next = await fake.nextMessage()
        assert.equal(next.type, 'unsubscribe')
        assert.equal(next.sub_id, first.sub_id)
    })

    test('subscribeOwner replays after reconnect with same sub_id and no bounds', async () => {
        await new Promise((r) => setTimeout(r, 1))
        const handle = mgr.subscribeOwner('alice', {})
        const first = await fake.nextMessage()
        assert.equal(first.type, 'subscribe')
        assert.equal(first.owner, 'alice')
        assert.isUndefined(first.bounds)

        fake.triggerClose()

        const replay = await fake.nextMessage()
        assert.equal(replay.type, 'subscribe')
        assert.equal(replay.sub_id, first.sub_id)
        assert.equal(replay.owner, 'alice')
        assert.isUndefined(replay.bounds)
        handle.unsubscribe()
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
            const handle = mgr.subscribeEntity('99', {onUpdate: noop})
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
            const handle = mgr.subscribeEntity('101', {onUpdate: noop})
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
