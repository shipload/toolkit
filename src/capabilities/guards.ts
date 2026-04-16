import {
    EnergyCapability,
    GathererCapability,
    LoaderCapability,
    MassCapability,
    MovementCapability,
    ScheduleCapability,
    StorageCapability,
} from '../types/capabilities'
import {Entity} from '../types/entity'

export function canMove(e: Entity): e is Entity & MovementCapability & EnergyCapability {
    return 'engines' in e && 'generator' in e && 'energy' in e
}

export function hasEnergy(e: Entity): e is Entity & EnergyCapability {
    return 'energy' in e
}

export function hasStorage(e: Entity): e is Entity & StorageCapability {
    return 'capacity' in e && 'cargo' in e
}

export function hasLoaders(e: Entity): e is Entity & LoaderCapability {
    return 'loaders' in e && e.loaders !== undefined
}

export function hasMass(e: Entity): e is Entity & MassCapability {
    return 'hullmass' in e
}

export function hasSchedule(e: Entity): e is Entity & ScheduleCapability {
    return 'schedule' in e
}

export function hasGatherer(e: Entity): e is Entity & GathererCapability {
    return 'gatherer' in e && e.gatherer !== undefined
}
