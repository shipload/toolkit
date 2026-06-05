import type {Name, UInt32, UInt64} from '@wharfkit/antelope'
import type {ServerContract} from '../contracts'
import type {Item} from '../types'
import type {Recipe} from '../data/recipes-runtime'
import type {PlotProgress} from './plot'

export type BuildState = 'initializing' | 'accepting' | 'ready' | 'scheduled' | 'finalizing'

export type FinalizerCapability = 'crafter'

export interface BuildableTarget {
    entityId: UInt64
    ownerName: Name
    coordinates: ServerContract.Types.coordinates
    targetItemId: number
    targetItem: Item
    state: BuildState
    recipe: Recipe
    progress: PlotProgress
    finalizeAction: Name
    finalizerCapability: FinalizerCapability
    activeTask?: ServerContract.Types.task
    scheduledBuild?: ScheduledBuild
}

export interface SourceEntityRef {
    entityId: UInt64
    name: string
    hasLoaders: boolean
    loaderCount: number
    loaderTotalMass: number
    relevantCargo: SourceCargoStack[]
}

export interface SourceCargoStack {
    key: string
    rowId: UInt64
    itemId: number
    item: Item
    stats: UInt64
    modules: ServerContract.Types.module_entry[]
    available: number
    plotNeeds: number
    reserved: number
}

export interface FinalizerEntityRef {
    entityId: UInt64
    name: string
    capability: FinalizerCapability
    crafterSpeed: number
    estimatedDuration: UInt32
}

export interface InboundTransfer {
    sourceEntityId: UInt64
    sourceEntityType: Name
    sourceName: string
    itemId: number
    quantity: number
    etaSeconds: number
}

export interface ScheduledBuild {
    shipId: UInt64
    shipName: string
    hasStarted: boolean
    startsAt: number
    completesAt: number
    trailingCancelCount: number
}

export interface Reservation {
    targetEntityId: UInt64
    targetEntityType: Name
    itemId: number
    quantity: number
}
