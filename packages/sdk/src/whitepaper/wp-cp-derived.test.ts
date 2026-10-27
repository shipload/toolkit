import {describe, expect, test} from 'bun:test'
import {getItem, itemIds} from '../data/catalog'
import {getComponentProcess} from '../data/component-process'
import {
    ALL_ENTITY_TYPES,
    ENTITY_SHIP,
    EntityClass,
    getEntityClass,
    getPackedEntityType,
} from '../data/kind-registry'
import {getEntityLayout, getRecipe} from '../data/recipes-runtime'
import recipes from '../data/recipes.json'
import {
    computeBaseCapacity,
    computeGathererYield,
    computeShipHullCapabilities,
    computeStructureBaseCapacity,
    computeWarehouseHullCapabilities,
    gathererDepthForTier,
} from '../derivation/capabilities'
import {DEPTH_THRESHOLD_T3, DEPTH_THRESHOLD_T4, DEPTH_THRESHOLD_T5} from '../derivation/resources'
import {deriveResourceStats} from '../derivation/stratum'
import {MASS_UNITS_PER_TONNE} from '../types'

const tonnes = (mass: number) => mass / MASS_UNITS_PER_TONNE
const catalogItems = () => itemIds.map((id) => getItem(id))

function inputMass(itemId: number): number {
    const recipe = getRecipe(itemId)!
    return recipe.inputs.reduce((sum, i) => sum + getItem(i.itemId).mass * i.quantity, 0)
}

const rawCache = new Map<number, number>()
function rawResourceMass(itemId: number): number {
    const cached = rawCache.get(itemId)
    if (cached !== undefined) return cached
    const item = getItem(itemId)
    let total: number
    if (item.type === 'resource') {
        total = item.mass
    } else {
        total = getRecipe(itemId)!.inputs.reduce(
            (sum, i) => sum + rawResourceMass(i.itemId) * i.quantity,
            0
        )
    }
    rawCache.set(itemId, total)
    return total
}

const recipeIds = (recipes as {outputItemId: number}[]).map((r) => r.outputItemId)
const outputsOf = (type: string, tier: number) =>
    recipeIds.filter((id) => getItem(id).type === type && getItem(id).tier === tier)

const isShipItem = (id: number) => getPackedEntityType(id)?.equals(ENTITY_SHIP) ?? false
const shipRecipes = () => recipeIds.filter((id) => getItem(id).type === 'entity' && isShipItem(id))
const donorOf = (id: number) =>
    getRecipe(id)!.inputs.find((i) => getItem(i.itemId).type === 'entity')?.itemId

function rungOf(id: number): number {
    const donor = donorOf(id)
    if (donor === undefined) return getItem(id).tier
    return getItem(donor).tier < getItem(id).tier ? getItem(id).tier : getItem(id).tier + 0.5
}

const SEED_COUNT = 1_000_000
let statSamples: number[] | undefined
function sortedStats(): number[] {
    if (statSamples) return statSamples
    const out: number[] = []
    for (let i = 1; i <= SEED_COUNT; i++) {
        const s = deriveResourceStats(BigInt(i) * 7919n + 12345n)
        out.push(s.stat1, s.stat2, s.stat3)
    }
    out.sort((a, b) => a - b)
    statSamples = out
    return out
}
const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length
const topShare = (share: number) => {
    const all = sortedStats()
    return mean(all.slice(Math.floor(all.length * (1 - share))))
}
const warehouseCap = (stat: number) =>
    computeWarehouseHullCapabilities({strength: stat, hardness: stat}).capacity
const shipCap = (stat: number) =>
    computeShipHullCapabilities({a: stat, b: stat, c: stat, d: stat, e: stat}).capacity

