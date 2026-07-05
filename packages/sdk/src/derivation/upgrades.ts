import recipes from '../data/recipes.json'
import type {Recipe} from '../data/recipes-runtime'

const bySource = new Map<number, Recipe[]>()
for (const r of recipes as Recipe[]) {
    if (r.sourceSubclass === undefined) continue
    const list = bySource.get(r.sourceSubclass) ?? []
    list.push(r)
    bySource.set(r.sourceSubclass, list)
}

export function eligibleUpgrades(entityItemId: number): Recipe[] {
    return bySource.get(entityItemId) ?? []
}
