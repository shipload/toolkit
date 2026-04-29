import {
    categoryFromIndex,
    categoryLabelFromIndex,
    formatMass,
    formatTier,
    getItem,
    getRecipe,
    getStatDefinitions,
    type Item,
    typeLabel,
} from '@shipload/sdk'
import Table from 'cli-table3'
import type {Command} from 'commander'
import {parseUint32} from '../../lib/args'
import {server} from '../../lib/client'
import {formatOutput} from '../../lib/format'

interface WireRecipeInput {
    item_id: number
    category: number
    tier: number
    quantity: number
}

interface StatSlot {
    sources: {input_index: number; input_stat_index: number}[]
}

interface Recipe {
    output_item_id: number
    output_mass: number
    inputs: WireRecipeInput[]
    stat_slots: StatSlot[]
    blend_weights: number[]
    output_item?: {id: number; mass: number}
    input_items?: {id: number; mass: number}[]
}

function inputName(i: WireRecipeInput): string {
    const itemId = Number(i.item_id)
    const tier = Number(i.tier)
    const tierSuffix = Number.isFinite(tier) && tier > 0 ? ` ${formatTier(tier)}` : ''
    if (itemId > 0) {
        const item = getItem(itemId)
        return `${item.name} ${formatTier(item.tier)}`
    }
    return `${categoryLabelFromIndex(Number(i.category))}${tierSuffix}`
}

function inputItemId(i: WireRecipeInput): number | undefined {
    const itemId = Number(i.item_id)
    if (itemId > 0) return itemId
    const cat = categoryFromIndex(Number(i.category))
    if (!cat) return undefined
    return findResourceItem(cat, Number(i.tier))?.id
}

function inputUnitMass(i: WireRecipeInput): number | undefined {
    const itemId = Number(i.item_id)
    if (itemId > 0) {
        try {
            return getItem(itemId).mass
        } catch {
            return undefined
        }
    }
    const cat = categoryFromIndex(Number(i.category))
    if (!cat) return undefined
    try {
        // Resource items follow the {category}{tier} convention; look up via a
        // resources query through the catalog by matching tier+category.
        const tier = Number(i.tier)
        const lookup = findResourceItem(cat, tier)
        return lookup?.mass
    } catch {
        return undefined
    }
}

function findResourceItem(category: string, tier: number): Item | undefined {
    // Resource items have ids encoded as category-block * 100 + tier.
    // Avoid pulling getResources to keep this hot path tight; getItem is fine.
    const baseByCat: Record<string, number> = {
        ore: 100,
        crystal: 200,
        gas: 300,
        regolith: 400,
        biomass: 500,
    }
    const base = baseByCat[category]
    if (!base) return undefined
    try {
        return getItem(base + tier)
    } catch {
        return undefined
    }
}

function itemName(itemId: number): string {
    try {
        const item = getItem(itemId)
        return `${item.name} ${formatTier(item.tier)}`
    } catch {
        return `Item ${itemId}`
    }
}

function outputTypeLabel(itemId: number): string {
    try {
        const item = getItem(itemId)
        if (item.type === 'module' && item.moduleType) {
            const sub = item.moduleType.charAt(0).toUpperCase() + item.moduleType.slice(1)
            return `${sub} module`
        }
        return typeLabel(item.type)
    } catch {
        return ''
    }
}

