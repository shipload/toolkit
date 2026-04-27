import {ServerContract} from '../contracts'
import {LocationType} from '../types'
import {LOCATION_MAX_DEPTH, LOCATION_MIN_DEPTH} from './resources'

export function deriveLocationSize(loc: ServerContract.Types.location_static): number {
    if (loc.type.toNumber() === LocationType.EMPTY) return 0

    const raw = (loc.seed0.toNumber() << 8) | loc.seed1.toNumber()
    const normalized = raw / 65535

    const curved = normalized ** 3.0

    const range = LOCATION_MAX_DEPTH - LOCATION_MIN_DEPTH
    return Math.floor(LOCATION_MIN_DEPTH + curved * range)
}
