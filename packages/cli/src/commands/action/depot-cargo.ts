import {cargoRef, ServerTypes, type Shipload} from '@shipload/sdk'
import type {Action} from '@wharfkit/antelope'
import {Command} from 'commander'
import {accumulateCargoInputs, parseUint64, parseUint64List} from '../../lib/args'
import {projectCargoFromSnapshot} from '../../lib/cargo-projection'
import {
    type ParsedCargoInput,
    type ResolvedCargoInput,
    resolveCargoInputs,
} from '../../lib/cargo-resolve'
import {getShipload} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {withValidation} from '../../lib/errors'
import {getAccountName, transact} from '../../lib/session'
import {resolveShuttleCandidatePool} from '../../lib/shuttle-candidates'
import {formatShuttleReason} from '../../lib/shuttle-reason'
import {getEntityRow, getEntitySnapshot} from '../../lib/snapshot'
import {ValidationError} from '../../lib/validate'
import {maybeAwaitAndPrint, TRACK_OPTION, WAIT_OPTION, type WaitableOptions} from '../../lib/wait'
import {assertCandidatesNeedAuto, parseShuttledBy} from './craftjob'

type Direction = 'store' | 'take'

interface DepotCargoCliOptions extends WaitableOptions {
    shuttledBy?: bigint | 'auto'
    candidates?: bigint[]
}

export interface DepotCargoOpts {
    shipId: bigint
    depotId: bigint
    inputs: ResolvedCargoInput[]
    shuttledBy?: bigint
}

export function toCargoItems(inputs: ResolvedCargoInput[]): ServerTypes.cargo_item[] {
    return inputs.map((i) =>
        ServerTypes.cargo_item.from({
            ...cargoRef({
                item_id: i.itemId,
                stats: i.stackId,
                modules: i.modules,
                entity_id: i.entityId,
            }),
            quantity: i.quantity,
        })
    )
}

export function lockerAsCargo(rows: ServerTypes.depot_stack[]): ServerTypes.cargo_item[] {
    return rows.map(
        (r) =>
            ({
                item_id: r.item_id,
                quantity: r.quantity,
                stats: r.stats,
                modules: r.modules,
                entity_id: r.sequence_id,
            }) as unknown as ServerTypes.cargo_item
    )
}

export async function buildAction(
    direction: Direction,
    opts: DepotCargoOpts,
    shipload?: Shipload
): Promise<Action> {
    const sl = shipload ?? (await getShipload())
    const items = toCargoItems(opts.inputs)
    return direction === 'store'
        ? sl.actions.depotstore(opts.shipId, opts.depotId, items, opts.shuttledBy)
        : sl.actions.depottake(opts.shipId, opts.depotId, items, opts.shuttledBy)
}

async function resolveSource(
    sl: Shipload,
    direction: Direction,
    ctx: EntityContext,
    depotId: bigint,
    inputs: ParsedCargoInput[]
): Promise<ResolvedCargoInput[]> {
    if (direction === 'store') {
        const snap = await getEntitySnapshot(ctx.entityId)
        return resolveCargoInputs(
            inputs,
            projectCargoFromSnapshot(snap) as unknown as ServerTypes.cargo_item[]
        )
    }
    const locker = await sl.entities.getDepot(depotId, getAccountName())
    const hint = `list what you have stored with \`shiploadcli depot ${depotId}\``
    if (locker.rows.length === 0) {
        throw new ValidationError(`You have nothing stored at Depot ${depotId}.`, hint)
    }
    try {
        return resolveCargoInputs(inputs, lockerAsCargo(locker.rows))
    } catch (e) {
        if (e instanceof ValidationError) {
            throw new ValidationError(`Your storage at Depot ${depotId}: ${e.message}`, hint)
        }
        throw e
    }
}

async function resolveAutoShuttledBy(
    sl: Shipload,
    direction: Direction,
    ctx: EntityContext,
    depotId: bigint,
    items: ServerTypes.cargo_item[],
    candidateIds: bigint[]
): Promise<bigint | undefined> {
    const candidates = await resolveShuttleCandidatePool(
        sl,
        depotId,
        ctx.entityId,
        candidateIds,
        getAccountName(),
        getEntityRow
    )
    const req = {shipId: ctx.entityId, depotId, items, candidates}
    const options = direction === 'store' ? await sl.shuttle.store(req) : await sl.shuttle.take(req)
    if (!options.auto) {
        throw new ValidationError(
            options.blocked
                ? formatShuttleReason(options.blocked)
                : 'No shuttle can carry this bundle.',
            "add a Depot id with --candidates, or drop --shuttled-by to use the Depot's own shuttle"
        )
    }
    return options.auto.shuttledBy !== undefined ? BigInt(options.auto.shuttledBy) : undefined
}