// Resolve the stat label produced at slot.sources[k] for a recipe whose inputs
// match `inputs`. Recurses through itemId-typed inputs by following their own
// recipes until it bottoms out at a category (resource) input, where stat
// indices map to ResourceCategory stat definitions.
function resolveSourceStatLabel(
    inputs: WireRecipeInput[],
    inputIndex: number,
    statIndex: number
): string {
    const input = inputs[inputIndex]
    if (!input) return `stat ${statIndex}`
    const itemId = Number(input.item_id)
    if (itemId === 0) {
        const cat = categoryFromIndex(Number(input.category))
        if (!cat) return `stat ${statIndex}`
        const def = getStatDefinitions(cat)[statIndex]
        return def?.label ?? `stat ${statIndex}`
    }
    const sub = getRecipe(itemId)
    if (!sub) return `stat ${statIndex}`
    const slot = sub.statSlots[statIndex]
    if (!slot || slot.sources.length === 0) return `stat ${statIndex}`
    const subInputs: WireRecipeInput[] = sub.inputs.map((si) =>
        'category' in si
            ? {
                  item_id: 0,
                  category: categoryIndex(si.category),
                  tier: si.tier,
                  quantity: si.quantity,
              }
            : {item_id: si.itemId, category: 0, tier: 0, quantity: si.quantity}
    )
    const src = slot.sources[0]
    return resolveSourceStatLabel(subInputs, src.inputIndex, src.statIndex)
}

const CAT_INDEX: Record<string, number> = {
    ore: 0,
    gas: 1,
    regolith: 2,
    biomass: 3,
    crystal: 4,
}

function categoryIndex(category: string): number {
    return CAT_INDEX[category] ?? 0
}

function borderlessTable(head: string[], aligns: ('left' | 'right')[]): Table.Table {
    return new Table({
        head,
        colAligns: aligns,
        chars: {
            top: '',
            'top-mid': '',
            'top-left': '',
            'top-right': '',
            bottom: '',
            'bottom-mid': '',
            'bottom-left': '',
            'bottom-right': '',
            left: '  ',
            'left-mid': '',
            mid: '',
            'mid-mid': '',
            right: '',
            'right-mid': '',
            middle: '  ',
        },
        style: {head: [], border: [], 'padding-left': 0, 'padding-right': 0},
    })
}

function trimEnds(s: string): string {
    return s
        .split('\n')
        .map((l) => l.trimEnd())
        .join('\n')
}

export function renderList(recipes: Recipe[]): string {
    const lines = [`Recipes (${recipes.length}):`]
    for (const r of recipes) {
        const inputs = r.inputs.map((i) => `${i.quantity}× ${inputName(i)}`).join(' + ')
        const output = itemName(r.output_item_id)
        lines.push(`  [${r.output_item_id}] ${output} ← ${inputs}`)
    }
    return lines.join('\n')
}

