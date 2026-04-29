import {type Command, InvalidArgumentError} from 'commander'
import {type EntityRef, parseEntityRef} from '../../lib/args'
import {getTableRows} from '../../lib/chain-debug'
import {getChainUrl} from '../../lib/config'

export interface DebugEntityOptions {
    chainUrl: string
    entityType: EntityRef['entityType']
    entityId: bigint
    json: boolean
}

export async function runDebugEntity(opts: DebugEntityOptions): Promise<void> {
    const id = Number(opts.entityId)
    if (!Number.isSafeInteger(id)) {
        throw new InvalidArgumentError(`entity id ${opts.entityId} exceeds safe integer range`)
    }
    const res = await getTableRows({
        chainUrl: opts.chainUrl,
        code: 'shipload.gm',
        scope: 'shipload.gm',
        table: opts.entityType,
        lower_bound: id,
        upper_bound: id,
        limit: 1,
    })
    if (res.rows.length === 0) {
        console.log(`${opts.entityType} ${opts.entityId} not found on chain.`)
        return
    }
    const row = res.rows[0]
    if (opts.json) {
        console.log(JSON.stringify(row, null, 2))
    } else {
        console.log(JSON.stringify(row, null, 2))
    }
}

export function registerSubcommand(parent: Command): void {
    parent
        .command('entity <type:id>')
        .description(
            'Read a single entity row directly from chain (forensic; players use `query entity`)'
        )
        .option('--json', 'emit JSON (default already pretty-prints JSON)', false)
        .action(async (typeId: string, opts: {json: boolean}) => {
            const ref = parseEntityRef(typeId)
            await runDebugEntity({
                chainUrl: getChainUrl(),
                entityType: ref.entityType,
                entityId: ref.entityId,
                json: opts.json,
            })
        })
}
