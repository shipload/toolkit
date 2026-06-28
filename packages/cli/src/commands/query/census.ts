import type {Command} from 'commander'
import {InvalidArgumentError} from 'commander'
import type {ServerTypes} from '@shipload/sdk'
import {getShipload} from '../../lib/client'
import {formatOutput} from '../../lib/format'
import {parseEntityType, type EntityTypeName} from '../../lib/args'

export type CensusDimension = 'owner' | 'kind' | 'coord'

export interface CensusInputRow {
    owner: string
    kind: string
    x: number
    y: number
    z?: number
}

export interface CensusGroup {
    key: string
    total: number
    byKind: Record<string, number>
}

export interface CensusSummary {
    totalEntities: number
    owners: number
    coordinates: number
    byKind: Record<string, number>
}

export function coordKey(r: {x: number; y: number; z?: number}): string {
    return r.z === undefined ? `${r.x},${r.y}` : `${r.x},${r.y},${r.z}`
}

function sortedKindEntries(byKind: Record<string, number>): [string, number][] {
    return Object.entries(byKind).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

export function buildCensus(rows: CensusInputRow[], by: CensusDimension): CensusGroup[] {
    const groups = new Map<string, CensusGroup>()
    for (const row of rows) {
        const key = by === 'owner' ? row.owner : by === 'kind' ? row.kind : coordKey(row)
        let group = groups.get(key)
        if (!group) {
            group = {key, total: 0, byKind: {}}
            groups.set(key, group)
        }
        group.total += 1
        group.byKind[row.kind] = (group.byKind[row.kind] ?? 0) + 1
    }
    return [...groups.values()].sort((a, b) => b.total - a.total || a.key.localeCompare(b.key))
}

export function buildSummary(rows: CensusInputRow[]): CensusSummary {
    const owners = new Set<string>()
    const coordinates = new Set<string>()
    const byKind: Record<string, number> = {}
    for (const row of rows) {
        owners.add(row.owner)
        coordinates.add(coordKey(row))
        byKind[row.kind] = (byKind[row.kind] ?? 0) + 1
    }
    return {totalEntities: rows.length, owners: owners.size, coordinates: coordinates.size, byKind}
}

const DIMENSION_NOUN: Record<CensusDimension, string> = {
    owner: 'owners',
    kind: 'kinds',
    coord: 'coordinates',
}

export function renderCensusGroups(
    groups: CensusGroup[],
    by: CensusDimension,
    totalEntities: number
): string {
    const header = `Census by ${by} (${groups.length} ${DIMENSION_NOUN[by]}, ${totalEntities} entities):`
    if (groups.length === 0) return header
    const keyWidth = Math.max(by.length, ...groups.map((g) => g.key.length))
    const lines = [header, '']
    for (const group of groups) {
        const breakdown =
            by === 'kind'
                ? ''
                : `  (${sortedKindEntries(group.byKind)
                      .map(([k, n]) => `${k} ${n}`)
                      .join(', ')})`
        lines.push(
            `  ${group.key.padEnd(keyWidth)}  ${String(group.total).padStart(4)}${breakdown}`
        )
    }
    return lines.join('\n')
}

export function renderSummary(summary: CensusSummary): string {
    const lines = [
        `Census: ${summary.totalEntities} entities across ${summary.owners} owners at ${summary.coordinates} coordinates`,
        '',
        'By kind:',
    ]
    for (const [kind, count] of sortedKindEntries(summary.byKind)) {
        lines.push(`  ${kind.padEnd(12)}  ${String(count).padStart(4)}`)
    }
    return lines.join('\n')
}

function parseDimension(value: string): CensusDimension {
    if (value === 'owner' || value === 'kind' || value === 'coord') return value
    throw new InvalidArgumentError('--by must be one of: owner, kind, coord')
}

function toCensusRow(entity: ServerTypes.entity_row): CensusInputRow {
    return {
        owner: entity.owner.toString(),
        kind: entity.kind.toString(),
        x: entity.coordinates.x.toNumber(),
        y: entity.coordinates.y.toNumber(),
        z: entity.coordinates.z?.toNumber(),
    }
}

interface CensusOptions {
    by?: CensusDimension
    owner?: string
    type?: EntityTypeName
    json?: boolean
}

export function register(program: Command): void {
    program
        .command('census')
        .description('Aggregate entity counts across all players from a single global scan')
        .option('--by <dimension>', 'group counts by owner, kind, or coord', parseDimension)
        .option('--owner <account>', 'restrict to a single owner')
        .option('--type <t>', 'filter by entity type', parseEntityType)
        .option('--json', 'emit JSON instead of formatted text')
        .action(async (opts: CensusOptions) => {
            const shipload = await getShipload()
            const entities = await shipload.entities.getAllEntities(opts.type)
            let rows = entities.map(toCensusRow)
            if (opts.owner) {
                rows = rows.filter((r) => r.owner === opts.owner)
            }
            const json = Boolean(opts.json)
            if (opts.by) {
                const by = opts.by
                const groups = buildCensus(rows, by)
                console.log(
                    formatOutput(groups, {json}, () => renderCensusGroups(groups, by, rows.length))
                )
            } else {
                const summary = buildSummary(rows)
                console.log(formatOutput(summary, {json}, renderSummary))
            }
        })
}