describe('WP-CP-01 and WP-CP-03: mass conservation', () => {
    test('WP-CP-01-component T1 components turn 10 t of resources into 4 t', () => {
        const components = outputsOf('component', 1)
        expect(components.length).toBe(10)
        for (const id of components) {
            expect(tonnes(inputMass(id))).toBe(10)
            expect(tonnes(getRecipe(id)!.outputMass)).toBe(4)
        }
    })

    test('WP-CP-01-module T1 modules turn 2,400 t of components into 960 t', () => {
        const modules = outputsOf('module', 1)
        expect(modules.length).toBe(10)
        for (const id of modules) {
            expect(tonnes(inputMass(id))).toBe(2400)
            expect(tonnes(getRecipe(id)!.outputMass)).toBe(960)
        }
    })

    test('WP-CP-01-ship the Roustabout hull weighs 3,200 t from 3,600 t of components', () => {
        const roustabout = 10210
        expect(tonnes(inputMass(roustabout))).toBe(3600)
        expect(tonnes(getRecipe(roustabout)!.outputMass)).toBe(3200)
    })

    test('WP-CP-03-component T2 components keep exactly 40% of input mass', () => {
        const components = outputsOf('component', 2)
        expect(components.length).toBe(10)
        for (const id of components) {
            expect(getRecipe(id)!.outputMass * 10).toBe(inputMass(id) * 4)
        }
    })

    test('WP-CP-03-module T2 modules keep exactly 40% of input mass including the T1 predecessor', () => {
        const modules = outputsOf('module', 2)
        expect(modules.length).toBe(9)
        for (const id of modules) {
            expect(getRecipe(id)!.outputMass * 10).toBe(inputMass(id) * 4)
        }
    })

    test('WP-CP-03-ship a ship above the Roustabout weighs its donor plus 40% of its component mass', () => {
        const ships = shipRecipes().filter((id) => donorOf(id) !== undefined)
        expect(ships.length).toBeGreaterThan(0)
        for (const id of ships) {
            const donor = donorOf(id)!
            const componentMass = inputMass(id) - getItem(donor).mass
            expect(getRecipe(id)!.outputMass * 10).toBe(
                getItem(donor).mass * 10 + componentMass * 4
            )
        }
    })
})

describe('WP-CP-02: end-to-end keep and burn', () => {
    test('WP-CP-02-module a T1 module keeps 960 t of 6,000 t of resources and burns 5,040 t', () => {
        for (const id of outputsOf('module', 1)) {
            expect(tonnes(rawResourceMass(id))).toBe(6000)
            expect(tonnes(getRecipe(id)!.outputMass)).toBe(960)
            expect(getRecipe(id)!.outputMass / rawResourceMass(id)).toBeCloseTo(0.16, 10)
            expect(tonnes(rawResourceMass(id) - getRecipe(id)!.outputMass)).toBe(5040)
        }
    })

    test('WP-CP-02-t2-module a T2 module keeps 1,536 t of 13,200 t, counting its T1 predecessor', () => {
        for (const id of outputsOf('module', 2)) {
            expect(tonnes(rawResourceMass(id))).toBe(13200)
            expect(tonnes(getRecipe(id)!.outputMass)).toBe(1536)
        }
    })

    test('WP-CP-02-hull the Roustabout hull keeps 3,200 t of 9,000 t of resources', () => {
        expect(tonnes(rawResourceMass(10210))).toBe(9000)
        expect(tonnes(getRecipe(10210)!.outputMass)).toBe(3200)
    })

    test('WP-CP-02-specialist a specialist hull keeps 4,160 t of 15,000 t, counting its Roustabout donor', () => {
        for (const id of shipRecipes().filter((i) => rungOf(i) === 1.5)) {
            expect(tonnes(rawResourceMass(id))).toBe(15000)
            expect(tonnes(getRecipe(id)!.outputMass)).toBe(4160)
        }
    })

    test('WP-CP-02-fit a fully fit Roustabout keeps 6,080 t of 27,000 t and a fully fit specialist 7,040 t of 33,000 t', () => {
        const fitted = (id: number) => {
            const sockets = getEntityLayout(id)!.slots.length
            const module = outputsOf('module', 1)[0]
            return {
                raw: rawResourceMass(id) + sockets * rawResourceMass(module),
                kept: getRecipe(id)!.outputMass + sockets * getRecipe(module)!.outputMass,
            }
        }
        const roustabout = fitted(10210)
        expect(tonnes(roustabout.raw)).toBe(27000)
        expect(tonnes(roustabout.kept)).toBe(6080)
        expect(roustabout.kept / roustabout.raw).toBeCloseTo(0.2252, 4)
        expect(tonnes(roustabout.raw - roustabout.kept)).toBe(20920)

        const specialists = shipRecipes().filter((i) => rungOf(i) === 1.5)
        expect(specialists.length).toBe(6)
        for (const id of specialists) {
            const s = fitted(id)
            expect(tonnes(s.raw)).toBe(33000)
            expect(tonnes(s.kept)).toBe(7040)
            expect(s.kept / s.raw).toBeCloseTo(0.2133, 4)
        }
    })

    test('WP-CP-02-legacy the five-socket T1 Ship has no recipe, so no 40,000 t build exists', () => {
        expect(getRecipe(10201)).toBeUndefined()
        expect(getEntityLayout(10201)!.slots.length).toBe(5)
    })
})

