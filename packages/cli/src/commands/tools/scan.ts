import {cpus} from 'node:os'
import {
    deriveLocationSize,
    deriveLocationStatic,
    deriveResourceStats,
    deriveStratum,
    getItem,
    type LocationType,
} from '@shipload/sdk'
import {Checksum256} from '@wharfkit/antelope'
import {type Command, InvalidArgumentError} from 'commander'
import {Contract as ServerContract} from '../../contracts/server'
import {type EntityRef, parseEntityRef, parseUint32} from '../../lib/args'
import {client, getGameSeed} from '../../lib/client'
import {resolveReach} from '../../lib/reach'
import {Histogram} from '../../lib/scan/histogram'
import {MultiHigh} from '../../lib/scan/multi-high'
import {formatDuration} from '../../lib/scan/progress'
import {
    renderHeader,
    renderHistogram,
    renderLeaderboard,
    renderMultiHigh,
} from '../../lib/scan/report'
import {TopN} from '../../lib/scan/top-n'
import type {LeaderboardEntry, WorkerProgress, WorkerResult} from '../../lib/scan/types'

export interface Coord {
    x: number
    y: number
}

export function enumerateCircle(R: number, center: Coord = {x: 0, y: 0}): Coord[] {
    const R2 = R * R
    const out: Coord[] = []
    for (let x = -R; x <= R; x++) {
        for (let y = -R; y <= R; y++) {
            if (x * x + y * y <= R2) out.push({x: x + center.x, y: y + center.y})
        }
    }
    return out
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
        const server = new ServerContract({client})
        const state = await server.table('state').get()
        if (!state) throw new Error('Server state row not found on chain')
        epochSeed = Checksum256.from(state.seed)
    }

    return {gameSeed, epochSeed}
}

interface ScanOptions {
    threshold: number
    top: number
    workers: number
    json: boolean
    gameSeed?: string
    epochSeed?: string
    center?: Coord
    entityDepth?: number
    entityLabel?: string
    showAll?: boolean
}

export function filterLeaderboardByDepth(
    entries: LeaderboardEntry[],
    depth: number
): LeaderboardEntry[] {
    return entries.filter((e) => e.stratum <= depth)
}

/**
 * Reorder leaderboard so in-depth entries come first, OOD entries last.
 * Stable within each group to preserve the existing stats-based ordering.
 */
export function partitionLeaderboardByDepth(
    entries: LeaderboardEntry[],
    depth: number
): LeaderboardEntry[] {
    const inDepth: LeaderboardEntry[] = []
    const ood: LeaderboardEntry[] = []
    for (const e of entries) {
        if (e.stratum <= depth) inDepth.push(e)
        else ood.push(e)
    }
    return [...inDepth, ...ood]
}

