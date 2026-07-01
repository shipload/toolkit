import {
    cargoRef,
    type ClusterSlotType,
    EntityClass,
    getEntityClass,
    getLocationType,
    getLocationTypeName,
    getPackedEntityType,
    isLocationBuildable,
    type ServerTypes,
    type Shipload,
} from '@shipload/sdk'
import type {Action} from '@wharfkit/antelope'
import {Command, Option} from 'commander'
import {ALL_ENTITY_TYPES, type EntityTypeName, parseCargoInput} from '../../lib/args'
import {parseModulesJson} from '../../lib/cargo-build'
import {projectCargoFromSnapshot} from '../../lib/cargo-projection'
import {type ParsedCargoInput, resolveCargoInputs} from '../../lib/cargo-resolve'
import {getGameSeed, getShipload} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {withValidation} from '../../lib/errors'
import {projectedCoords} from '../../lib/projection'
import {transact} from '../../lib/session'
import {getEntitySnapshot} from '../../lib/snapshot'
import {ValidationError} from '../../lib/validate'
import {type DeployCell, parseCellOption, resolveDeploySlot} from './deploy-slot'

export interface DeployOpts {
    entityType: EntityTypeName
    entityId: bigint
    packedItemId: number
    stackId: bigint
    modules?: ServerTypes.module_entry[]
    slot?: ClusterSlotType
}

export async function buildAction(opts: DeployOpts, shipload?: Shipload): Promise<Action> {
    const sl = shipload ?? (await getShipload())
    return sl.actions.deploy(
        opts.entityId,
        cargoRef({
            item_id: opts.packedItemId,
            stats: opts.stackId,
            modules: opts.modules ?? [],
        }),
        opts.slot
    )
}

interface DeployCliOptions extends Record<string, unknown> {
    modules?: string
    cell?: DeployCell
}

export async function runDeploy(
    ctx: EntityContext,
    input: ParsedCargoInput,
    options: DeployCliOptions
): Promise<void> {
    await withValidation(async () => {
        if (input.quantity !== 1) {
            throw new ValidationError(
                `deploy expects qty=1 in <input> (packed entities are unique); got ${input.quantity}`
            )
        }
        const snap = await getEntitySnapshot(ctx.entityId)
        const packedEntityType = getPackedEntityType(input.itemId)
        if (
            packedEntityType !== null &&
            getEntityClass(packedEntityType) === EntityClass.OrbitalStructure
        ) {
            const coords = projectedCoords(snap)
            const gameSeed = await getGameSeed()
            if (!isLocationBuildable(gameSeed, coords)) {
                const locType = getLocationType(gameSeed, coords)
                const locLabel = getLocationTypeName(locType)
                throw new ValidationError(
                    `Cannot deploy ${packedEntityType} at (${coords.x}, ${coords.y}): location is ${locLabel}, not a Planet. Buildings can only be deployed at planets — travel to a planet first.`
                )
            }
        }
        if ((snap.loader_lanes ?? []).length === 0) {
            throw new ValidationError(
                `Cannot deploy from ${ctx.entityType}:${ctx.entityId}: host has no loaders installed. ` +
                    `Install a loader module first.`
            )
        }
        const [resolved] = resolveCargoInputs(
            [input],
            projectCargoFromSnapshot(snap) as unknown as ServerTypes.cargo_item[]
        )
        const slot = resolveDeploySlot(input.itemId, options.cell)
        const action = await buildAction({
            entityType: ctx.entityType,
            entityId: ctx.entityId,
            packedItemId: input.itemId,
            stackId: resolved.stackId,
            modules: parseModulesJson(options.modules),
            slot,
        })
        await transact({action}, {description: `Deploying from ${ctx.entityType}:${ctx.entityId}`})
    })
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'deploy',
    description: 'Deploy an entity from a packed cargo item',
    appliesTo: ALL_ENTITY_TYPES,
    build: (ctx) =>
        new Command('deploy')
            .description('Deploy an entity from a packed cargo item')
            .addHelpText(
                'before',
                'Requires: packed entity in cargo; deploy location valid.\n' +
                    'Pass --modules <json> if the packed entity carries modules.\n'
            )
            .addHelpText(
                'after',
                `
Example:
  # Deploy a packed entity (qty is always 1)
  shiploadcli ship 1 deploy 27:888888888:1

Use \`shiploadcli ship N cargo\` to find item-ids and stack-ids.`
            )
            .argument(
                '<input>',
                '<packed-item-id>:<stack-id>:1 — packed entity to deploy from cargo.',
                parseCargoInput
            )
            .addOption(
                new Option(
                    '--modules <json>',
                    'modules vector for the packed entity (JSON array, default [])'
                )
            )
            .option(
                '--cell <hub-id:gx:gy>',
                'deploy a structure into this hub cell (e.g. 5:-1:0)',
                parseCellOption
            )
            .action(async (input: ParsedCargoInput, opts: DeployCliOptions) => {
                await runDeploy(ctx, input, opts)
            }),
}
