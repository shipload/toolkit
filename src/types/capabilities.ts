import {Name, UInt16, UInt32} from '@wharfkit/antelope'
import {ServerContract} from '../contracts'

export interface MovementCapability {
    engines: ServerContract.Types.movement_stats
    generator: ServerContract.Types.energy_stats
}

export interface EnergyCapability {
    energy: UInt16
}

export interface StorageCapability {
    capacity: UInt32
    cargomass: UInt32
    cargo: ServerContract.Types.cargo_item[]
}

export interface LoaderCapability {
    loaders: ServerContract.Types.loader_stats
}

export interface TradeCapability {
    trade: ServerContract.Types.trade_stats
}

export interface ExtractorCapability {
    extractor: ServerContract.Types.extractor_stats
}

export interface MassCapability {
    hullmass: UInt32
}

export interface ScheduleCapability {
    schedule?: ServerContract.Types.schedule
}

export interface EntityCapabilities {
    hullmass?: UInt32
    capacity?: UInt32
    engines?: ServerContract.Types.movement_stats
    generator?: ServerContract.Types.energy_stats
    loaders?: ServerContract.Types.loader_stats
    trade?: ServerContract.Types.trade_stats
    extractor?: ServerContract.Types.extractor_stats
}

export interface EntityState {
    owner: Name
    location: ServerContract.Types.coordinates
    energy?: UInt16
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

export function capsHasTrade(caps: EntityCapabilities): boolean {
    return caps.trade !== undefined
}

export function capsHasExtractor(caps: EntityCapabilities): boolean {
    return caps.extractor !== undefined
}

export function capsHasMass(caps: EntityCapabilities): boolean {
    return caps.hullmass !== undefined
}