export async function runDepotCargo(
    direction: Direction,
    ctx: EntityContext,
    depotId: bigint,
    inputs: ParsedCargoInput[],
    options: DepotCargoCliOptions
): Promise<void> {
    await withValidation(async () => {
        assertCandidatesNeedAuto(options)
        const sl = await getShipload()
        const resolved = await resolveSource(sl, direction, ctx, depotId, inputs)
        const shuttledBy =
            options.shuttledBy === 'auto'
                ? await resolveAutoShuttledBy(
                      sl,
                      direction,
                      ctx,
                      depotId,
                      toCargoItems(resolved),
                      options.candidates ?? []
                  )
                : options.shuttledBy
        const action = await buildAction(
            direction,
            {shipId: ctx.entityId, depotId, inputs: resolved, shuttledBy},
            sl
        )
        const count = resolved.reduce((n, i) => n + i.quantity, 0)
        const result = await transact(
            {action},
            {
                description:
                    direction === 'store'
                        ? `Storing ${count} items from ${ctx.entityType}:${ctx.entityId} at depot ${depotId}`
                        : `Taking ${count} items from depot ${depotId} into ${ctx.entityType}:${ctx.entityId}`,
            }
        )
        await maybeAwaitAndPrint(ctx.entityId, options, result)
    })
}

const SPECS: Record<
    Direction,
    {name: string; summary: string; requires: string; inputHelp: string; example: string}
> = {
    store: {
        name: 'depotstore',
        summary: 'Store cargo at a public Depot',
        requires:
            'Depots are public storage. Any player can store cargo at any Depot, and each player has a private allowance there ' +
            'up to the Depot capacity. Only you can take back what you store.\n' +
            "Requires: this entity holds the cargo and is at the Depot's location. A shuttle carries the cargo: the Depot's " +
            'own bays by default, or the entity named by --shuttled-by.\n',
        inputHelp:
            '<item-id>:<stack-id>:<qty> — cargo to store from this entity. Repeat once per stack.',
        example: `
Examples:
  # Store 10 Ore (item 101, stack 413333752) from ship 6 at Depot 3
  shiploadcli ship 6 depotstore 3 101:413333752:10

  # Let the CLI pick the fastest shuttle
  shiploadcli ship 6 depotstore 3 101:413333752:10 --shuttled-by auto

See stack ids with \`shiploadcli ship N cargo\` and your stored cargo with \`shiploadcli depot N\`.`,
    },
    take: {
        name: 'depottake',
        summary: 'Take your stored cargo back from a public Depot',
        requires:
            'Takes cargo you stored earlier with `depotstore` back into this entity.\n' +
            "Requires: this entity is at the Depot's location and has room for the cargo. A shuttle carries the cargo: the " +
            "Depot's own bays by default, or the entity named by --shuttled-by.\n",
        inputHelp: '<item-id>:<stack-id>:<qty> — stored cargo to take. Repeat once per stack.',
        example: `
Example:
  # Take 10 Ore (item 101, stack 413333752) from Depot 3 into ship 6
  shiploadcli ship 6 depottake 3 101:413333752:10

See your stored cargo and its stack ids with \`shiploadcli depot N\`.`,
    },
}

function depotCargoSubcommand(direction: Direction): EntitySubcommand {
    const spec = SPECS[direction]
    return {
        name: spec.name,
        description: spec.summary,
        appliesTo: ['ship'],
        build: (ctx) =>
            new Command(spec.name)
                .description(spec.summary)
                .addHelpText('before', spec.requires)
                .addHelpText('after', spec.example)
                .argument('<depot-id>', 'entity id of the Depot', parseUint64)
                .argument('<input...>', spec.inputHelp, accumulateCargoInputs)
                .option(
                    '--shuttled-by <id|auto>',
                    'what shuttles the cargo: an entity id, a Depot id for its public bays, or auto ' +
                        "for the fastest; omitted uses the Depot's own shuttle",
                    parseShuttledBy
                )
                .option(
                    '--candidates <ids>',
                    'Depot ids to consider for auto shuttling, comma separated.',
                    parseUint64List
                )
                .addOption(WAIT_OPTION)
                .addOption(TRACK_OPTION)
                .action(
                    async (
                        depotId: bigint,
                        inputs: ParsedCargoInput[],
                        opts: DepotCargoCliOptions
                    ) => {
                        await runDepotCargo(direction, ctx, depotId, inputs, opts)
                    }
                ),
    }
}

export const STORE_SUBCOMMAND = depotCargoSubcommand('store')
export const TAKE_SUBCOMMAND = depotCargoSubcommand('take')