export function renderDetail(r: Recipe): string {
    const sections: string[] = []

    const outId = Number(r.output_item_id)
    const outType = outputTypeLabel(outId)
    const headerBits = [`Output: ${itemName(outId)}`]
    if (outType) headerBits.push(outType)
    headerBits.push(`mass ${formatMass(Number(r.output_mass))}`)
    sections.push(headerBits.join(' · '))

    const inputsTable = borderlessTable(
        ['Idx', 'Qty', 'Input', 'ID', 'Each', 'Total'],
        ['right', 'right', 'left', 'right', 'right', 'right']
    )
    let totalInputMass = 0
    for (let i = 0; i < r.inputs.length; i++) {
        const inp = r.inputs[i]
        const qty = Number(inp.quantity)
        const each = inputUnitMass(inp)
        const totalForRow = each !== undefined ? each * qty : undefined
        if (totalForRow !== undefined) totalInputMass += totalForRow
        const id = inputItemId(inp)
        inputsTable.push([
            String(i),
            String(qty),
            inputName(inp),
            id !== undefined ? String(id) : '—',
            each !== undefined ? formatMass(each) : '—',
            totalForRow !== undefined ? formatMass(totalForRow) : '—',
        ])
    }
    const inputsHeader =
        totalInputMass > 0
            ? `Inputs (${r.inputs.length}, ${formatMass(totalInputMass)} total):`
            : `Inputs (${r.inputs.length}):`
    sections.push([inputsHeader, trimEnds(inputsTable.toString())].join('\n'))

    const blendWeights = Array.isArray(r.blend_weights) ? r.blend_weights : []
    const blended = blendWeights.length > 0
    const hasIgnoredSources = !blended && r.stat_slots.some((s) => s.sources.length > 1)

    const slotHead = blended
        ? ['Idx', 'Output stat', 'Source input', 'Source stat', 'Weight']
        : ['Idx', 'Output stat', 'Source input', 'Source stat']
    const slotAligns: ('left' | 'right')[] = blended
        ? ['right', 'left', 'left', 'left', 'right']
        : ['right', 'left', 'left', 'left']
    const slotsTable = borderlessTable(slotHead, slotAligns)
    for (let i = 0; i < r.stat_slots.length; i++) {
        const slot = r.stat_slots[i]
        if (slot.sources.length === 0) {
            const row = [String(i), '—', '—', '—']
            if (blended) row.push('—')
            slotsTable.push(row)
            continue
        }
        const outputLabel = resolveSourceStatLabel(
            r.inputs,
            slot.sources[0].input_index,
            slot.sources[0].input_stat_index
        )
        const sources = blended ? slot.sources : slot.sources.slice(0, 1)
        for (let s = 0; s < sources.length; s++) {
            const src = sources[s]
            const inp = r.inputs[src.input_index]
            const sourceInput = inp
                ? `[${src.input_index}] ${inputName(inp)}`
                : `[${src.input_index}]`
            const sourceStat = resolveSourceStatLabel(
                r.inputs,
                src.input_index,
                src.input_stat_index
            )
            const row: string[] = [
                s === 0 ? String(i) : '',
                s === 0 ? outputLabel : '',
                sourceInput,
                sourceStat,
            ]
            if (blended) {
                const weight = blendWeights[src.input_index]
                row.push(weight !== undefined ? String(weight) : '—')
            }
            slotsTable.push(row)
        }
    }
    const slotsBlock = [`Stat slots (${r.stat_slots.length}):`, trimEnds(slotsTable.toString())]
    if (hasIgnoredSources) {
        slotsBlock.push('  (recipe has no blend_weights — secondary sources ignored)')
    }
    sections.push(slotsBlock.join('\n'))

    return sections.join('\n\n')
}

async function fetchAllRecipes(): Promise<Recipe[]> {
    const PAGE = 50
    const all: Recipe[] = []
    let lowerBound = 0
    while (true) {
        const res = (await server.readonly('getrecipes', {
            lower_bound: lowerBound,
            limit: PAGE,
        })) as unknown as {recipes: Recipe[]}
        const page = res.recipes ?? []
        all.push(...page)
        if (page.length < PAGE) break
        lowerBound = page[page.length - 1].output_item_id + 1
    }
    return all
}

export function register(program: Command): void {
    program
        .command('recipe')
        .description('List all recipes, or show one by output item id')
        .addHelpText(
            'before',
            'The bracketed number [ID] in the list is the recipe id — pass it as <recipe-id> in the craft command.\n'
        )
        .argument('[id]', 'output item id (omit to list all)', parseUint32)
        .option('--tier <n>', 'filter list by output tier', parseUint32)
        .option('--json', 'emit JSON instead of formatted text')
        .action(async (id: number | undefined, opts: {tier?: number; json?: boolean}) => {
            if (id === undefined) {
                let recipes = await fetchAllRecipes()
                if (opts.tier !== undefined) {
                    recipes = recipes.filter((r) => {
                        try {
                            return getItem(r.output_item_id).tier === opts.tier
                        } catch {
                            return false
                        }
                    })
                }
                console.log(formatOutput(recipes, {json: Boolean(opts.json)}, renderList))
                return
            }
            const res = (await server.readonly('getrecipe', {
                output_item_id: id,
            })) as unknown as {recipes: Recipe[]}
            const recipe = res.recipes?.[0]
            if (!recipe) {
                console.error(`No recipe with output item id ${id}`)
                process.exitCode = 1
                return
            }
            console.log(formatOutput(recipe, {json: Boolean(opts.json)}, renderDetail))
        })
}
