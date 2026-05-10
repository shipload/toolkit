import {Command} from 'commander'
import type {EntityTypeName} from '../../lib/args'
import {server} from '../../lib/client'
import {renderEntityFull} from '../../lib/entity-header'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {formatOutput} from '../../lib/format'

export function render(info: unknown): string {
    // biome-ignore lint/suspicious/noExplicitAny: readonly response is loosely typed
    return renderEntityFull(info as any)
}

export async function runShow(ctx: EntityContext, options: {json?: boolean}): Promise<void> {
    const data = await server.readonly('getentity', {
        entity_id: ctx.entityId,
    })
    console.log(formatOutput(data, {json: Boolean(options.json)}, render))
}

export async function defaultShow(type: EntityTypeName, id: bigint): Promise<void> {
    await runShow({entityType: type, entityId: id}, {json: false})
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'show',
    description: 'Show full entity state (use --json for raw JSON)',
    appliesTo: ['ship', 'container', 'warehouse'],
    build: (ctx) =>
        new Command('show')
            .description('Show full entity state')
            .option('--json', 'emit JSON instead of formatted text')
            .action(async (opts: {json?: boolean}) => {
                await runShow(ctx, opts)
            }),
}
