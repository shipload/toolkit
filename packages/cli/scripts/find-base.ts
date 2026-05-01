#!/usr/bin/env bun
/**
 * Find well-balanced base locations.
 *
 * Walks a wide circle around origin, derives (locType, subtype, size) per cell
 * from the game seed, then for each non-empty cell scores its neighborhood by:
 *   - per-category MAX depth of any location nearby (Ore/Crystal/Gas/Regolith/Biomass)
 *   - score = min across the 5 categories (the "weakest leg")
 *   - tiebreak = sum across the 5 categories
 *
 * Usage:
 *   bun run scripts/find-base.ts <scan-radius> <neighborhood-radius> [--top N] [--min-size N]
 *
 * Defaults: scan-radius=50, neighborhood-radius=5, top=20, min-size=500
 */

import {deriveLocationSize, deriveLocationStatic, LocationType} from '@shipload/sdk'
import {getGameSeed} from '../src/lib/client'

const args = process.argv.slice(2)
const scanRadius = Number(args[0] ?? 50)
const neighRadius = Number(args[1] ?? 5)
const topN = Number(getFlag('--top') ?? 20)
const minSize = Number(getFlag('--min-size') ?? 500)

function getFlag(name: string): string | undefined {
    const idx = args.indexOf(name)
    if (idx >= 0 && idx + 1 < args.length) return args[idx + 1]
    return undefined
}

// Resource categories (5)
const CATEGORIES = ['Ore', 'Crystal', 'Gas', 'Regolith', 'Biomass'] as const
type Category = (typeof CATEGORIES)[number]

// Per location archetype: which categories it provides.
// (from toolkit/packages/sdk/src/derivation/resources.ts location-resource lists)
//   Asteroid: 101,102,103,201,202 -> Ore, Crystal
//   Nebula:   202,203,301,302,303 -> Crystal, Gas
//   Planet 0 Gas Giant:   301,302,303,401,501 -> Gas, Regolith, Biomass
//   Planet 1 Rocky:       101,102,103,401,402,403,503 -> Ore, Regolith, Biomass
//   Planet 2 Terrestrial: 201,202,401,402,501,502,503 -> Crystal, Regolith, Biomass
//   Planet 3 Icy:         101,301,302,401,403,501,502 -> Ore, Gas, Regolith, Biomass
//   Planet 4 Ocean:       201,203,301,303,501,502,503 -> Crystal, Gas, Biomass
//   Planet 5 Industrial:  101,102,103,201,203,402,403 -> Ore, Crystal, Regolith

type ArchetypeKey = string // e.g. "P:0", "A", "N"
const ARCHETYPE_LABEL: Record<ArchetypeKey, string> = {
    A: 'Asteroid',
    N: 'Nebula',
    'P:0': 'Planet/GasGiant',
    'P:1': 'Planet/Rocky',
    'P:2': 'Planet/Terrestrial',
    'P:3': 'Planet/Icy',
    'P:4': 'Planet/Ocean',
    'P:5': 'Planet/Industrial',
}

const ARCHETYPE_CATEGORIES: Record<ArchetypeKey, Category[]> = {
    A: ['Ore', 'Crystal'],
    N: ['Crystal', 'Gas'],
    'P:0': ['Gas', 'Regolith', 'Biomass'],
    'P:1': ['Ore', 'Regolith', 'Biomass'],
    'P:2': ['Crystal', 'Regolith', 'Biomass'],
    'P:3': ['Ore', 'Gas', 'Regolith', 'Biomass'],
    'P:4': ['Crystal', 'Gas', 'Biomass'],
    'P:5': ['Ore', 'Crystal', 'Regolith'],
}

function archetypeKey(locType: LocationType, subtype: number): ArchetypeKey {
    if (locType === LocationType.ASTEROID) return 'A'
    if (locType === LocationType.NEBULA) return 'N'
    if (locType === LocationType.PLANET) return `P:${subtype}`
    return '?'
}

interface Loc {
    x: number
    y: number
    arch: ArchetypeKey
    size: number
}

console.error(`Resolving game seed…`)
const gameSeed = await getGameSeed()
console.error(`  game seed: ${String(gameSeed).slice(0, 16)}…`)
console.error(`Scanning radius=${scanRadius}, neighborhood=${neighRadius}, min-size=${minSize}`)

