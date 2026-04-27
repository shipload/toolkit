import {type Action, Name} from '@wharfkit/antelope'
import {Command} from 'commander'
import type {Types as ServerTypes} from '../../contracts/server'
import {type EntityTypeName, parseCargoInput} from '../../lib/args'
import {type ParsedCargoInput, resolveCargoInputs} from '../../lib/cargo-resolve'
import {getShipload} from '../../lib/client'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {withValidation} from '../../lib/errors'
import {checkResolveEntity} from '../../lib/resolve-prompt'
import {transact} from '../../lib/session'
import {getEntitySnapshot} from '../../lib/snapshot'
import {ValidationError} from '../../lib/validate'
import {maybeAwaitAndPrint, TRACK_OPTION, WAIT_OPTION} from '../../lib/wait'

export interface DeployOpts {
    entityType: EntityTypeName
    entityId: bigint
    packedItemId: number
    stackId: bigint
}

export async function buildAction(opts: DeployOpts): Promise<Action> {
    const shipload = await getShipload()
    return shipload.actions.deploy(
        Name.from(opts.entityType),
        opts.entityId,
        opts.packedItemId,
        opts.stackId
    )
}

interface DeployCliOptions {
    autoResolve?: boolean
    wait?: boolean
    track?: boolean
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
        await checkResolveEntity(ctx.entityType, ctx.entityId, Boolean(options.autoResolve))
        const snap = await getEntitySnapshot(ctx.entityType, ctx.entityId)
        const [resolved] = resolveCargoInputs(
            [input],
            snap.cargo as unknown as ServerTypes.cargo_item[]
        )
        const action = await buildAction({
            entityType: ctx.entityType,
            entityId: ctx.entityId,
            packedItemId: input.itemId,
            stackId: resolved.stackId,
        })
        const result = await transact(
            {action},
            {description: `Deploying from ${ctx.entityType}:${ctx.entityId}`}
        )
        await maybeAwaitAndPrint(ctx.entityType, ctx.entityId, options, result)
    })
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'deploy',
    description: 'Deploy an entity from a packed cargo NFT',
    appliesTo: ['ship'],
    build: (ctx) =>
        new Command('deploy')
            .description('Deploy an entity from a packed cargo NFT')
            .addHelpText('before', 'Requires: packed-entity NFT in cargo; deploy location valid.\n')
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
            .option('--auto-resolve', 'resolve completed tasks on the source entity before acting')
            .addOption(WAIT_OPTION)
            .addOption(TRACK_OPTION)
            .action(async (input: ParsedCargoInput, opts: DeployCliOptions) => {
                await runDeploy(ctx, input, opts)
            }),
}
