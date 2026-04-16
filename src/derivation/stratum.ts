import {Bytes, Checksum256, Checksum256Type} from '@wharfkit/antelope'
import {hash512} from '../utils/hash'
import {Coordinates, CoordinatesType} from '../types'
import {
    depthScaleFactor,
    getEligibleResources,
    getResourceWeight,
    YIELD_THRESHOLD,
} from './resources'

export interface StratumInfo {
    itemId: number
    seed: bigint
    richness: number
    reserve: number
}

export interface ResourceStats {
    stat1: number
    stat2: number
    stat3: number
}

export function deriveStratum(
    epochSeed: Checksum256Type,
    coords: CoordinatesType,
    stratum: number,
    locationType: number,
    subtype: number,
    _maxDepth: number
): StratumInfo {
    const seed = Checksum256.from(epochSeed)
    const c = Coordinates.from(coords)
    const input = `stratum-${c.x}-${c.y}-${stratum}`
    const hashResult = hash512(seed, input)
    const bytes = hashResult.array

    const rawReserve = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0

    let reserve = 0
    if (rawReserve <= YIELD_THRESHOLD) {
        const baseReserve = (rawReserve % 333) + 1
        const scale = depthScaleFactor(stratum)
        reserve = Math.floor(baseReserve * scale)
    }

    if (reserve === 0) return {itemId: 0, seed: 0n, richness: 0, reserve: 0}

    const eligible = getEligibleResources(locationType, subtype, stratum)
    if (eligible.length === 0) return {itemId: 0, seed: 0n, richness: 0, reserve: 0}

    const resourceRoll = ((bytes[4] << 24) | (bytes[5] << 16) | (bytes[6] << 8) | bytes[7]) >>> 0

    let totalWeight = 0
    for (const id of eligible) {
        totalWeight += getResourceWeight(id, stratum)
    }

    let selectedItemId = eligible[0]
    if (totalWeight > 0) {
        const roll = resourceRoll % totalWeight
        let cumulative = 0
        for (const id of eligible) {
            cumulative += getResourceWeight(id, stratum)
            if (roll < cumulative) {
                selectedItemId = id
                break
            }
        }
    }

    const seedBigInt =
        (BigInt(bytes[8]) << 56n) |
        (BigInt(bytes[9]) << 48n) |
        (BigInt(bytes[10]) << 40n) |
        (BigInt(bytes[11]) << 32n) |
        (BigInt(bytes[12]) << 24n) |
        (BigInt(bytes[13]) << 16n) |
        (BigInt(bytes[14]) << 8n) |
        BigInt(bytes[15])

    const rawRichness = (bytes[16] << 8) | bytes[17]
    const normalized = rawRichness / 65535
    const baseRichness = Math.floor(normalized * normalized * 999) + 1

    let depthBonus = 0
    if (stratum > 1) {
        depthBonus = (50 * Math.log(stratum)) / Math.log(65535)
    }
    const richness = Math.min(Math.floor(baseRichness + depthBonus), 1000)

    return {itemId: selectedItemId, seed: seedBigInt, richness, reserve}
}

export function deriveResourceStats(seed: bigint): ResourceStats {
    const seedBytes = new Uint8Array(8)
    for (let i = 0; i < 8; i++) {
        seedBytes[i] = Number(seed & 0xffn)
        seed >>= 8n
    }
    const hashResult = Checksum256.hash(Bytes.from(seedBytes))
    const hashBytes = hashResult.array

    const extractU32 = (offset: number): number =>
        (hashBytes[offset] * 0x1000000 +
            (hashBytes[offset + 1] << 16) +
            (hashBytes[offset + 2] << 8) +
            hashBytes[offset + 3]) >>> 0

    const weibull = (raw: number): number => {
        const u = raw / 4294967296
        let x = 0.27 * Math.sqrt(-Math.log(1 - u))
        if (x > 1) x = 1
        let val = Math.floor(x * 999) + 1
        if (val > 999) val = 999
        return val
    }

    return {
        stat1: weibull(extractU32(0)),
        stat2: weibull(extractU32(4)),
        stat3: weibull(extractU32(8)),
    }
}
