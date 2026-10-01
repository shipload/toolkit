import {expect, test} from 'bun:test'
import {Name} from '@wharfkit/antelope'
import {ServerContract, type ServerTypes} from '@shipload/sdk'
import {
    assertCandidatesNeedAuto,
    buildAction,
    parseShuttledBy,
    resolveAutoShuttledBy,
    SUBCOMMAND,
} from '../../../src/commands/action/craftjob'
import {getLocalShipload} from '../../helpers/shipload'

test('craftjob builds action with ship, workshop and inputs, no socket', async () => {
    const action = await buildAction(
        {
            entityType: 'ship',
            entityId: 1003n,
            workshopId: 1001n,
            recipeId: 10001,
            quantity: 1,
            inputs: [{itemId: 101, quantity: 10, stackId: 413333752n}],
        },
        getLocalShipload()
    )
    expect(action.name.toString()).toBe('craftjob')
    expect(action.account.toString()).toBe('eon.shipload')
    const decoded = action.decodeData(getLocalShipload().server.abi) as Record<string, unknown>
    expect(Object.keys(decoded)).toEqual([
        'ship_id',
        'workshop_id',
        'recipe_id',
        'quantity',
        'inputs',
        'shuttled_by',
    ])
})

test('craftjob buildAction forwards --shuttled-by as the last SDK action argument', async () => {
    const action = await buildAction(
        {
            entityType: 'ship',
            entityId: 1003n,
            workshopId: 1001n,
            recipeId: 10001,
            quantity: 1,
            inputs: [{itemId: 101, quantity: 10, stackId: 413333752n}],
            shuttledBy: 15n,
        },
        getLocalShipload()
    )
    const decoded = action.decodeData(getLocalShipload().server.abi) as Record<string, unknown>
    expect(String(decoded.shuttled_by)).toBe('15')
})

test('craftjob SUBCOMMAND accepts --shuttled-by', () => {
    const cmd = SUBCOMMAND.build({entityType: 'ship', entityId: 1n})
    const longs = cmd.options.map((o) => o.long)
    expect(longs).toContain('--shuttled-by')
})

test('craftjob buildAction accepts multi-stack inputs', async () => {
    const action = await buildAction(
        {
            entityType: 'ship',
            entityId: 1n,
            workshopId: 1001n,
            recipeId: 10003,
            quantity: 5,
            inputs: [
                {itemId: 301, quantity: 11, stackId: 1000n},
                {itemId: 301, quantity: 39, stackId: 2000n},
            ],
        },
        getLocalShipload()
    )
    expect(action.name.toString()).toBe('craftjob')
})

test('craftjob SUBCOMMAND takes workshop, recipe, quantity and inputs', () => {
    const cmd = SUBCOMMAND.build({entityType: 'ship', entityId: 1n})
    expect(cmd.name()).toBe('craftjob')
    expect(cmd.registeredArguments.map((a) => a.name())).toEqual([
        'workshop-id',
        'recipe-id',
        'quantity',
        'input',
    ])
    const longs = cmd.options.map((o) => o.long)
    expect(longs).toContain('--wait')
    expect(longs).toContain('--track')
})

test('parseShuttledBy reads "auto" and falls back to a plain entity id', () => {
    expect(parseShuttledBy('auto')).toBe('auto')
    expect(parseShuttledBy('7')).toBe(7n)
})

test('resolveAutoShuttledBy asks the SDK for shuttle options and returns the auto pick', async () => {
    const sl = getLocalShipload()
    const rows = new Map<string, ServerTypes.entity_row>()
    const fetchRow = async (id: bigint | number) => {
        const row = rows.get(String(id))
        if (!row) throw new Error(`unexpected fetchRow(${id})`)
        return row
    }
    sl.entities.getEntities = (async () => []) as typeof sl.entities.getEntities
    sl.influence.getCivicOwner = (async () =>
        Name.from('eon.shipload')) as typeof sl.influence.getCivicOwner
    let craftReq: unknown
    sl.shuttle.craft = (async (req: unknown) => {
        craftReq = req
        return {
            options: [],
            auto: {shuttledBy: '900', mode: 'bays', hostId: '900', laneKey: 0, duration: 10},
        }
    }) as typeof sl.shuttle.craft
    rows.set('1001', {
        id: 1001,
        owner: 'eon.shipload',
        kind: 'workshop',
        item_id: 1,
        coordinates: {x: 0, y: 0},
    } as never)
    const shuttledBy = await resolveAutoShuttledBy(
        sl,
        {entityType: 'ship', entityId: 1003n},
        1001n,
        10001,
        1,
        [{itemId: 101, quantity: 10, stackId: 413333752n, modules: []}],
        [],
        'eggmaple.gm',
        fetchRow
    )
    expect(shuttledBy).toBe(900n)
    expect(craftReq).toMatchObject({shipId: 1003n, workshopId: 1001n, recipeId: 10001, quantity: 1})
})

