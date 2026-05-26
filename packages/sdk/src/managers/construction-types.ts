import type {Name, UInt32, UInt64} from '@wharfkit/antelope'
import type {ServerContract} from '../contracts'
import type {Item} from '../types'
import type {Recipe} from '../data/recipes-runtime'
import type {PlotProgress} from './plot'

export type BuildState = 'initializing' | 'accepting' | 'ready' | 'finalizing'

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
    itemId: number
    item: Item
    available: number
    plotNeeds: number
}

export interface FinalizerEntityRef {
    entityId: UInt64
    name: string
    capability: FinalizerCapability
    crafterSpeed: number
    estimatedDuration: UInt32
}
