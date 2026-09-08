import {describe, expect, test} from 'bun:test'
import {availableBuildMethods} from './build-methods'
import {getItems} from '../data/catalog'
import {
    CAP_UNDEPLOY,
    CAP_WRAP,
    EntityClass,
    getKindMeta,
    getTemplateMeta,
} from '../data/kind-registry'
import {getRecipe} from '../data/recipes-runtime'
import {
    ITEM_DEPOT_T1_PACKED,
    ITEM_HUB_T1_PACKED,
    ITEM_WAREHOUSE_T1_PACKED,
    ITEM_WORKSHOP_T1_PACKED,
} from '../data/item-ids'

function planetaryStructures(): {itemId: number; capabilityFlags: number}[] {
    const out: {itemId: number; capabilityFlags: number}[] = []
    for (const item of getItems()) {
        const template = getTemplateMeta(item.id)
        if (!template) continue
        const kindMeta = getKindMeta(template.kind)
        if (kindMeta?.classification !== EntityClass.PlanetaryStructure) continue
        out.push({itemId: item.id, capabilityFlags: kindMeta.capabilityFlags})
    }
    return out
}

describe('availableBuildMethods', () => {
    test('orbital structures build via craft+deploy or plot', () => {
        expect(availableBuildMethods(ITEM_WAREHOUSE_T1_PACKED)).toEqual(['craft+deploy', 'plot'])
    })

    test('hub is craft+deploy only — excluded from the plot path', () => {
        expect(availableBuildMethods(ITEM_HUB_T1_PACKED)).toEqual(['craft+deploy'])
    })

    test('planetary structures are charter-granted and carry no build method', () => {
        expect(availableBuildMethods(ITEM_WORKSHOP_T1_PACKED)).toEqual([])
        expect(availableBuildMethods(ITEM_DEPOT_T1_PACKED)).toEqual([])
    })
})

describe('planetary structures are civic hulls', () => {
    test('the registry classifies the Workshop and the Depot hulls as planetary', () => {
        const ids = planetaryStructures().map((s) => s.itemId)
        expect(ids).toContain(ITEM_WORKSHOP_T1_PACKED)
        expect(ids).toContain(ITEM_DEPOT_T1_PACKED)
    })

    test('no planetary structure has a recipe', () => {
        for (const structure of planetaryStructures()) {
            expect(getRecipe(structure.itemId)).toBeUndefined()
        }
    })

    test('the Workshop and the Depot kinds are still classified planetary', () => {
        for (const kind of ['workshop', 'depot']) {
            expect(getKindMeta(kind)?.classification).toBe(EntityClass.PlanetaryStructure)
        }
    })

    test('no planetary-structure kind can wrap or undeploy', () => {
        for (const kind of ['workshop', 'depot']) {
            const meta = getKindMeta(kind)!
            expect(meta.capabilityFlags & (CAP_WRAP | CAP_UNDEPLOY)).toBe(0)
        }
    })
})
