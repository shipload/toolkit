import {
    deriveLocationSize,
    deriveLocationStatic,
    deriveResourceStats,
    deriveStratum,
    encodeStats,
    getItem,
    type LocationType,
    type ResourceStats,
    ServerContract,
} from '@shipload/sdk'
import Table from 'cli-table3'
import {Checksum256} from '@wharfkit/antelope'
import {type Command, InvalidArgumentError} from 'commander'
import {type EntityRef, parseEntityRef, parseUint32} from '../../lib/args'
import {client, getGameSeed, server} from '../../lib/client'
import {EXIT} from '../../lib/errors'
import {jsonStringify} from '../../lib/format'
import {formatItemStats} from '../../lib/item-stats'
import {isReachable, resolveReach} from '../../lib/reach'
import {getAccountName} from '../../lib/session'
import type {Coord} from './scan'

export interface FindHit {
    coord: Coord
    stratumIndex: number
    itemId: number
    itemName: string
    reserve: number
    richness: number
    distance: number
    seed: bigint
    stats: ResourceStats
    quality: number
}

export function chebyshevDistance(a: Coord, b: Coord): number {
    return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y))
}

/**
 * Enumerate cells in a filled square of radius R around `center`, sorted by
 * Chebyshev distance from `center` ascending. Ties broken by (dx, dy) to keep
 * the order deterministic.
 */
export function enumerateSpiral(R: number, center: Coord = {x: 0, y: 0}): Coord[] {
    const out: Coord[] = []
    for (let dx = -R; dx <= R; dx++) {
        for (let dy = -R; dy <= R; dy++) {
            out.push({x: center.x + dx, y: center.y + dy})
        }
    }
    out.sort((a, b) => {
        const da = Math.max(Math.abs(a.x - center.x), Math.abs(a.y - center.y))
        const db = Math.max(Math.abs(b.x - center.x), Math.abs(b.y - center.y))
        if (da !== db) return da - db
        const ax = a.x - center.x
        const bx = b.x - center.x
        if (ax !== bx) return ax - bx
        return a.y - center.y - (b.y - center.y)
    })
    return out
}

interface FindOptions {
    resourceId: number
    origin: Coord
    depth: number
    radius: number
    maxResults: number
    gameSeed: Checksum256
    epochSeed: Checksum256
}

export function scanForResource(options: FindOptions): FindHit[] {
    const {resourceId, origin, depth, radius, maxResults, gameSeed, epochSeed} = options
    const cells = enumerateSpiral(radius, origin)
    const hits: FindHit[] = []

    for (const coord of cells) {
        const loc = deriveLocationStatic(gameSeed, coord)
        const locType = loc.type.toNumber() as LocationType
        if (locType === 0) continue
        const size = deriveLocationSize(loc)
        if (size === 0) continue
        const subtype = loc.subtype.toNumber()
        const limit = Math.min(size, depth + 1)

        for (let i = 0; i < limit; i++) {
            const s = deriveStratum(epochSeed, coord, i, locType, subtype, size)
            if (s.reserve === 0) continue
            if (s.itemId !== resourceId) continue
            if (!isReachable(i, depth)) continue

            const itemName = (() => {
                try {
                    return getItem(s.itemId).name
                } catch {
                    return `#${s.itemId}`
                }
            })()

            const stats = deriveResourceStats(s.seed)
            const quality = Math.round((stats.stat1 + stats.stat2 + stats.stat3) / 3)

            hits.push({
                coord,
                stratumIndex: i,
                itemId: s.itemId,
                itemName,
                reserve: s.reserve,
                richness: s.richness,
                distance: chebyshevDistance(origin, coord),
                seed: s.seed,
                stats,
                quality,
            })
        }

        if (hits.length >= maxResults) break
    }

    hits.sort((a, b) => {
        if (a.distance !== b.distance) return a.distance - b.distance
        if (a.stratumIndex !== b.stratumIndex) return a.stratumIndex - b.stratumIndex
        return b.reserve - a.reserve
    })

    return hits.slice(0, maxResults)
}

export function renderFindResult(
    hits: FindHit[],
    resourceId: number,
    origin: Coord,
    entityLabel: string,
    depth: number,
    radius: number
): string {
    const resourceLabel = (() => {
        try {
            return getItem(resourceId).name
        } catch {
            return `#${resourceId}`
        }
    })()
    const header = `Nearest reachable ${resourceLabel} for ${entityLabel} (${hits.length}):`
    const preamble = `  origin ${formatCoord(origin)}, gatherer depth ${depth}, radius ${radius}`

    if (hits.length === 0) {
        return [header, preamble, '', '  (no reachable strata found within radius)'].join('\n')
    }

    const table = new Table({
        head: ['Idx', 'Coord', 'Item', 'Reserve', 'Rich', 'Stats', 'Q', 'Dist'],
        chars: {
            top: '',
            'top-mid': '',
            'top-left': '',
            'top-right': '',
            bottom: '',
            'bottom-mid': '',
            'bottom-left': '',
            'bottom-right': '',
            left: '  ',
            'left-mid': '',
            mid: '',
            'mid-mid': '',
            right: '',
            'right-mid': '',
            middle: '  ',
        },
        style: {
            head: [],
            border: [],
            'padding-left': 0,
            'padding-right': 0,
        },
    })

    for (const hit of hits) {
        const packed = encodeStats([hit.stats.stat1, hit.stats.stat2, hit.stats.stat3])
        const statsLabel = formatItemStats(hit.itemId, packed)
        table.push([
            String(hit.stratumIndex),
            formatCoord(hit.coord),
            hit.itemName,
            String(hit.reserve),
            String(hit.richness),
            statsLabel,
            String(hit.quality),
            String(hit.distance),
        ])
    }

    const tableStr = table
        .toString()
        .split('\n')
        .map((line) => line.trimEnd())
        .join('\n')

    return [header, preamble, '', tableStr].join('\n')
}

