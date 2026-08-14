import {DECAY_MAX_ITERATIONS, DECAY_RETAIN_DEN, DECAY_RETAIN_NUM} from './constants'

export function decayActive(active: bigint, epochsElapsed: number): bigint {
    const iterations = epochsElapsed > DECAY_MAX_ITERATIONS ? DECAY_MAX_ITERATIONS : epochsElapsed
    let value = active
    for (let i = 0; i < iterations && value > 0n; i++) {
        value = (value * DECAY_RETAIN_NUM) / DECAY_RETAIN_DEN
    }
    return value
}

export interface DecayableStanding {
    active: bigint
    lastUpdateEpoch: number
}

export function normalizeActive(standing: DecayableStanding, epoch: number): bigint {
    const elapsed = epoch > standing.lastUpdateEpoch ? epoch - standing.lastUpdateEpoch : 0
    return decayActive(standing.active, elapsed)
}
