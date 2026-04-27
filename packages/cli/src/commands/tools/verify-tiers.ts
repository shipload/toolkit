import {
    deriveLocationSize,
    deriveLocationStatic,
    deriveStratum,
    type LocationType,
    RESERVE_TIERS,
    type ReserveTier,
} from '@shipload/sdk'
import {Checksum256} from '@wharfkit/antelope'
import type {Command} from 'commander'
import {Contract as ServerContract} from '../../contracts/server'
import {parseUint32} from '../../lib/args'
import {client, getGameSeed} from '../../lib/client'

export interface TierCounts {
    small: number
    medium: number
    large: number
    massive: number
    motherlode: number
}

export interface AnalysisResult {
    counts: TierCounts
    yielded: number
    inGap: number
    maxReserve: number
    totalCells: number
    nonEmpty: number
    strata: number
}

function classifyReserve(reserve: number): ReserveTier | null {
    for (const tier of ['small', 'medium', 'large', 'massive', 'motherlode'] as ReserveTier[]) {
        const r = RESERVE_TIERS[tier]
        if (reserve >= r.min && reserve <= r.max) return tier
    }
    return null
}

export function analyse(
    gameSeed: Checksum256,
    epochSeed: Checksum256,
    radius: number
): AnalysisResult {
    const counts: TierCounts = {small: 0, medium: 0, large: 0, massive: 0, motherlode: 0}
    let yielded = 0
    let inGap = 0
    let maxReserve = 0
    let totalCells = 0
    let nonEmpty = 0
    let strata = 0
    const R2 = radius * radius

    for (let x = -radius; x <= radius; x++) {
        for (let y = -radius; y <= radius; y++) {
            if (x * x + y * y > R2) continue
            totalCells++

            const loc = deriveLocationStatic(gameSeed, {x, y})
            const locType = loc.type.toNumber() as LocationType
            if (locType === 0) continue
            nonEmpty++

            const size = deriveLocationSize(loc)
            if (size === 0) continue

            const subtype = loc.subtype.toNumber()

            for (let stratum = 0; stratum < size; stratum++) {
                const s = deriveStratum(epochSeed, {x, y}, stratum, locType, subtype, size)
                strata++
                if (s.reserve === 0) continue

                yielded++
                if (s.reserve > maxReserve) maxReserve = s.reserve

                const tier = classifyReserve(s.reserve)
                if (tier === null) {
                    inGap++
                } else {
                    counts[tier]++
                }
            }
        }
    }

    return {counts, yielded, inGap, maxReserve, totalCells, nonEmpty, strata}
}

export function render(radius: number, result: AnalysisResult): string {
    const lines = [
        `Verify Tiers (radius=${radius}):`,
        `  cells:       ${result.totalCells}`,
        `  non-empty:   ${result.nonEmpty}`,
        `  strata:      ${result.strata}`,
        `  yielded:     ${result.yielded}`,
        `  max reserve: ${result.maxReserve}`,
        `  in gap:      ${result.inGap}${result.inGap > 0 ? ' (reserves outside defined tier ranges)' : ''}`,
        '',
        'Tier distribution:',
    ]
    for (const tier of ['small', 'medium', 'large', 'massive', 'motherlode'] as ReserveTier[]) {
        const r = RESERVE_TIERS[tier]
        lines.push(`  ${tier.padEnd(11)} [${r.min}-${r.max}]: ${result.counts[tier]}`)
    }
    return lines.join('\n')
}

async function resolveEpochSeed(): Promise<Checksum256> {
    const server = new ServerContract({client})
    const state = await server.table('state').get()
    if (!state) throw new Error('Server state row not found on chain')
    return Checksum256.from(state.seed)
}

export function registerSubcommand(tools: Command): void {
    tools
        .command('verify-tiers')
        .description('Verify world-gen produces reserves matching RESERVE_TIERS ranges')
        .option('--radius <n>', 'scan radius', '200')
        .action(async (opts: {radius: string}) => {
            const radius = parseUint32(opts.radius)
            const gameSeed = await getGameSeed()
            const epochSeed = await resolveEpochSeed()
            console.error(`game seed:  ${String(gameSeed).slice(0, 16)}…`)
            console.error(`epoch seed: ${String(epochSeed).slice(0, 16)}…`)
            console.error(`radius:     ${radius}`)
            const result = analyse(gameSeed, epochSeed, radius)
            console.log(render(radius, result))
        })
}