test('resolveAutoShuttledBy explains it when nothing can shuttle the booking', async () => {
    const sl = getLocalShipload()
    const fetchRow = async () =>
        ({
            id: 1001,
            owner: 'eon.shipload',
            kind: 'workshop',
            item_id: 1,
            coordinates: {x: 0, y: 0},
        }) as never
    sl.entities.getEntities = (async () => []) as typeof sl.entities.getEntities
    sl.influence.getCivicOwner = (async () =>
        Name.from('eon.shipload')) as typeof sl.influence.getCivicOwner
    sl.shuttle.craft = (async () => ({
        options: [],
        blocked: {code: 'not-equipped', reason: 'workshop has no fabricator installed'},
    })) as typeof sl.shuttle.craft
    await expect(
        resolveAutoShuttledBy(
            sl,
            {entityType: 'ship', entityId: 1003n},
            1001n,
            10001,
            1,
            [{itemId: 101, quantity: 10, stackId: 413333752n, modules: []}],
            [],
            'eggmaple.gm',
            fetchRow
        )
    ).rejects.toThrow('The Workshop has no Fabricator installed.')
})

test('assertCandidatesNeedAuto accepts --candidates with --shuttled-by auto', () => {
    expect(() => assertCandidatesNeedAuto({shuttledBy: 'auto', candidates: [900n]})).not.toThrow()
})

test('assertCandidatesNeedAuto accepts no --candidates regardless of --shuttled-by', () => {
    expect(() => assertCandidatesNeedAuto({shuttledBy: 15n})).not.toThrow()
    expect(() => assertCandidatesNeedAuto({})).not.toThrow()
})

test('assertCandidatesNeedAuto rejects --candidates without --shuttled-by auto', () => {
    expect(() => assertCandidatesNeedAuto({candidates: [900n]})).toThrow(
        '--candidates needs --shuttled-by auto.'
    )
    expect(() => assertCandidatesNeedAuto({shuttledBy: 15n, candidates: [900n]})).toThrow(
        '--candidates needs --shuttled-by auto.'
    )
})

test('resolveAutoShuttledBy builds its candidate pool from one getEntities call, not a fetchRow per owned ship', async () => {
    const sl = getLocalShipload()
    const rows = new Map<string, ServerTypes.entity_row>()
    let fetchRowCalls = 0
    const fetchRow = async (id: bigint | number) => {
        fetchRowCalls++
        const row = rows.get(String(id))
        if (!row) throw new Error(`unexpected fetchRow(${id})`)
        return row
    }
    rows.set('1001', {
        id: 1001,
        owner: 'eon.shipload',
        kind: 'workshop',
        item_id: 1,
        coordinates: {x: 0, y: 0},
    } as never)
    const owned = [
        ServerContract.Types.entity_info.from({
            id: 5001,
            owner: 'eggmaple.gm',
            type: 'ship',
            entity_name: 'Owned Ship',
            coordinates: {x: 0, y: 0},
            item_id: 1,
            cargomass: 0,
            cargo: [],
            modules: [{installed: {item_id: 10103, stats: 0}, type: 0}],
            gatherer_lanes: [],
            crafter_lanes: [],
            builder_lanes: [],
            loader_lanes: [],
            lanes: [],
            holds: [],
            projected_at: 0,
        } as never),
    ]
    sl.entities.getEntities = (async () => owned) as typeof sl.entities.getEntities
    sl.influence.getCivicOwner = (async () =>
        Name.from('eon.shipload')) as typeof sl.influence.getCivicOwner
    let craftReq: unknown
    sl.shuttle.craft = (async (req: unknown) => {
        craftReq = req
        return {options: [], auto: undefined, blocked: {code: 'unknown', reason: 'no match'}}
    }) as typeof sl.shuttle.craft
    await resolveAutoShuttledBy(
        sl,
        {entityType: 'ship', entityId: 1003n},
        1001n,
        10001,
        1,
        [{itemId: 101, quantity: 10, stackId: 413333752n, modules: []}],
        [],
        'eggmaple.gm',
        fetchRow
    ).catch(() => {})
    expect(fetchRowCalls).toBe(1)
    expect(craftReq).toMatchObject({shipId: 1003n, workshopId: 1001n})
})
