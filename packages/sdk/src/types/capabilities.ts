import type {Name, UInt32, UInt8} from '@wharfkit/antelope'
import type {ServerContract} from '../contracts'

export interface LoaderStats {
    mass: {toNumber(): number; multiplying(v: unknown): {toNumber(): number}}
    thrust: {toNumber(): number}
    quantity: {toNumber(): number; gt(v: unknown): boolean}
}

export interface GathererStats {
    yield: {toNumber(): number}
    drain: {toNumber(): number}
    depth: {toNumber(): number; toString(): string}
}

export interface CrafterStats {
    speed: {toNumber(): number}
    drain: {toNumber(): number}
}

export interface MovementCapability {
    engines: ServerContract.Types.movement_stats
    generator: ServerContract.Types.energy_stats
}

export interface EnergyCapability {
    energy: UInt32
}

export interface StorageCapability {
    capacity: UInt32
    cargomass: UInt32
    cargo: ServerContract.Types.cargo_item[]
}

export interface LoaderCapability {
    loaders: LoaderStats
}

export interface GathererCapability {
    gatherer: GathererStats
}

export interface MassCapability {
    hullmass: UInt32
}

export interface ScheduleCapability {
    lanes?: ServerContract.Types.lane[]
    schedule?: ServerContract.Types.schedule
}

export interface EntityCapabilities {
    hullmass?: UInt32
    capacity?: UInt32
    engines?: ServerContract.Types.movement_stats
    generator?: ServerContract.Types.energy_stats
    loaders?: LoaderStats
    gatherer?: GathererStats
    crafter?: CrafterStats
    hauler?: ServerContract.Types.hauler_stats
    launcher?: ServerContract.Types.launcher_stats
}

export interface EntityState {
    owner: Name
    location: ServerContract.Types.coordinates
    energy?: UInt32
    cargomass: UInt32
    cargo: ServerContract.Types.cargo_item[]
}

export function capsHasMovement(caps: EntityCapabilities): boolean {
    return caps.engines !== undefined && caps.generator !== undefined
}

export function capsHasStorage(caps: EntityCapabilities): boolean {
    return caps.capacity !== undefined
}

export function capsHasLoaders(caps: EntityCapabilities): boolean {
    return caps.loaders !== undefined
}

export function capsHasGatherer(caps: EntityCapabilities): boolean {
    return caps.gatherer !== undefined
}

export function capsHasMass(caps: EntityCapabilities): boolean {
    return caps.hullmass !== undefined
}

export function capsHasHauler(caps: EntityCapabilities): boolean {
    return caps.hauler !== undefined
}

export function capsHasLauncher(caps: EntityCapabilities): boolean {
    return caps.launcher !== undefined
}