function formatCoord(c: Coord): string {
    return `(${c.x}, ${c.y})`
}

async function resolveSeeds(options: {
    gameSeed?: string
    epochSeed?: string
}): Promise<{gameSeed: Checksum256; epochSeed: Checksum256}> {
    const gameSeed = options.gameSeed ? Checksum256.from(options.gameSeed) : await getGameSeed()
    let epochSeed: Checksum256
    if (options.epochSeed) {
        epochSeed = Checksum256.from(options.epochSeed)
    } else {
        const srv = new ServerContract.Contract({client})
        const state = await srv.table('state').get()
        if (!state) throw new Error('Server state row not found on chain')
        epochSeed = Checksum256.from(state.seed)
    }
    return {gameSeed, epochSeed}
}

interface DefaultReachEntityResult {
    entityRef: EntityRef
}

/**
 * Picks a default entity to scope reach calculations against when the user
 * doesn't pass --entity. Reach is only meaningful for entities that move,
 * which today means ships — so this returns the caller's first ship.
 */
async function findDefaultReachEntity(): Promise<DefaultReachEntityResult | null> {
    const result = (await server.readonly('getentities', {
        owner: getAccountName(),
    })) as unknown
    const rows: {type?: string; id?: bigint | number | {toString(): string}}[] = Array.isArray(
        result
    )
        ? (result as {type?: string; id?: bigint | number | {toString(): string}}[])
        : (((result as {entities?: unknown}).entities as {
              type?: string
              id?: bigint | number | {toString(): string}
          }[]) ?? [])
    const ship = rows.find((r) => String(r.type) === 'ship')
    if (!ship || ship.id === undefined) return null
    return {
        entityRef: {entityType: 'ship', entityId: BigInt(ship.id.toString())},
    }
}

export function registerSubcommand(tools: Command): void {
    tools
        .command('find')
        .description('Find nearest reachable strata of a given resource')
        .argument('<resource-id>', 'resource item id', parseUint32)
        .option('--entity <ref>', 'scope reachability to this entity (e.g. ship:1)', parseEntityRef)
        .option(
            '--radius <n>',
            'scan radius in cells (default 30)',
            (v) => {
                const n = Number(v)
                if (!Number.isInteger(n) || n < 0) {
                    throw new InvalidArgumentError(
                        `radius must be a non-negative integer (got "${v}")`
                    )
                }
                return n
            },
            30
        )
        .option(
            '--max-results <n>',
            'stop after N reachable matches (default 10)',
            (v) => {
                const n = Number(v)
                if (!Number.isInteger(n) || n <= 0) {
                    throw new InvalidArgumentError(
                        `max-results must be a positive integer (got "${v}")`
                    )
                }
                return n
            },
            10
        )
        .option('--json', 'emit JSON')
        .option('--game-seed <hex>', 'override chain-fetched game seed')
        .option('--epoch-seed <hex>', 'override chain-fetched epoch seed')
        .action(
            async (
                resourceId: number,
                opts: {
                    entity?: EntityRef
                    radius: number
                    maxResults: number
                    json?: boolean
                    gameSeed?: string
                    epochSeed?: string
                }
            ) => {
                let entityRef: EntityRef
                if (opts.entity) {
                    entityRef = opts.entity
                } else {
                    const fallback = await findDefaultReachEntity()
                    if (!fallback) {
                        console.error(
                            `Error: ${getAccountName()} has no ships; pass --entity <type>:<id> explicitly.`
                        )
                        process.exit(EXIT.USER_ERROR)
                    }
                    entityRef = fallback.entityRef
                }

                const reach = await resolveReach(entityRef)
                const origin: Coord = {
                    x: Number(reach.coords.x),
                    y: Number(reach.coords.y),
                }
                const depth = reach.gatherer.depth
                const {gameSeed, epochSeed} = await resolveSeeds({
                    gameSeed: opts.gameSeed,
                    epochSeed: opts.epochSeed,
                })

                const hits = scanForResource({
                    resourceId,
                    origin,
                    depth,
                    radius: opts.radius,
                    maxResults: opts.maxResults,
                    gameSeed,
                    epochSeed,
                })

                const entityLabel = `${entityRef.entityType}:${entityRef.entityId}`

                if (opts.json) {
                    const payload = {
                        resource_id: resourceId,
                        entity: entityLabel,
                        origin,
                        depth,
                        radius: opts.radius,
                        hits: hits.map((h) => ({
                            x: h.coord.x,
                            y: h.coord.y,
                            stratum_index: h.stratumIndex,
                            item_id: h.itemId,
                            reserve: h.reserve,
                            richness: h.richness,
                            distance: h.distance,
                            stats: {
                                stat1: h.stats.stat1,
                                stat2: h.stats.stat2,
                                stat3: h.stats.stat3,
                            },
                            quality: h.quality,
                            seed: h.seed.toString(),
                        })),
                    }
                    console.log(jsonStringify(payload))
                } else {
                    console.log(
                        renderFindResult(hits, resourceId, origin, entityLabel, depth, opts.radius)
                    )
                }
            }
        )
}
