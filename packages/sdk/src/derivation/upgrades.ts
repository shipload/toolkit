import recipes from '../data/recipes.json'
import type {Recipe} from '../data/recipes-runtime'

const bySource = new Map<number, Recipe[]>()
for (const r of recipes as Recipe[]) {
    for (const source of r.sourceSubclasses ?? []) {
        const list = bySource.get(source) ?? []
        list.push(r)
        bySource.set(source, list)
    }
}

export function eligibleUpgrades(entityItemId: number): Recipe[] {
    return bySource.get(entityItemId) ?? []
}
