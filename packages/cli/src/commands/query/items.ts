import {
    categoryLabel,
    formatMass,
    formatTier,
    getComponentProcess,
    getComponents,
    getEntityItems,
    getItems,
    getModules,
    getResources,
    type ComponentProcess,
    type Item,
    type ItemType,
} from '@shipload/sdk'
import Table from 'cli-table3'
import type {Command} from 'commander'
import {parseUint32} from '../../lib/args'
import {formatOutput} from '../../lib/format'

const VALID_TYPES: readonly ItemType[] = ['resource', 'component', 'module', 'entity']

const TYPE_COLUMN: Record<ItemType, string> = {
    resource: 'Resource',
    component: 'Component',
    module: 'Module',
    entity: 'Entity',
}

const VALID_PROCESSES: readonly ComponentProcess[] = ['refined', 'machined']

const PROCESS_TYPE_COLUMN: Record<ComponentProcess, string> = {
    refined: 'Refined component',
    machined: 'Machined component',
}

function moduleSubtypeLabel(moduleType: string): string {
    return moduleType.charAt(0).toUpperCase() + moduleType.slice(1)
}

function typeColumn(item: Item): string {
    if (item.type === 'module' && item.moduleType) {
        return `${moduleSubtypeLabel(item.moduleType)} module`
    }
    const process = item.type === 'component' ? getComponentProcess(item.id) : undefined
    if (process) return PROCESS_TYPE_COLUMN[process]
    return TYPE_COLUMN[item.type]
}

function categoryColumn(item: Item): string {
    if (item.type === 'resource' && item.category) return categoryLabel(item.category)
    return ''
}

export function renderPretty(items: Item[]): string {
    const table = new Table({
        head: ['Item', 'ID', 'Type', 'Category', 'Tier', 'Mass'],
        colAligns: ['left', 'right', 'left', 'left', 'left', 'right'],
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

    for (const item of items) {
        table.push([
            item.name,
            String(item.id),
            typeColumn(item),
            categoryColumn(item),
            formatTier(item.tier),
            formatMass(item.mass),
        ])
    }

    const body = table
        .toString()
        .split('\n')
        .map((line) => line.trimEnd())
        .join('\n')
    return [`Items (${items.length}):`, body].join('\n')
}

function filterByType(type?: string, tier?: number): Item[] {
    if (type && !VALID_TYPES.includes(type as ItemType)) {
        throw new Error(`Invalid --type: ${type}. Must be one of: ${VALID_TYPES.join(', ')}`)
    }
    let items: Item[]
    switch (type as ItemType | undefined) {
        case 'resource':
            items = getResources(tier !== undefined ? {tier} : undefined)
            break
        case 'component':
            items = getComponents(tier !== undefined ? {tier} : undefined)
            break
        case 'module':
            items = getModules(tier !== undefined ? {tier} : undefined)
            break
        case 'entity':
            items = getEntityItems(tier !== undefined ? {tier} : undefined)
            break
        default:
            items = getItems()
            if (tier !== undefined) items = items.filter((i) => i.tier === tier)
    }
    return items
}

export function selectItems(options: {type?: string; tier?: number; process?: string}): Item[] {
    if (options.process === undefined) return filterByType(options.type, options.tier)
    if (!VALID_PROCESSES.includes(options.process as ComponentProcess)) {
        throw new Error(
            `Invalid --process: ${options.process}. Must be one of: ${VALID_PROCESSES.join(', ')}`
        )
    }
    if (options.type !== undefined && options.type !== 'component') {
        throw new Error(
            'Invalid --process: only components have a process. Drop --type or use --type component.'
        )
    }
    return filterByType('component', options.tier).filter(
        (item) => getComponentProcess(item.id) === options.process
    )
}

export function register(program: Command): void {
    program
        .command('items')
        .description('List available items (resources, components, modules, entities)')
        .option('--type <type>', 'filter by item type (resource, component, module, entity)')
        .option('--tier <n>', 'filter by tier number', parseUint32)
        .option('--process <process>', 'filter components by kind (refined, machined)')
        .option('--json', 'emit JSON instead of formatted text')
        .action(
            async (options: {type?: string; tier?: number; process?: string; json?: boolean}) => {
                const data = selectItems(options)
                console.log(formatOutput(data, {json: Boolean(options.json)}, renderPretty))
            }
        )
}
