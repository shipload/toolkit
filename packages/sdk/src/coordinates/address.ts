import type {Checksum256Type} from '@wharfkit/antelope'
import {
    COORD_MAX,
    COORD_MIN,
    COORD_OFFSET,
    LOCAL_MAX,
    REGION_DIV,
    REGION_PER_AXIS,
    SECTOR_DIV,
} from './constants'
import {decodeRegion, encodeRegion} from './regions'
import {decodeSector, encodeSector} from './sectors'

export interface CoordinateAddress {
    sector: string
    region: string
    localX: number
    localY: number
}

interface AxisSlices {
    sector: number
    region: number
    local: number
}

function sliceAxis(coord: number): AxisSlices {
    if (!Number.isInteger(coord) || coord < COORD_MIN || coord > COORD_MAX) {
        throw new RangeError(`coordinate out of range: ${coord}`)
    }
    const u = coord + COORD_OFFSET
    return {
        sector: Math.floor(u / SECTOR_DIV),
        region: Math.floor(u / REGION_DIV) % REGION_PER_AXIS,
        local: u % REGION_DIV,
    }
}

export function encodeAddress(seed: Checksum256Type, x: number, y: number): CoordinateAddress {
    const ax = sliceAxis(x)
    const ay = sliceAxis(y)
    return {
        sector: encodeSector(seed, ax.sector, ay.sector),
        region: encodeRegion(seed, ax.region, ay.region),
        localX: ax.local,
        localY: ay.local,
    }
}

export function decodeAddress(
    seed: Checksum256Type,
    addr: CoordinateAddress
): {x: number; y: number} {
    if (
        !Number.isInteger(addr.localX) ||
        !Number.isInteger(addr.localY) ||
        addr.localX < 0 ||
        addr.localX > LOCAL_MAX ||
        addr.localY < 0 ||
        addr.localY > LOCAL_MAX
    ) {
        throw new RangeError(`local position out of range: ${addr.localX}, ${addr.localY}`)
    }
    const sector = decodeSector(seed, addr.sector)
    const region = decodeRegion(seed, addr.region)
    const x = sector.sx * SECTOR_DIV + region.rx * REGION_DIV + addr.localX - COORD_OFFSET
    const y = sector.sy * SECTOR_DIV + region.ry * REGION_DIV + addr.localY - COORD_OFFSET
    if (x < COORD_MIN || x > COORD_MAX || y < COORD_MIN || y > COORD_MAX) {
        throw new RangeError(`address decodes outside the coordinate range: ${x}, ${y}`)
    }
    return {x, y}
}

export function addressFromCoordinates(
    seed: Checksum256Type,
    coords: {
        x: number | {toNumber(): number}
        y: number | {toNumber(): number}
    }
): CoordinateAddress {
    const x = typeof coords.x === 'number' ? coords.x : coords.x.toNumber()
    const y = typeof coords.y === 'number' ? coords.y : coords.y.toNumber()
    return encodeAddress(seed, x, y)
}
