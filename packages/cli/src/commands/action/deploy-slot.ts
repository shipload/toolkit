import {
    type ClusterSlotType,
    EntityClass,
    getEntityClass,
    getKindMeta,
    getPackedEntityType,
    isHub,
} from '@shipload/sdk'
import {InvalidArgumentError} from 'commander'
import {ValidationError} from '../../lib/validate'

export interface DeployCell {
    hub: bigint
    gx: number
    gy: number
}

export function parseCellOption(s: string): DeployCell {
    const parts = s.split(':')
    if (parts.length !== 3) {
        throw new InvalidArgumentError('--cell must be <hub-id>:<gx>:<gy>')
    }
    const gx = Number(parts[1])
    const gy = Number(parts[2])
    if (!Number.isInteger(gx) || !Number.isInteger(gy)) {
        throw new InvalidArgumentError('--cell coordinates must be integers: <hub-id>:<gx>:<gy>')
    }
    let hub: bigint
    try {
        hub = BigInt(parts[0])
    } catch {
        throw new InvalidArgumentError('--cell hub id must be an integer: <hub-id>:<gx>:<gy>')
    }
    return {hub, gx, gy}
}

export function resolveDeploySlot(
    packedItemId: number,
    cell: DeployCell | undefined
): ClusterSlotType | undefined {
    const kind = getPackedEntityType(packedItemId)
    const isStructure =
        kind !== null &&
        getEntityClass(kind) === EntityClass.OrbitalStructure &&
        !isHub({type: kind})

    if (isStructure) {
        if (!cell) {
            throw new ValidationError(
                'deploying a structure requires a hub cell: --cell <hub-id>:<gx>:<gy>'
            )
        }
        return {hub: cell.hub, gx: cell.gx, gy: cell.gy}
    }
    if (cell) {
        const label = kind ? (getKindMeta(kind)?.defaultLabel ?? kind.toString()) : 'this item'
        throw new ValidationError(`${label} does not take a hub cell`)
    }
    return undefined
}
