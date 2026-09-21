import {describe, expect, test} from 'bun:test'
import {getComponents, getItem, getItems, itemTypeIndex, typeLabel} from './catalog'
import {getRecipe} from './recipes-runtime'
import items from './items.json'
import {itemFamilies, itemFamilyKey} from './metadata'

describe('itemTypeIndex', () => {
    test('agrees with typeLabel for every item in the catalog', () => {
        for (const item of getItems()) {
            expect(typeLabel(itemTypeIndex(item.id))).toBe(typeLabel(item.type))
        }
    })

    test('covers every type in the chain enum order', () => {
        const indexes = new Set(getItems().map((item) => itemTypeIndex(item.id)))
        expect([...indexes].sort()).toEqual([0, 1, 2, 3])
    })

    test('throws for an unknown item', () => {
        expect(() => itemTypeIndex(65535)).toThrow()
    })
})

const catalogItems = () => (items as Array<{id: number}>).map((raw) => getItem(raw.id))

describe('item families', () => {
    test('every item resolves to a family that carries its name', () => {
        for (const item of catalogItems()) {
            expect(itemFamilies[item.family]?.name).toBe(item.name)
        }
    })

    test('every tier of a family shares one name, description, and colour', () => {
        const seen = new Map<string, {name: string; description: string; color: string}>()
        for (const item of catalogItems()) {
            const prior = seen.get(item.family)
            if (prior) {
                expect({
                    name: item.name,
                    description: item.description,
                    color: item.color,
                }).toEqual(prior)
            } else {
                seen.set(item.family, {
                    name: item.name,
                    description: item.description,
                    color: item.color,
                })
            }
        }
    })

    test('every family is reachable from at least one item id', () => {
        const reachable = new Set(catalogItems().map((item) => item.family))
        for (const id of [10202, 10203, 10204, 10207]) reachable.add(itemFamilyKey(id)!)
        expect([...Object.keys(itemFamilies)].filter((key) => !reachable.has(key))).toEqual([])
    })

    test('descriptions never name a tier', () => {
        for (const [key, family] of Object.entries(itemFamilies)) {
            expect(`${key}: ${family.description}`).not.toMatch(/\btier\b|\bT\d\b/i)
        }
    })
})

describe('component descriptions', () => {
    test('name only items that a recipe actually builds from the component', () => {
        const consumers = new Map<string, Set<string>>()
        for (const output of getItems()) {
            const recipe = getRecipe(output.id)
            if (!recipe) continue
            for (const input of recipe.inputs) {
                const inputItem = getItem(input.itemId)
                if (inputItem.type !== 'component') continue
                if (!consumers.has(inputItem.family)) consumers.set(inputItem.family, new Set())
                consumers
                    .get(inputItem.family)!
                    .add(
                        output.type === 'entity' && output.family !== 'container'
                            ? 'hulls'
                            : output.name
                    )
            }
        }
        for (const item of getComponents({tier: 1})) {
            const named = item.description
                .replace(/^Goes into /, '')
                .replace(/\.$/, '')
                .split(/, and |, | and /)
                .map((name) => name.replace(/s$/, ''))
            for (const name of named) {
                const plain = name === 'hull' ? 'hulls' : name
                expect(consumers.get(item.family)?.has(plain), `${item.name} -> ${plain}`).toBe(
                    true
                )
            }
        }
    })
})