describe('WP-CP-18: input selection payoff', () => {
    test('WP-CP-18-mean the unselected baseline is a stat of about 213 and one rolled draw averages to it', () => {
        expect(mean(sortedStats())).toBeGreaterThan(212.5)
        expect(mean(sortedStats())).toBeLessThan(213.5)
    })

    test('WP-CP-18-top-shares capacity multipliers against feeding every stack', () => {
        const floor = mean(sortedStats())
        const expected: [number, number][] = [
            [0.25, 1.31],
            [0.1, 1.48],
            [0.01, 1.89],
        ]
        for (const [share, multiplier] of expected) {
            const selected = topShare(share)
            const dual = warehouseCap(selected) / warehouseCap(floor)
            const ship = shipCap(selected) / shipCap(floor)
            expect(Math.abs(dual - multiplier)).toBeLessThan(0.01)
            expect(Math.abs(ship - multiplier)).toBeLessThan(0.01)
        }
    })

    test('WP-CP-18-god-roll all counted stats at 999 pay 4.09x over the unselected baseline', () => {
        const floor = mean(sortedStats())
        expect(Math.abs(warehouseCap(999) / warehouseCap(floor) - 4.09)).toBeLessThan(0.01)
        expect(Math.abs(shipCap(999) / shipCap(floor) - 4.09)).toBeLessThan(0.01)
        expect(warehouseCap(999) / warehouseCap(0)).toBeCloseTo(6, 3)
    })

    test('WP-CP-18-bounded the payoff rises with the selected share and never passes the god-roll', () => {
        const caps = [1, 0.5, 0.25, 0.1, 0.01].map((s) => warehouseCap(topShare(s)))
        for (let i = 1; i < caps.length; i++) expect(caps[i]).toBeGreaterThan(caps[i - 1])
        expect(caps[caps.length - 1]).toBeLessThan(warehouseCap(999))
    })

    test('WP-CP-18-single-source a hull that counts one structural stat pays the square root of those multipliers', () => {
        const floor = mean(sortedStats())
        const single = (stat: number) => computeStructureBaseCapacity({strength: 0, hardness: stat})
        const expected: [number, number][] = [
            [0.25, 1.15],
            [0.1, 1.22],
            [0.01, 1.37],
        ]
        for (const [share, multiplier] of expected) {
            expect(Math.abs(single(topShare(share)) / single(floor) - multiplier)).toBeLessThan(
                0.01
            )
        }
        expect(Math.abs(single(999) / single(floor) - 2.02)).toBeLessThan(0.01)
    })
})

