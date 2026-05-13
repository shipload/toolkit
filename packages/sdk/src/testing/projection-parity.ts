import type {UInt16, UInt32} from '@wharfkit/antelope'
import type {ServerContract} from '../contracts'
import type {ProjectedEntity} from '../scheduling/projection'
import {type CargoStack, cargoItemToStack, mergeStacks} from '../capabilities/storage'

export interface ContractProjectedState {
    owner: {toString(): string}
    coordinates: ServerContract.Types.coordinates
    energy?: UInt16
    cargomass: UInt32
    cargo: ServerContract.Types.cargo_view[]
    hullmass?: UInt32
    capacity?: UInt32
    engines?: ServerContract.Types.movement_stats
    loaders?: ServerContract.Types.loader_stats
    generator?: ServerContract.Types.energy_stats
    hauler?: ServerContract.Types.hauler_stats
}

export interface ProjectionComparisonOptions {
    step?: number
}

export function assertProjectionEquals(
    contract: ContractProjectedState,
    sdk: ProjectedEntity,
    options: ProjectionComparisonOptions = {}
): void {
    const mismatches: string[] = []

    const record = (name: string, c: unknown, s: unknown) => {
        if (c !== s) mismatches.push(`  ${name}: contract=${fmt(c)} sdk=${fmt(s)}`)
    }

    const recordStatBlock = (name: string, c: unknown, s: unknown) => {
        const cPresent = c !== undefined && c !== null
        const sPresent = s !== undefined && s !== null
        if (cPresent !== sPresent) {
            mismatches.push(
                `  ${name}: contract=${cPresent ? 'present' : 'absent'} sdk=${sPresent ? 'present' : 'absent'}`
            )
            return
        }
        if (!cPresent) return
        const cn = JSON.stringify(normaliseStatBlock(c))
        const sn = JSON.stringify(normaliseStatBlock(s))
        if (cn !== sn) mismatches.push(`  ${name}: contract=${cn} sdk=${sn}`)
    }

    record('coordinates.x', toNum(contract.coordinates.x), Number(sdk.location.x))
    record('coordinates.y', toNum(contract.coordinates.y), Number(sdk.location.y))
    record('energy', toNum(contract.energy), Number(sdk.energy))
    record('cargomass', toNum(contract.cargomass), Number(sdk.cargoMass))
    record('hullmass', toNum(contract.hullmass), Number(sdk.shipMass))
    record('capacity', toNum(contract.capacity), sdk.capacity ? Number(sdk.capacity) : undefined)

    recordStatBlock('engines', contract.engines, sdk.engines)
    recordStatBlock('loaders', contract.loaders, sdk.loaders)
    recordStatBlock('generator', contract.generator, sdk.generator)
    recordStatBlock('hauler', contract.hauler, sdk.hauler)

    if (contract.cargo.length > 0 || sdk.cargo.length > 0) {
        const contractCargo = normaliseCargo(mergeContractCargo(contract.cargo))
        const sdkCargo = normaliseCargo(sdk.cargo)
        if (contractCargo.length !== sdkCargo.length) {
            mismatches.push(
                `  cargo.length: contract=${contractCargo.length} sdk=${sdkCargo.length}`
            )
        } else {
            for (let i = 0; i < contractCargo.length; i++) {
                const c = contractCargo[i]
                const s = sdkCargo[i]
                if (c.itemId !== s.itemId || c.stats !== s.stats || c.quantity !== s.quantity) {
                    mismatches.push(
                        `  cargo[${i}]: contract={item:${c.itemId},stats:${c.stats},qty:${c.quantity}} sdk={item:${s.itemId},stats:${s.stats},qty:${s.quantity}}`
                    )
                }
            }
        }
    }

    if (mismatches.length > 0) {
        const header =
            options.step !== undefined
                ? `projection divergence at step ${options.step}:`
                : 'projection divergence:'
        throw new Error([header, ...mismatches].join('\n'))
    }
}

interface NormalisedStack {
    itemId: number
    stats: string
    quantity: string
}

function mergeContractCargo(cargo: ServerContract.Types.cargo_view[]): CargoStack[] {
    return cargo.reduce<CargoStack[]>(
        (acc, row) =>
            mergeStacks(acc, cargoItemToStack(row as unknown as ServerContract.Types.cargo_item)),
        []
    )
}

function normaliseCargo(cargo: CargoStack[]): NormalisedStack[] {
    return cargo
        .map((s) => ({
            itemId: Number(s.item_id),
            stats: BigInt(s.stats.toString()).toString(),
            quantity: BigInt(s.quantity.toString()).toString(),
        }))
        .sort(stackSort)
}

function stackSort(a: NormalisedStack, b: NormalisedStack): number {
    if (a.itemId !== b.itemId) return a.itemId - b.itemId
    return a.stats < b.stats ? -1 : a.stats > b.stats ? 1 : 0
}

function toNum(v: unknown): number | undefined {
    if (v === undefined || v === null) return undefined
    if (typeof v === 'number') return v
    if (typeof v === 'bigint') return Number(v)
    if (typeof (v as {toNumber?: unknown}).toNumber === 'function') {
        return (v as {toNumber(): number}).toNumber()
    }
    return Number(v as number)
}

function fmt(v: unknown): string {
    if (v === undefined) return 'undefined'
    if (v === null) return 'null'
    return String(v)
}

function normaliseStatBlock(block: unknown): Record<string, number> {
    const out: Record<string, number> = {}
    const obj = block as Record<string, unknown>
    for (const k of Object.keys(obj).sort()) {
        out[k] = toNum(obj[k]) ?? 0
    }
    return out
}