// Step 1: enumerate all non-empty locations in the scan radius
const locs: Loc[] = []
const R2 = scanRadius * scanRadius
const startMs = Date.now()
let cellsScanned = 0
let lastReport = 0
const totalCells = (2 * scanRadius + 1) * (2 * scanRadius + 1) // upper bound
for (let x = -scanRadius; x <= scanRadius; x++) {
    for (let y = -scanRadius; y <= scanRadius; y++) {
        if (x * x + y * y > R2) continue
        cellsScanned++
        const loc = deriveLocationStatic(gameSeed, {x, y})
        const lt = loc.type.toNumber() as LocationType
        if (lt === LocationType.EMPTY) continue
        const size = deriveLocationSize(loc)
        if (size < minSize) continue
        locs.push({
            x,
            y,
            arch: archetypeKey(lt, loc.subtype.toNumber()),
            size,
        })
        if (Date.now() - lastReport > 1000) {
            console.error(
                `  scanned ${cellsScanned}/${totalCells} cells, found ${locs.length} locations…`
            )
            lastReport = Date.now()
        }
    }
}
console.error(
    `Found ${locs.length} non-empty locations in ${((Date.now() - startMs) / 1000).toFixed(1)}s`
)

// Distribution by archetype
const archCount: Record<string, number> = {}
for (const l of locs) archCount[l.arch] = (archCount[l.arch] ?? 0) + 1
console.error('')
console.error('Archetype distribution:')
for (const k of Object.keys(ARCHETYPE_LABEL)) {
    console.error(
        `  ${ARCHETYPE_LABEL[k].padEnd(20)} ${(archCount[k] ?? 0).toString().padStart(5)}`
    )
}
console.error('')

// Step 2: score each cell within scan radius (or just origin-relative)
// We score every cell that is itself non-empty (you'd want your base ON a system).
// Actually — a base cell could be ANY cell in the scan area; you don't need a system there.
// Let's score every cell, then let the user pick.
//
// For each candidate (cx, cy), look at all locs within `neighRadius` (Euclidean), and
// compute per-category max depth + min across categories.
const NR2 = neighRadius * neighRadius

interface Score {
    x: number
    y: number
    perCatMaxDepth: Record<Category, number>
    perCatSecondDepth: Record<Category, number>
    nearbyArchetypes: Set<ArchetypeKey>
    nearbyCount: number
    sumDepth: number
    minCatDepth: number
    minCatSecond: number
    sumCatDepth: number
    coveredCats: number
    coveredCatsTwice: number
    bigLocs: number // count of nearby locations with size >= 30000
}

const scored: Score[] = []

// Build a coord index for O(1) skip on empty bg cells.
// Actually a brute scan over locs[] is fine — locs is small (<~few hundred).

for (let cx = -scanRadius; cx <= scanRadius; cx++) {
    for (let cy = -scanRadius; cy <= scanRadius; cy++) {
        if (cx * cx + cy * cy > R2) continue

        // Track ALL contributions per category so we can compute "second best"
        const perCatAll: Record<Category, number[]> = {
            Ore: [],
            Crystal: [],
            Gas: [],
            Regolith: [],
            Biomass: [],
        }
        const archs = new Set<ArchetypeKey>()
        let count = 0
        let sumDepth = 0
        let bigLocs = 0

        for (const l of locs) {
            const dx = l.x - cx
            const dy = l.y - cy
            if (dx * dx + dy * dy > NR2) continue
            count++
            sumDepth += l.size
            if (l.size >= 30000) bigLocs++
            archs.add(l.arch)
            for (const cat of ARCHETYPE_CATEGORIES[l.arch]) {
                perCatAll[cat].push(l.size)
            }
        }

        const perCatMax: Record<Category, number> = {
            Ore: 0,
            Crystal: 0,
            Gas: 0,
            Regolith: 0,
            Biomass: 0,
        }
        const perCatSecond: Record<Category, number> = {
            Ore: 0,
            Crystal: 0,
            Gas: 0,
            Regolith: 0,
            Biomass: 0,
        }
        for (const cat of CATEGORIES) {
            const sorted = perCatAll[cat].sort((a, b) => b - a)
            perCatMax[cat] = sorted[0] ?? 0
            perCatSecond[cat] = sorted[1] ?? 0
        }

        const maxes = Object.values(perCatMax)
        const seconds = Object.values(perCatSecond)
        const minCat = Math.min(...maxes)
        const minSecond = Math.min(...seconds)
        const sumCat = maxes.reduce((a, b) => a + b, 0)
        const covered = maxes.filter((v) => v > 0).length
        const coveredTwice = seconds.filter((v) => v > 0).length

        scored.push({
            x: cx,
            y: cy,
            perCatMaxDepth: perCatMax,
            perCatSecondDepth: perCatSecond,
            nearbyArchetypes: archs,
            nearbyCount: count,
            sumDepth,
            minCatDepth: minCat,
            minCatSecond: minSecond,
            sumCatDepth: sumCat,
            coveredCats: covered,
            coveredCatsTwice: coveredTwice,
            bigLocs,
        })
    }
}