async function runScan(radius: number, options: ScanOptions): Promise<void> {
    const {gameSeed, epochSeed} = await resolveSeeds(options)

    console.error(
        `Resolved seeds. radius=${radius} threshold=${options.threshold} top=${options.top}`
    )
    console.error(`  game seed:  ${String(gameSeed).slice(0, 16)}…`)
    console.error(`  epoch seed: ${String(epochSeed).slice(0, 16)}…`)

    const cells = enumerateCircle(radius, options.center)
    const PARALLEL_THRESHOLD = 1000
    const useParallel = options.workers > 0 && cells.length >= PARALLEL_THRESHOLD
    const actualWorkers = useParallel ? Math.min(options.workers, cells.length) : 0

    console.error(
        `Scanning ${cells.length} cells${
            useParallel ? ` across ${actualWorkers} workers` : ' (single-threaded)'
        }…`
    )

    const histogram = new Histogram()
    const multiHigh = new MultiHigh(options.threshold)
    const leaderboard = new TopN(options.top)
    const locationCounts = {planets: 0, asteroids: 0, nebulas: 0}
    let cellsScanned = 0
    let strataCount = 0
    const startMs = Date.now()

    if (useParallel) {
        const chunkSize = Math.ceil(cells.length / actualWorkers)
        const chunks: Coord[][] = []
        for (let i = 0; i < cells.length; i += chunkSize) {
            chunks.push(cells.slice(i, i + chunkSize))
        }

        const workerProgress = new Array(chunks.length)
            .fill(null)
            .map(() => ({cells: 0, locations: 0, strata: 0}))
        let lastProgressPrint = 0

        function printProgress() {
            let totalCells = 0
            let totalLocs = 0
            let totalStrata = 0
            for (const wp of workerProgress) {
                totalCells += wp.cells
                totalLocs += wp.locations
                totalStrata += wp.strata
            }
            const elapsed = (Date.now() - startMs) / 1000
            const rate = totalCells / Math.max(elapsed, 0.001)
            const remaining = Math.max(0, cells.length - totalCells)
            const eta = remaining / Math.max(rate, 0.001)
            const pct = Math.min(100, Math.floor((totalCells / cells.length) * 100))
            console.error(
                `[${pct}%] ${totalCells}/${cells.length} cells · ${totalLocs} locations · ${totalStrata} strata · elapsed ${formatDuration(elapsed)} · ETA ${formatDuration(eta)}`
            )
        }

        const workerUrl = new URL('../../lib/scan/worker.ts', import.meta.url).href

        const results = await Promise.all(
            chunks.map(
                (chunk, i) =>
                    new Promise<WorkerResult>((resolve, reject) => {
                        const w = new Worker(workerUrl)
                        w.onmessage = (event: MessageEvent<WorkerProgress | WorkerResult>) => {
                            const msg = event.data
                            if (msg.type === 'progress') {
                                workerProgress[i] = {
                                    cells: msg.cellsDone,
                                    locations: msg.locations,
                                    strata: msg.strata,
                                }
                                const now = Date.now()
                                if (now - lastProgressPrint >= 2000) {
                                    lastProgressPrint = now
                                    printProgress()
                                }
                            } else {
                                resolve(msg)
                                w.terminate()
                            }
                        }
                        w.onerror = (err) => {
                            reject(err)
                            w.terminate()
                        }
                        w.postMessage({
                            gameSeed: String(gameSeed),
                            epochSeed: String(epochSeed),
                            cells: chunk,
                            threshold: options.threshold,
                            topN: options.top,
                        })
                    })
            )
        )

        for (const r of results) {
            histogram.mergeSnapshot(r.histogram)
            multiHigh.mergeSnapshot(r.multiHigh)
            leaderboard.mergeEntries(r.leaderboard)
            locationCounts.planets += r.locationCounts.planets
            locationCounts.asteroids += r.locationCounts.asteroids
            locationCounts.nebulas += r.locationCounts.nebulas
            strataCount += r.strataCount
            cellsScanned += r.cellsScanned
        }
    } else {
        let progressCells = 0

        for (const coord of cells) {
            cellsScanned++
            progressCells++

            if (progressCells % 1000 === 0 || progressCells === cells.length) {
                const elapsed = (Date.now() - startMs) / 1000
                const rate = progressCells / Math.max(elapsed, 0.001)
                const remaining = Math.max(0, cells.length - progressCells)
                const eta = remaining / Math.max(rate, 0.001)
                const pct = Math.min(100, Math.floor((progressCells / cells.length) * 100))
                console.error(
                    `[${pct}%] ${progressCells}/${cells.length} cells · ${locationCounts.planets + locationCounts.asteroids + locationCounts.nebulas} locations · ${strataCount} strata · elapsed ${formatDuration(elapsed)} · ETA ${formatDuration(eta)}`
                )
            }

            const loc = deriveLocationStatic(gameSeed, coord)
            const locType = loc.type.toNumber() as LocationType
            if (locType === 0) continue

            switch (locType) {
                case 1:
                    locationCounts.planets++
                    break
                case 2:
                    locationCounts.asteroids++
                    break
                case 3:
                    locationCounts.nebulas++
                    break
            }

            const size = deriveLocationSize(loc)
            if (size === 0) continue

            const subtype = loc.subtype.toNumber()

            for (let stratum = 0; stratum < size; stratum++) {
                const s = deriveStratum(epochSeed, coord, stratum, locType, subtype, size)
                if (s.reserve === 0) continue

                const stats = deriveResourceStats(s.seed)
                strataCount++

                histogram.ingest(stats)
                multiHigh.ingest(stats)

                const itemName = (() => {
                    try {
                        return getItem(s.itemId).name
                    } catch {
                        return `#${s.itemId}`
                    }
                })()

                const entry: LeaderboardEntry = {
                    coord,
                    locType,
                    subtype,
                    itemId: s.itemId,
                    itemName,
                    stratum,
                    richness: s.richness,
                    reserve: s.reserve,
                    stats,
                }
                leaderboard.ingest(entry)
            }
        }
    }

    const runtimeSeconds = (Date.now() - startMs) / 1000
    console.error(
        `Done. ${cellsScanned} cells, ${strataCount} strata, ${runtimeSeconds.toFixed(1)}s`
    )

    const header = {
        gameSeed,
        epochSeed,
        radius,
        cellsTotal: cells.length,
        cellsScanned,
        runtimeSeconds,
        locationCounts,
        strata: strataCount,
        threshold: options.threshold,
    }

    const rawEntries = leaderboard.snapshot()
    // With --entity, we TAG out-of-depth entries rather than drop them so the
    // operator still sees what the scan produced. Default order lists in-depth
    // entries first, OOD last. --all preserves the raw stats-based Top-N order
    // (OOD still tagged) for debugging and parity with prior behaviour.
    const displayedEntries =
        options.entityDepth !== undefined && !options.showAll
            ? partitionLeaderboardByDepth(rawEntries, options.entityDepth as number)
            : rawEntries
    const markDepth = options.entityDepth
    const allOOD =
        options.entityDepth !== undefined &&
        rawEntries.length > 0 &&
        rawEntries.every((e) => e.stratum > (options.entityDepth as number))

    if (options.json) {
        const payload = {
            header: {
                ...header,
                gameSeed: String(gameSeed),
                epochSeed: String(epochSeed),
            },
            histogram: histogram.snapshot(),
            multiHigh: multiHigh.snapshot(),
            leaderboard: displayedEntries,
            reach:
                options.entityDepth !== undefined
                    ? {
                          depth: options.entityDepth,
                          showAll: Boolean(options.showAll),
                          all_ood: allOOD,
                          entity: options.entityLabel,
                      }
                    : undefined,
        }
        console.log(JSON.stringify(payload, null, 2))
    } else {
        console.log(renderHeader(header))
        console.log('')
        console.log(renderHistogram(histogram.snapshot()))
        console.log('')
        console.log(renderMultiHigh(multiHigh.snapshot()))
        console.log('')
        if (allOOD) {
            const entityLabel = options.entityLabel ?? 'entity'
            console.log(
                `All visible strata are out of depth for ${entityLabel} (gatherer depth ${options.entityDepth}).`
            )
            console.log('Consider:')
            console.log(
                `  - upgrading gatherer (aim for depth >= ${(options.entityDepth as number) + 20})`
            )
            console.log('  - using --all to include out-of-depth entries (same list, tagged OOD)')
            console.log('')
        }
        console.log(renderLeaderboard(displayedEntries, options.threshold, markDepth))
        if (options.entityDepth !== undefined) {
            console.log('')
            console.log(`Reach scope: gatherer depth ${options.entityDepth}`)
        }
    }
}

