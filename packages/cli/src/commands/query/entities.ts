import type {Command} from 'commander'
import type {ServerTypes} from '@shipload/sdk'
import {ALL_ENTITY_TYPES, type EntityTypeName, parseEntityType, parseUint32} from '../../lib/args'
import {getShipload, server} from '../../lib/client'
import {renderEntityFull} from '../../lib/entity-header'
import {formatOutput} from '../../lib/format'
import {getAccountName} from '../../lib/session'
import {getEntitiesSnapshot} from '../../lib/snapshot'

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

interface GlobalEntityLine {
    id: string
    kind: string
    owner: string
    entity_name: string
    coord: string
}

function toGlobalLine(e: ServerTypes.entity_row): GlobalEntityLine {
    const z = e.coordinates.z?.toNumber()
    const coord =
        z === undefined
            ? `${e.coordinates.x},${e.coordinates.y}`
            : `${e.coordinates.x},${e.coordinates.y},${z}`
    return {
        id: String(e.id),
        kind: e.kind.toString(),
        owner: e.owner.toString(),
        entity_name: e.name,
        coord,
    }
}

const GCOL = {id: 5, kind: 10, owner: 13, name: 20}

export function renderGlobal(lines: GlobalEntityLine[], limit?: number): string {
    const header = `All entities (${lines.length}):`
    if (lines.length === 0) return header
    const shown = limit && lines.length > limit ? lines.slice(0, limit) : lines
    const colHeader =
        '  ' +
        [
            'ID'.padStart(GCOL.id),
            'TYPE'.padEnd(GCOL.kind),
            'OWNER'.padEnd(GCOL.owner),
            'NAME'.padEnd(GCOL.name),
            'COORD',
        ].join('   ')
    const out = [header, '', colHeader]
    for (const l of shown) {
        out.push(
            '  ' +
                [
                    l.id.padStart(GCOL.id),
                    l.kind.padEnd(GCOL.kind),
                    l.owner.padEnd(GCOL.owner),
                    (l.entity_name || '—').padEnd(GCOL.name),
                    l.coord,
                ].join('   ')
        )
    }
    if (shown.length < lines.length) {
        out.push('', `  … ${lines.length - shown.length} more (use --json for the full set)`)
    }
    return out.join('\n')
}

async function runAllEntities(
    type: EntityTypeName | undefined,
    options: {json?: boolean; limit?: number}
): Promise<void> {
    const shipload = await getShipload()
    const rows = await shipload.entities.getAllEntities(type)
    const lines = rows.map(toGlobalLine)
    console.log(
        formatOutput(lines, {json: Boolean(options.json)}, (l) => renderGlobal(l, options.limit))
    )
}

async function runEntities(
    owner: string | undefined,
    type: EntityTypeName | undefined,
    options: {full?: boolean; json?: boolean; all?: boolean; limit?: number}
): Promise<void> {
    if (options.all) {
        await runAllEntities(type, options)
        return
    }
    const target = owner ?? getAccountName()
    let result: unknown
    if (options.full) {
        result = await getEntitiesSnapshot(target, type)
    } else {
        const params: Record<string, unknown> = {owner: target}
        if (type) params.entity_type = type
        result = await server.readonly('getsummaries', params as unknown as never)
    }
    const rows: any[] = Array.isArray(result) ? result : ((result as any)?.entities ?? result)
    if (options.full) {
        console.log(formatOutput(rows, {json: Boolean(options.json)}, (r) => renderFull(target, r)))
    } else {
        console.log(
            formatOutput(rows, {json: Boolean(options.json)}, (r) => renderSummaries(target, r))
        )
    }
}

function registerFiltered(program: Command, name: string, type: EntityTypeName): void {
    program
        .command(name)
        .description(`List ${name} for an owner. Shorthand for \`entities --type ${type}\`.`)
        .argument('[owner]', 'account name')
        .option('--all', 'list across all players (ignores owner)')
        .option('--limit <n>', 'cap rows shown with --all (text only)', parseUint32)
        .option('--full', 'show full entity state instead of summaries')
        .option('--json', 'emit JSON instead of formatted text')
        .action(
            async (
                owner: string | undefined,
                options: {full?: boolean; json?: boolean; all?: boolean; limit?: number}
            ) => {
                await runEntities(owner, type, options)
            }
        )
}

export function register(program: Command): void {
    program
        .command('entities')
        .description('List entities for an owner (defaults to self)')
        .argument('[owner]', 'account name')
        .option(
            '--type <t>',
            `filter by entity type (${ALL_ENTITY_TYPES.join('/')})`,
            parseEntityType
        )
        .option('--all', 'list across all players (ignores owner)')
        .option('--limit <n>', 'cap rows shown with --all (text only)', parseUint32)
        .option('--full', 'show full entity state instead of summaries')
        .option('--json', 'emit JSON instead of formatted text')
        .action(
            async (
                owner: string | undefined,
                options: {
                    type?: EntityTypeName
                    full?: boolean
                    json?: boolean
                    all?: boolean
                    limit?: number
                }
            ) => {
                await runEntities(owner, options.type, options)
            }
        )

    for (const type of ALL_ENTITY_TYPES) {
        registerFiltered(program, PLURAL[type], type)
    }
}

const PLURAL: Record<EntityTypeName, string> = {
    ship: 'ships',
    container: 'containers',
    warehouse: 'warehouses',
    extractor: 'extractors',
    factory: 'factories',
    mdriver: 'massdrivers',
    mcatcher: 'masscatchers',
    nexus: 'nexuses',
    plot: 'plots',
}