describe('WP-CP-08 to CP-12: ids and the ladder', () => {
    test('WP-CP-08-ids crafted ids decode tier and family, and resource ids decode kind and tier', () => {
        for (const item of catalogItems()) {
            if (item.type === 'resource') {
                expect(item.id % 100).toBe(item.tier)
                continue
            }
            const kind = item.id % 1000
            expect(Math.floor((item.id - 10000) / 1000) + 1).toBe(item.tier)
            if (item.type === 'component') expect(kind >= 1 && kind <= 99).toBe(true)
            if (item.type === 'module') expect(kind >= 100 && kind <= 199).toBe(true)
            if (item.type === 'entity') expect(kind >= 200 && kind <= 299).toBe(true)
        }
    })

    test('WP-CP-07-predecessor each T2 module, ship and container takes one predecessor; a module or container blends every stat 50/50 and a ship blends its step channels and carries the rest', () => {
        const isKind = (id: number, kind: string) => getPackedEntityType(id)?.toString() === kind
        const t2 = recipeIds.filter(
            (id) =>
                getItem(id).tier === 2 &&
                (getItem(id).type === 'module' || getItem(id).type === 'entity')
        )
        let withPredecessor = 0
        for (const id of t2) {
            const recipe = getRecipe(id)!
            const predecessors = recipe.inputs
                .map((input, index) => ({input, index}))
                .filter(({input}) => ['module', 'entity'].includes(getItem(input.itemId).type))
            const stationStructure =
                getItem(id).type === 'entity' && !isShipItem(id) && !isKind(id, 'container')
            if (stationStructure) {
                expect(predecessors.length).toBe(0)
                continue
            }
            withPredecessor++
            expect(predecessors.length).toBe(1)
            expect(predecessors[0].input.quantity).toBe(1)
            expect(getItem(predecessors[0].input.itemId).tier).toBeLessThanOrEqual(2)
            for (const slot of recipe.statSlots) {
                if (isShipItem(id)) expect(slot.sources.length).toBeLessThanOrEqual(2)
                else expect(slot.sources.length).toBe(2)
                expect(
                    slot.sources.filter((s) => s.inputIndex === predecessors[0].index).length
                ).toBe(1)
            }
        }
        expect(withPredecessor).toBe(9 + 18 + 1)
    })

    test('WP-CP-07-t2-components a T2 component crafts only from T2 resources', () => {
        for (const id of outputsOf('component', 2)) {
            for (const input of getRecipe(id)!.inputs) {
                expect(getItem(input.itemId).type).toBe('resource')
                expect(getItem(input.itemId).tier).toBe(2)
            }
        }
    })

    test('WP-CP-09-ladder ships sit on four rungs with one socket granted per tier at the Second step', () => {
        const byRung = new Map<number, number[]>()
        for (const id of shipRecipes()) {
            const rung = rungOf(id)
            byRung.set(rung, [...(byRung.get(rung) ?? []), getEntityLayout(id)!.slots.length])
        }
        expect([...byRung.keys()].sort()).toEqual([1, 1.5, 2, 2.5])
        const sockets = (rung: number) => [...new Set(byRung.get(rung))]
        expect(sockets(1)).toEqual([3])
        expect(sockets(1.5)).toEqual([3])
        expect(sockets(2)).toEqual([3])
        expect(sockets(2.5).sort()).toEqual([4])
        for (const id of shipRecipes()) expect(getItem(id).tier).toBeLessThanOrEqual(2)
    })

    test('WP-CP-10-step-cost a First step takes three Refined parts and a Second step two, 300 of each at T1 and 350 at T2', () => {
        for (const id of shipRecipes()) {
            const expected = getItem(id).tier === 1 ? 300 : 350
            const parts = getRecipe(id)!.inputs.filter(
                (i) => getItem(i.itemId).type === 'component'
            )
            expect(parts.length).toBe(Number.isInteger(rungOf(id)) ? 3 : 2)
            for (const part of parts) {
                expect(part.quantity).toBe(expected)
                expect(getComponentProcess(part.itemId)).toBe('refined')
            }
        }
    })

    test('WP-CP-10-tonnage a component costs 10 + 2(t-1) t, so a step takes 3,000 t then 4,200 t of each resource it draws on', () => {
        for (const id of recipeIds.filter((i) => getItem(i).type === 'component')) {
            expect(tonnes(inputMass(id))).toBe(10 + 2 * (getItem(id).tier - 1))
        }
        const perResource = (id: number) => {
            const own = getRecipe(id)!.inputs.filter((i) => getItem(i.itemId).type === 'component')
            const totals = new Map<number, number>()
            for (const part of own) {
                for (const input of getRecipe(part.itemId)!.inputs) {
                    totals.set(
                        input.itemId,
                        (totals.get(input.itemId) ?? 0) + input.quantity * part.quantity
                    )
                }
            }
            return totals
        }
        for (const [id, tonnage, resources] of [
            [10210, 3000, 3],
            [10211, 3000, 2],
            [11212, 4200, 3],
            [11213, 4200, 2],
        ]) {
            const totals = perResource(id)
            expect(totals.size).toBe(resources)
            for (const value of totals.values()) expect(value).toBe(tonnage)
        }
    })

    test('WP-CP-11-masses packed ship masses follow the ladder and equal each crafted ship base hullmass', () => {
        const mass = (id: number) => tonnes(getItem(id).mass)
        expect(mass(10210)).toBe(3200)
        expect(mass(10211)).toBe(4160)
        expect(mass(11212)).toBe(6176)
        expect(mass(11213)).toBe(7520)
        for (const id of shipRecipes()) {
            expect(getEntityLayout(id)!.baseHullmass).toBe(getItem(id).mass)
        }
    })

    test('WP-CP-12-amps support amp is 70 + 10 x rung, identity sockets run at 100, and no ship socket passes 100', () => {
        for (const id of shipRecipes()) {
            const rung = rungOf(id)
            for (const slot of getEntityLayout(id)!.slots) {
                if (slot.type === 'generator' || slot.type === 'engine') {
                    expect(slot.outputPct).toBe(70 + 10 * rung)
                } else if (slot.type === 'aux') {
                    expect(slot.outputPct).toBe(70 + 10 * rung)
                } else if (slot.type === 'any') {
                    expect(slot.outputPct).toBe(60)
                } else {
                    expect(slot.outputPct).toBe(100)
                }
                expect(slot.outputPct).toBeLessThanOrEqual(100)
            }
        }
    })

    test('WP-CP-12-structures the T2 station structures run their sockets at 200', () => {
        for (const id of [11203, 11204, 11209]) {
            for (const slot of getEntityLayout(id)!.slots) expect(slot.outputPct).toBe(200)
        }
    })
})