// Sort: lexicographic on
//   1. covered cats (all 5 = required for "balanced")
//   2. covered TWICE (redundancy — multiple sources per category)
//   3. min second-best per category (the "weakest second source")
//   4. min best-per-category (the "weakest single source")
//   5. count of nearby big locations (size>=30000) — favors dense clusters
//   6. sum of best-per-category (overall depth budget)
scored.sort((a, b) => {
    if (a.coveredCats !== b.coveredCats) return b.coveredCats - a.coveredCats
    if (a.coveredCatsTwice !== b.coveredCatsTwice) return b.coveredCatsTwice - a.coveredCatsTwice
    if (a.minCatSecond !== b.minCatSecond) return b.minCatSecond - a.minCatSecond
    if (a.minCatDepth !== b.minCatDepth) return b.minCatDepth - a.minCatDepth
    if (a.bigLocs !== b.bigLocs) return b.bigLocs - a.bigLocs
    return b.sumCatDepth - a.sumCatDepth
})

// Cluster dedupe: collapse near-identical centers (within neighRadius/2 of an
// already-kept candidate) so the leaderboard shows distinct clusters, not 12
// adjacent cells with the same neighborhood set.
const dedupeR = Math.max(1, Math.floor(neighRadius / 2))
const dedupeR2 = dedupeR * dedupeR
const distinct: Score[] = []
for (const s of scored) {
    let near = false
    for (const k of distinct) {
        const dx = s.x - k.x
        const dy = s.y - k.y
        if (dx * dx + dy * dy <= dedupeR2) {
            near = true
            break
        }
    }
    if (!near) distinct.push(s)
    if (distinct.length >= topN) break
}

// Print top N
console.error(
    `Top ${distinct.length} distinct candidate clusters (neighborhood R=${neighRadius}, dedupe R=${dedupeR}):`
)
console.error('  cats   = categories covered by ≥1 nearby location (max 5)')
console.error('  cats2  = categories covered by ≥2 nearby locations (redundancy)')
console.error('  min2   = min over categories of 2nd-best location depth (weakest backup)')
console.error('  min1   = min over categories of best location depth (weakest single)')
console.error('  big    = count of nearby locations with size ≥ 30000')
console.error('')

const header = [
    'rank'.padEnd(4),
    '(x, y)'.padEnd(12),
    'cats'.padStart(4),
    'cats2'.padStart(5),
    'min2'.padStart(7),
    'min1'.padStart(7),
    'big'.padStart(3),
    'near'.padStart(4),
    'Ore'.padStart(6),
    'Crystal'.padStart(7),
    'Gas'.padStart(6),
    'Regolith'.padStart(8),
    'Biomass'.padStart(7),
].join(' ')
console.log(header)
console.log('-'.repeat(header.length))

for (let i = 0; i < distinct.length; i++) {
    const s = distinct[i]
    const row = [
        String(i + 1).padEnd(4),
        `(${s.x}, ${s.y})`.padEnd(12),
        String(s.coveredCats).padStart(4),
        String(s.coveredCatsTwice).padStart(5),
        String(s.minCatSecond).padStart(7),
        String(s.minCatDepth).padStart(7),
        String(s.bigLocs).padStart(3),
        String(s.nearbyCount).padStart(4),
        String(s.perCatMaxDepth.Ore).padStart(6),
        String(s.perCatMaxDepth.Crystal).padStart(7),
        String(s.perCatMaxDepth.Gas).padStart(6),
        String(s.perCatMaxDepth.Regolith).padStart(8),
        String(s.perCatMaxDepth.Biomass).padStart(7),
    ].join(' ')
    console.log(row)
}

// Dump nearby locations for the top 3 picks.
const detailN = Math.min(3, distinct.length)
for (let i = 0; i < detailN; i++) {
    const top = distinct[i]
    console.log('')
    console.log(`#${i + 1} — locations within R=${neighRadius} of (${top.x}, ${top.y}):`)
    const nearby = locs
        .map((l) => ({
            ...l,
            dist: Math.sqrt((l.x - top.x) ** 2 + (l.y - top.y) ** 2),
        }))
        .filter((l) => l.dist <= neighRadius)
        .sort((a, b) => b.size - a.size)
    for (const n of nearby) {
        console.log(
            `  (${n.x}, ${n.y})`.padEnd(14) +
                `  d=${n.dist.toFixed(2).padStart(5)}` +
                `  size=${String(n.size).padStart(5)}` +
                `  ${ARCHETYPE_LABEL[n.arch].padEnd(20)}` +
                `  ${ARCHETYPE_CATEGORIES[n.arch].join('/')}`
        )
    }
}
