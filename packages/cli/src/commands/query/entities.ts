import type {Command} from 'commander'
import {type EntityTypeName, parseEntityType} from '../../lib/args'
import {server} from '../../lib/client'
import {renderEntityFull} from '../../lib/entity-header'
import {formatOutput} from '../../lib/format'
import {getAccountName} from '../../lib/session'

interface EntitySummary {
    type: string
    id: bigint
    entity_name: string
    is_idle: boolean
    resolved_count: number
    pending_count: number
}

const COL = {type: 10, id: 4, name: 20, status: 6}

function formatTasks(r: EntitySummary): string {
    const parts: string[] = []
    if (r.pending_count > 0) parts.push(`${r.pending_count} pending`)
    if (r.resolved_count > 0) parts.push(`${r.resolved_count} to resolve`)
    return parts.length > 0 ? parts.join(' · ') : '—'
}

export function renderSummaries(owner: string, rows: EntitySummary[]): string {
    const header = `Entities for ${owner} (${rows.length}):`
    if (rows.length === 0) return header

    const colHeader =
        '  ' +
        [
            'TYPE'.padEnd(COL.type),
            'ID'.padStart(COL.id),
            'NAME'.padEnd(COL.name),
            'STATUS'.padEnd(COL.status),
            'TASKS',
        ].join('   ')

    const lines = [header, '', colHeader]

    for (const r of rows) {
        lines.push(
            '  ' +
                [
                    String(r.type).padEnd(COL.type),
                    String(r.id).padStart(COL.id),
                    (r.entity_name || '—').padEnd(COL.name),
                    (r.is_idle ? 'idle' : 'busy').padEnd(COL.status),
                    formatTasks(r),
                ].join('   ')
        )
    }

    return lines.join('\n')
}

export function renderFull(owner: string, rows: any[]): string {
    const header = `Entities for ${owner} (${rows.length}):`
    if (rows.length === 0) return header
    return [header, ...rows.map((r) => renderEntityFull(r))].join('\n\n')
}

async function runEntities(
    owner: string | undefined,
    type: EntityTypeName | undefined,
    options: {full?: boolean; json?: boolean}
): Promise<void> {
    const target = owner ?? getAccountName()
    const action = options.full ? 'getentities' : 'getsummaries'
    const params: Record<string, unknown> = {owner: target}
    if (type) params.entity_type = type
    const result = (await server.readonly(action, params as unknown as any)) as any
    const rows: any[] = Array.isArray(result) ? result : (result?.entities ?? result)
    if (options.full) {
        console.log(formatOutput(rows, {json: Boolean(options.json)}, (r) => renderFull(target, r)))
    } else {
        console.log(
            formatOutput(rows, {json: Boolean(options.json)}, (r) => renderSummaries(target, r))
        )
    }
}

function registerFiltered(
    program: Command,
    name: string,
    type: EntityTypeName,
    noun: string
): void {
    program
        .command(name)
        .description(`List ${noun} for an owner. Shorthand for \`entities --type ${type}\`.`)
        .argument('[owner]', 'account name')
        .option('--full', 'show full entity state instead of summaries')
        .option('--json', 'emit JSON instead of formatted text')
        .action(async (owner: string | undefined, options: {full?: boolean; json?: boolean}) => {
            await runEntities(owner, type, options)
        })
}

export function register(program: Command): void {
    program
        .command('entities')
        .description('List entities for an owner (defaults to self)')
        .argument('[owner]', 'account name')
        .option('--type <t>', 'filter by entity type (ship/warehouse/container)', parseEntityType)
        .option('--full', 'show full entity state instead of summaries')
        .option('--json', 'emit JSON instead of formatted text')
        .action(
            async (
                owner: string | undefined,
                options: {type?: EntityTypeName; full?: boolean; json?: boolean}
            ) => {
                await runEntities(owner, options.type, options)
            }
        )

    registerFiltered(program, 'ships', 'ship', 'ships')
    registerFiltered(program, 'containers', 'container', 'containers')
    registerFiltered(program, 'warehouses', 'warehouse', 'warehouses')
}