describe('WP-CP-16 and CP-20 to CP-31: catalog facts', () => {
    test('WP-CP-16-depth a T2 gatherer reaches stratum 12,989 at most, so T5 and above are out of reach', () => {
        expect(gathererDepthForTier(999, 1)).toBe(5495)
        expect(gathererDepthForTier(999, 2)).toBe(12989)
        expect(gathererDepthForTier(999, 2)).toBeGreaterThan(DEPTH_THRESHOLD_T4)
        expect(gathererDepthForTier(0, 2)).toBeLessThan(DEPTH_THRESHOLD_T3)
        expect(gathererDepthForTier(999, 2)).toBeLessThan(DEPTH_THRESHOLD_T5)
    })

    test('WP-CP-16-tolerance a T2 gatherer reaches T3 strata at tolerance 273 and T4 strata at 910, and a T1 gatherer never reaches T4', () => {
        expect(gathererDepthForTier(272, 2)).toBeLessThan(DEPTH_THRESHOLD_T3)
        expect(gathererDepthForTier(273, 2)).toBeGreaterThanOrEqual(DEPTH_THRESHOLD_T3)
        expect(gathererDepthForTier(909, 2)).toBeLessThan(DEPTH_THRESHOLD_T4)
        expect(gathererDepthForTier(910, 2)).toBeGreaterThanOrEqual(DEPTH_THRESHOLD_T4)
        expect(gathererDepthForTier(899, 1)).toBeLessThan(DEPTH_THRESHOLD_T3)
        expect(gathererDepthForTier(900, 1)).toBeGreaterThanOrEqual(DEPTH_THRESHOLD_T3)
        expect(gathererDepthForTier(999, 1)).toBeLessThan(DEPTH_THRESHOLD_T4)
    })

    test('WP-CP-16-yield gatherer yield gains 20 points of the T1 yield per tier', () => {
        for (let tier = 1; tier <= 10; tier++) {
            expect(computeGathererYield(500, tier)).toBe(700 + 140 * (tier - 1))
        }
    })

    test('WP-CP-16-recipes no recipe consumes a resource above T2', () => {
        for (const id of recipeIds) {
            for (const input of getRecipe(id)!.inputs) {
                const item = getItem(input.itemId)
                if (item.type === 'resource') expect(item.tier).toBeLessThanOrEqual(2)
            }
        }
    })

    test('WP-CP-20-t1 T1 has 10 single-input components and 10 craftable modules of 600 components each', () => {
        const components = outputsOf('component', 1)
        expect(components.length).toBe(10)
        for (const id of components) expect(getRecipe(id)!.inputs.length).toBe(1)
        const modules = outputsOf('module', 1)
        expect(modules.length).toBe(10)
        for (const id of modules) {
            const total = getRecipe(id)!.inputs.reduce((sum, i) => sum + i.quantity, 0)
            expect(total).toBe(600)
            expect(getRecipe(id)!.outputMass).toBe(9600)
        }
    })

    test('WP-CP-21-structures every craftable station structure is T2 and the T1 Mass Driver and Catcher have no recipe', () => {
        const structures = recipeIds.filter((id) => {
            const type = getPackedEntityType(id)
            return (
                getItem(id).type === 'entity' &&
                type !== null &&
                getEntityClass(type) === EntityClass.OrbitalStructure
            )
        })
        expect(structures.length).toBe(5)
        for (const id of structures) expect(getItem(id).tier).toBe(2)
        expect(getRecipe(10205)).toBeUndefined()
        expect(getRecipe(10206)).toBeUndefined()
    })

    test('WP-CP-23-warehouse the Warehouse recipe takes 9,600 t of components, more than a T1 ship holds at mean stats and less than a T2 ship', () => {
        const warehouse = 11202
        expect(tonnes(inputMass(warehouse))).toBe(9600)
        const meanStat = Math.round(mean(sortedStats()))
        const stats = {a: meanStat, b: meanStat, c: meanStat, d: meanStat, e: meanStat}
        const t1Ship = tonnes(computeBaseCapacity(10210, stats))
        const t2Ship = tonnes(computeBaseCapacity(11212, stats))
        expect(t1Ship).toBeGreaterThan(7000)
        expect(t1Ship).toBeLessThan(9600)
        expect(t2Ship).toBeGreaterThan(9600)
    })

    test('WP-CP-24-modules 11 T1 module items, 10 with a recipe, and ANY sockets run at 60 on the Roustabout and 80 on the legacy Ship', () => {
        const items = catalogItems().filter((i) => i.type === 'module' && i.tier === 1)
        expect(items.length).toBe(11)
        expect(outputsOf('module', 1).length).toBe(10)
        const launcher = items.find((i) => i.moduleType === 'launcher')!
        expect(getRecipe(launcher.id)).toBeUndefined()
        const anyPcts = new Map<number, number[]>()
        for (const id of [10210, 10201]) {
            anyPcts.set(
                id,
                getEntityLayout(id)!
                    .slots.filter((s) => s.type === 'any')
                    .map((s) => s.outputPct)
            )
        }
        expect(anyPcts.get(10210)).toEqual([60])
        expect(anyPcts.get(10201)).toEqual([80, 80, 80, 80, 80])
    })

    test('WP-CP-26-kinds there are 14 entity kinds in four classes', () => {
        expect(ALL_ENTITY_TYPES.length).toBe(14)
        expect(new Set(ALL_ENTITY_TYPES.map((k) => getEntityClass(k))).size).toBe(4)
    })

    test('WP-CP-31-workshop no recipe crafts a civic hull', () => {
        const civic = ['workshop', 'builddock', 'nexus', 'depot']
        const civicItems = catalogItems().filter(
            (i) =>
                i.type === 'entity' && civic.includes(getPackedEntityType(i.id)?.toString() ?? '')
        )
        expect(civicItems.length).toBe(4)
        for (const item of civicItems) expect(getRecipe(item.id)).toBeUndefined()
    })
})
