import {Command} from 'commander'
import {ALL_ENTITY_TYPES, type EntityTypeName} from '../../lib/args'
import {server} from '../../lib/client'
import {counterpartKey, renderEntityFull} from '../../lib/entity-header'
import type {EntityContext, EntitySubcommand} from '../../lib/entity-scope'
import {formatOutput} from '../../lib/format'

export function render(
    info: unknown,
    opts: {current?: boolean; counterparts?: ReadonlyMap<string, any>} = {}
): string {
    // biome-ignore lint/suspicious/noExplicitAny: readonly response is loosely typed
    return renderEntityFull(info as any, {
        suppressWhenDone: Boolean(opts.current),
        counterparts: opts.counterparts,
    })
}

// biome-ignore lint/suspicious/noExplicitAny: readonly response is loosely typed
async function fetchHoldCounterparts(info: any): Promise<Map<string, any>> {
    const out = new Map<string, any>()
    const refs = new Map<string, {type: string; id: bigint}>()
    for (const hold of info?.holds ?? []) {
        const type = String(hold.counterpart.entity_type)
        const id = BigInt(String(hold.counterpart.entity_id))
        refs.set(counterpartKey(type, id), {type, id})
    }
    await Promise.all(
        [...refs].map(async ([key, ref]) => {
            try {
                out.set(key, await server.readonly('getentity', {entity_id: ref.id}))
            } catch {
                // counterpart unreadable — the hold still renders with its raw ref
            }
        })
    )
    return out
}

export async function runShow(
    ctx: EntityContext,
    options: {json?: boolean; current?: boolean}
): Promise<void> {
    const data = await server.readonly('getentity', {
        entity_id: ctx.entityId,
    })
    const counterparts = options.json ? undefined : await fetchHoldCounterparts(data)
    console.log(
        formatOutput(data, {json: Boolean(options.json)}, (info) =>
            render(info, {current: options.current, counterparts})
        )
    )
}

export async function defaultShow(type: EntityTypeName, id: bigint): Promise<void> {
    await runShow({entityType: type, entityId: id}, {json: false})
}

export const SUBCOMMAND: EntitySubcommand = {
    name: 'show',
    description: 'Show full entity state (use --json for raw JSON)',
    appliesTo: ALL_ENTITY_TYPES,
    build: (ctx) =>
        new Command('show')
            .description('Show full entity state')
            .option('--json', 'emit JSON instead of formatted text')
            .option('--current', 'show on-chain state without applying the pending task queue')
            .action(async (opts: {json?: boolean; current?: boolean}) => {
                await runShow(ctx, opts)
            }),
}
