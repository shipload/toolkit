import type {ResolvedItem, ResolvedModuleSlot} from './resolve-item'

export interface TextSpan {
    text: string
    highlight?: boolean
}

export interface CapabilityInput {
    capability: string
    attributes: {label: string; value: number}[]
}

export interface ModuleDescription {
    id: string
    template: string
    params: Readonly<Record<string, number | string>>
    highlightKeys: readonly string[]
}

export interface RenderDescriptionOptions {
    translate?: (id: string, fallback: string) => string
    formatNumber?: (n: number) => string
    formatParam?: (paramName: string, value: number, descId: string) => string | undefined
}

interface TemplateSpec {
    id: string
    template: string
    params: readonly [string, string][]
    highlightKeys: readonly string[]
    derive?: Record<string, (get: (label: string) => number) => number>
}

const TEMPLATES: Record<string, TemplateSpec> = {
    engine: {
        id: 'module.engine.description',
        template:
            'generates {thrust} thrust for travel while draining {drain} energy per distance travelled',
        params: [
            ['thrust', 'Thrust'],
            ['drain', 'Drain'],
        ],
        highlightKeys: ['thrust', 'drain'],
    },
    generator: {
        id: 'module.generator.description',
        template:
            'holds {capacity} maximum energy and restores {recharge} per second while recharging',
        params: [
            ['capacity', 'Capacity'],
            ['recharge', 'Recharge'],
        ],
        highlightKeys: ['capacity', 'recharge'],
    },
    gatherer: {
        id: 'module.gatherer.description',
        template:
            'mines resources at {yield} yield to a max depth of {depth} while draining {drain} energy per minute',
        params: [
            ['yield', 'Yield'],
            ['depth', 'Depth'],
        ],
        highlightKeys: ['yield', 'depth', 'drain'],
        derive: {
            drain: (get) => Math.round((get('Drain') / 10000) * 60 * 10) / 10,
        },
    },
    loading: {
        id: 'module.loading.description',
        template: 'generates {thrust} thrust with a weight of {mass} per unit',
        params: [
            ['thrust', 'Thrust'],
            ['mass', 'Mass'],
        ],
        highlightKeys: ['thrust', 'mass'],
    },
    crafting: {
        id: 'module.crafting.description',
        template: 'manufactures items at {speed} speed while draining {drain} energy per minute',
        params: [['speed', 'Speed']],
        highlightKeys: ['speed', 'drain'],
        derive: {
            drain: (get) => Math.round(((get('Drain') * get('Speed')) / 150000) * 60 * 10) / 10,
        },
    },
    storage: {
        id: 'module.storage.description',
        template: 'adds {capacity} cargo capacity',
        params: [['capacity', 'Cargo Capacity']],
        highlightKeys: ['capacity'],
    },
    energy: {
        id: 'module.energy-capacity.description',
        template: 'adds {capacity} energy capacity',
        params: [['capacity', 'Energy Capacity']],
        highlightKeys: ['capacity'],
    },
    hauling: {
        id: 'module.hauling.description',
        template:
            'locks onto up to {capacity} targets at {efficiency} efficiency while draining {drain} energy per distance travelled per target',
        params: [
            ['capacity', 'Capacity'],
            ['efficiency', 'Efficiency'],
            ['drain', 'Drain'],
        ],
        highlightKeys: ['capacity', 'efficiency', 'drain'],
    },
}

export function describeModule(input: CapabilityInput): ModuleDescription | null {
    if (!input.attributes || input.attributes.length === 0) return null
    const key = input.capability.toLowerCase()
    const spec = TEMPLATES[key]
    if (!spec) return null
    const params: Record<string, number | string> = {}
    for (const [paramName, attrLabel] of spec.params) {
        const attr = input.attributes.find((a) => a.label === attrLabel)
        if (attr) params[paramName] = attr.value
    }
    if (spec.derive) {
        const get = (label: string) => input.attributes.find((a) => a.label === label)?.value ?? 0
        for (const [paramName, fn] of Object.entries(spec.derive)) {
            params[paramName] = fn(get)
        }
    }
    return {
        id: spec.id,
        template: spec.template,
        params,
        highlightKeys: spec.highlightKeys,
    }
}

export function describeModuleForItem(resolved: ResolvedItem): ModuleDescription | null {
    if (resolved.itemType !== 'module') return null
    const group = resolved.attributes?.[0]
    if (!group) return null
    return describeModule({capability: group.capability, attributes: group.attributes})
}

export function describeModuleForSlot(slot: ResolvedModuleSlot): ModuleDescription | null {
    if (!slot.installed || !slot.attributes) return null
    const capability = slot.capability ?? slot.name
    if (!capability) return null
    return describeModule({capability, attributes: slot.attributes})
}

export function renderDescription(
    desc: ModuleDescription,
    options?: RenderDescriptionOptions
): TextSpan[] {
    const translate = options?.translate ?? ((_id: string, fallback: string) => fallback)
    const formatNumber = options?.formatNumber ?? ((n: number) => n.toLocaleString('en-US'))
    const tpl = translate(desc.id, desc.template)

    const spans: TextSpan[] = []
    const regex = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g
    let lastIndex = 0
    while (true) {
        const m = regex.exec(tpl)
        if (m === null) break
        if (m.index > lastIndex) {
            spans.push({text: tpl.slice(lastIndex, m.index)})
        }
        const paramName = m[1] ?? ''
        const raw = desc.params[paramName]
        if (raw === undefined) {
            spans.push({text: `{${paramName}}`})
        } else {
            const formatted =
                typeof raw === 'number'
                    ? (options?.formatParam?.(paramName, raw, desc.id) ?? formatNumber(raw))
                    : raw
            const highlight = (desc.highlightKeys as readonly string[]).includes(paramName)
            spans.push(highlight ? {text: formatted, highlight: true} : {text: formatted})
        }
        lastIndex = m.index + m[0].length
    }
    if (lastIndex < tpl.length) {
        spans.push({text: tpl.slice(lastIndex)})
    }
    return spans
}