export function registerSubcommand(tools: Command): void {
    tools
        .command('scan')
        .description('Scan resource strata in a radius around the origin')
        .argument('<radius>', 'scan radius in cells', parseUint32)
        .option('--threshold <n>', 'god-roll cutoff', '900')
        .option('--top <n>', 'leaderboard length', '25')
        .option('--workers <n>', 'worker count (0 = single-threaded)', String(cpus().length))
        .option('--json', 'emit JSON instead of formatted report')
        .option('--game-seed <hex>', 'override chain-fetched game seed')
        .option('--epoch-seed <hex>', 'override chain-fetched epoch seed')
        .option('--center <coord>', 'scan center as "x,y" (default "0,0")', (s: string): Coord => {
            const parts = s.split(',')
            if (parts.length !== 2) {
                throw new InvalidArgumentError(`--center must be "x,y" (got "${s}")`)
            }
            const x = Number(parts[0])
            const y = Number(parts[1])
            if (!Number.isInteger(x) || !Number.isInteger(y)) {
                throw new InvalidArgumentError(`--center coords must be integers (got "${s}")`)
            }
            return {x, y}
        })
        .option(
            '--entity <ref>',
            "scope leaderboard to this entity's gatherer depth",
            parseEntityRef
        )
        .option(
            '--all',
            'with --entity, keep raw stats-based order (default partitions in-depth first)'
        )
        .action(
            async (
                radius: number,
                opts: {
                    threshold: string
                    top: string
                    workers: string
                    json?: boolean
                    gameSeed?: string
                    epochSeed?: string
                    center?: Coord
                    entity?: EntityRef
                    all?: boolean
                }
            ) => {
                let center: Coord | undefined = opts.center
                let entityDepth: number | undefined
                let entityLabel: string | undefined
                if (opts.entity) {
                    const reach = await resolveReach(opts.entity)
                    entityDepth = reach.gatherer.depth
                    entityLabel = `${opts.entity.entityType}:${opts.entity.entityId}`
                    if (!center) center = {x: Number(reach.coords.x), y: Number(reach.coords.y)}
                }
                await runScan(radius, {
                    threshold: Number(opts.threshold),
                    top: Number(opts.top),
                    workers: Number(opts.workers),
                    json: Boolean(opts.json),
                    gameSeed: opts.gameSeed,
                    epochSeed: opts.epochSeed,
                    center,
                    entityDepth,
                    entityLabel,
                    showAll: Boolean(opts.all),
                })
            }
        )
}
