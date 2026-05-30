import {Name} from '@wharfkit/antelope'
import {getItem} from '../data/catalog'
import {getRecipe} from '../data/recipes-runtime'
import {computeInputMass} from '../derivation/crafting'
import {calc_craft_duration} from '../capabilities/crafting'
import {TaskType} from '../types'
import {BaseManager} from './base'
import type {ServerContract} from '../contracts'
import type {BuildableTarget} from './construction-types'

export interface PlotProgressInputRow {
    itemId: number
    required: number
    provided: number
    missing: number
}

export interface PlotProgress {
    targetItemId: number
    rows: PlotProgressInputRow[]
    massProvided: number
    massRequired: number
    isComplete: boolean
}

export class PlotManager extends BaseManager {
    progress(
        plot: ServerContract.Types.entity_row,
        cargo: ServerContract.Types.cargo_row[]
    ): PlotProgress {
        const targetItemId = Number(plot.item_id.toString())
        const recipe = getRecipe(targetItemId)
        if (!recipe) {
            throw new Error(`No recipe found for item ${targetItemId}`)
        }

        const plotId = plot.id.toString()
        const plotCargo = cargo.filter((c) => c.entity_id.toString() === plotId)

        const quantityByItemId = new Map<number, number>()
        for (const c of plotCargo) {
            const id = c.item_id.toNumber()
            quantityByItemId.set(
                id,
                (quantityByItemId.get(id) ?? 0) + Number(c.quantity.toString())
            )
        }

        const rows: PlotProgressInputRow[] = recipe.inputs.map((input) => {
            const itemId = input.itemId
            const required = input.quantity
            const provided = quantityByItemId.get(itemId) ?? 0
            const missing = Math.max(0, required - provided)
            return {itemId, required, provided, missing}
        })

        const massRequired = computeInputMass(targetItemId)
        const massProvided = rows.reduce((sum, r) => {
            const item = getItem(r.itemId)
            return sum + item.mass * r.provided
        }, 0)
        const isComplete = rows.every((r) => r.missing === 0)

        return {targetItemId, rows, massProvided, massRequired, isComplete}
    }

    buildableTarget(
        plot: ServerContract.Types.entity_row,
        cargo: ServerContract.Types.cargo_row[],
        activeTask?: ServerContract.Types.task
    ): BuildableTarget {
        const progress = this.progress(plot, cargo)
        const targetItemId = Number(plot.item_id.toString())
        const targetItem = getItem(targetItemId)
        const recipe = getRecipe(targetItemId)
        if (!recipe) {
            throw new Error(`Plot target item ${targetItemId} has no recipe`)
        }

        let state: BuildableTarget['state']
        const taskType = activeTask?.type.toNumber()
        if (taskType === TaskType.CLAIMPLOT) {
            state = 'initializing'
        } else if (taskType === TaskType.BUILDPLOT) {
            state = 'finalizing'
        } else if (progress.isComplete) {
            state = 'ready'
        } else {
            state = 'accepting'
        }

        return {
            entityId: plot.id,
            ownerName: plot.owner,
            coordinates: plot.coordinates,
            targetItemId,
            targetItem,
            state,
            recipe,
            progress,
            finalizeAction: Name.from('buildplot'),
            finalizerCapability: 'crafter',
            activeTask,
        }
    }

    canBuild(
        plot: ServerContract.Types.entity_row,
        cargo: ServerContract.Types.cargo_row[]
    ): boolean {
        return this.progress(plot, cargo).isComplete
    }

    timeToComplete(
        plot: ServerContract.Types.entity_info,
        crafter: ServerContract.Types.crafter_stats
    ): number {
        const capacity = Number(plot.capacity?.toString() ?? '0')
        const speed = Number(crafter.speed.toString())
        if (speed === 0) return 0
        return calc_craft_duration(speed, capacity).toNumber()
    }
}
